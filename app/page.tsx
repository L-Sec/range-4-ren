"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, LeafletMouseEvent, Map as LeafletMap, TileLayer } from "leaflet";
import {
  CATEGORY_LABELS,
  DRONE_PRESETS,
  getPublishedRadioRangeKm,
  getPresetsForCategory,
  type DroneCategory,
} from "./drone-presets";

type LeafletModule = typeof import("leaflet");

type Units = "metric" | "imperial";
type Inputs = {
  weightKg: number;
  capacityMah: number;
  voltage: number;
  cells: number;
  useCells: boolean;
  usableFraction: number;
  specificPower: number;
  powerOverride: number;
  usePowerOverride: boolean;
  airspeedMs: number;
  windMs: number;
  windFromDeg: number;
  constantWind: boolean;
  conservativeFraction: number;
};

const DEFAULT_LOCATION: [number, number] = [38.8977, -77.0365];
const EARTH_RADIUS_M = 6371008.8;

const initialInputs: Inputs = {
  weightKg: 0.895,
  capacityMah: 5000,
  voltage: 14.8,
  cells: 4,
  useCells: true,
  usableFraction: 0.82,
  specificPower: 105,
  powerOverride: 95,
  usePowerOverride: false,
  airspeedMs: 13,
  windMs: 5,
  windFromDeg: 270,
  constantWind: true,
  conservativeFraction: 0.65,
};

function clampFinite(value: number, min = 0, max = Number.MAX_VALUE) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function destinationPoint(lat: number, lng: number, eastM: number, northM: number): [number, number] {
  const distance = Math.hypot(eastM, northM);
  if (distance === 0) return [lat, lng];
  const bearing = Math.atan2(eastM, northM);
  const angular = distance / EARTH_RADIUS_M;
  const phi1 = lat * Math.PI / 180;
  const lambda1 = lng * Math.PI / 180;
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(angular) +
    Math.cos(phi1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lambda2 = lambda1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angular) * Math.cos(phi1),
    Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2),
  );
  return [phi2 * 180 / Math.PI, ((lambda2 * 180 / Math.PI + 540) % 360) - 180];
}

function circlePolygon(center: [number, number], radiusM: number, steps = 128) {
  const coordinates = Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    const p = destinationPoint(center[0], center[1], Math.sin(angle) * radiusM, Math.cos(angle) * radiusM);
    return [p[1], p[0]];
  });
  return coordinates;
}

function envelopeBounds(L: LeafletModule, center: [number, number], radiusM: number) {
  // Leaflet Circle#getBounds requires the circle to already belong to a map.
  // Cardinal geodesic points provide stable bounds even during reactive redraws.
  return L.latLngBounds([
    destinationPoint(center[0], center[1], radiusM, 0),
    destinationPoint(center[0], center[1], -radiusM, 0),
    destinationPoint(center[0], center[1], 0, radiusM),
    destinationPoint(center[0], center[1], 0, -radiusM),
  ]);
}

type LocalPoint = [number, number];

function localCircle(centerEastM: number, centerNorthM: number, radiusM: number, steps = 180): LocalPoint[] {
  if (radiusM <= 0) return [];
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return [
      centerEastM + Math.cos(angle) * radiusM,
      centerNorthM + Math.sin(angle) * radiusM,
    ];
  });
}

function cross(a: LocalPoint, b: LocalPoint) {
  return a[0] * b[1] - a[1] * b[0];
}

function subtract(a: LocalPoint, b: LocalPoint): LocalPoint {
  return [a[0] - b[0], a[1] - b[1]];
}

// Convex polygon clipping gives a stable approximation of the true circle lens.
function intersectConvexPolygons(subject: LocalPoint[], clip: LocalPoint[]) {
  let output = subject;
  for (let index = 0; index < clip.length && output.length; index += 1) {
    const edgeStart = clip[index];
    const edgeEnd = clip[(index + 1) % clip.length];
    const edge = subtract(edgeEnd, edgeStart);
    const input = output;
    output = [];
    const inside = (point: LocalPoint) => cross(edge, subtract(point, edgeStart)) >= -0.001;
    const intersection = (start: LocalPoint, end: LocalPoint): LocalPoint => {
      const segment = subtract(end, start);
      const denominator = cross(edge, segment);
      if (Math.abs(denominator) < 1e-9) return end;
      const t = cross(edge, subtract(edgeStart, start)) / denominator;
      return [start[0] + segment[0] * t, start[1] + segment[1] * t];
    };
    let previous = input[input.length - 1];
    for (const current of input) {
      const currentInside = inside(current);
      const previousInside = inside(previous);
      if (currentInside) {
        if (!previousInside) output.push(intersection(previous, current));
        output.push(current);
      } else if (previousInside) {
        output.push(intersection(previous, current));
      }
      previous = current;
    }
  }
  return output;
}

function polygonAreaM2(points: LocalPoint[]) {
  if (points.length < 3) return 0;
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0)) / 2;
}

function localPolygonCoordinates(origin: [number, number], points: LocalPoint[]) {
  if (points.length < 3) return [];
  const coordinates = points.map(([eastM, northM]) => {
    const point = destinationPoint(origin[0], origin[1], eastM, northM);
    return [point[1], point[0]];
  });
  coordinates.push([...coordinates[0]]);
  return coordinates;
}

function Field({
  label,
  value,
  onChange,
  unit,
  step = "any",
  min = 0,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: string;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <label className={`field ${disabled ? "disabled" : ""}`}>
      <span>{label}</span>
      <span className="input-shell">
        <input
          type="number"
          value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          min={min}
          step={step}
          disabled={disabled}
        />
        <b>{unit}</b>
      </span>
    </label>
  );
}

export default function Home() {
  const [units, setUnits] = useState<Units>("metric");
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [location, setLocation] = useState<[number, number]>(DEFAULT_LOCATION);
  const [latText, setLatText] = useState(String(DEFAULT_LOCATION[0]));
  const [lngText, setLngText] = useState(String(DEFAULT_LOCATION[1]));
  const [search, setSearch] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [showStillAir, setShowStillAir] = useState(true);
  const [showWindCorrected, setShowWindCorrected] = useState(true);
  const [showConservative, setShowConservative] = useState(true);
  const [showWindArrow, setShowWindArrow] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [presetCategory, setPresetCategory] = useState<DroneCategory>("micro");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [radioRangeM, setRadioRangeM] = useState(10000);
  const [radioFactor, setRadioFactor] = useState(0.5);
  const [radioConstraint, setRadioConstraint] = useState(true);
  const [showRadioRange, setShowRadioRange] = useState(true);
  const [showSuitableOverlap, setShowSuitableOverlap] = useState(true);
  const [showBasemap, setShowBasemap] = useState(false);
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerGroupRef = useRef<LayerGroup | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const firstFitRef = useRef(true);

  useEffect(() => {
    const saved = localStorage.getItem("drone-range-units");
    // Hydrate the device-local preference after the server-rendered shell mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "metric" || saved === "imperial") setUnits(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("drone-range-units", units);
  }, [units]);

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((current) => ({ ...current, [key]: value }));

  const categoryPresets = useMemo(
    () => getPresetsForCategory(presetCategory),
    [presetCategory],
  );
  const selectedPreset = useMemo(
    () => DRONE_PRESETS.find((preset) => preset.id === selectedPresetId) ?? null,
    [selectedPresetId],
  );

  const loadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = DRONE_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) return;
    setInputs((current) => ({
      ...current,
      weightKg: preset.weightKg,
      capacityMah: preset.capacityMah,
      voltage: preset.voltage,
      cells: Math.max(1, Math.round(preset.voltage / 3.7)),
      useCells: false,
      specificPower: preset.specificPower,
      airspeedMs: preset.airspeedMs,
      usePowerOverride: false,
    }));
    setRadioRangeM(getPublishedRadioRangeKm(preset.id) * 1000);
  };

  const calc = useMemo(() => {
    const weightKg = clampFinite(inputs.weightKg);
    const nominalVoltage = inputs.useCells ? clampFinite(inputs.cells) * 3.7 : clampFinite(inputs.voltage);
    const batteryWh = (clampFinite(inputs.capacityMah) / 1000) * nominalVoltage;
    const usableWh = batteryWh * clampFinite(inputs.usableFraction, 0, 1);
    const estimatedPowerW = inputs.usePowerOverride
      ? clampFinite(inputs.powerOverride)
      : weightKg * clampFinite(inputs.specificPower);
    const timeHours = estimatedPowerW > 0 ? usableWh / estimatedPowerW : 0;
    const timeSeconds = timeHours * 3600;
    const radiusM = clampFinite(inputs.airspeedMs) * timeSeconds;

    // Meteorological direction is where wind comes FROM. The drift vector points
    // 180° opposite. Inverting that drift for an origin makes the launch-area
    // center move upwind, directly toward windFromDeg.
    const fromRad = clampFinite(inputs.windFromDeg, 0, 360) * Math.PI / 180;
    const offsetM = inputs.constantWind ? clampFinite(inputs.windMs) * timeSeconds : 0;
    const centerEastM = Math.sin(fromRad) * offsetM;
    const centerNorthM = Math.cos(fromRad) * offsetM;
    const launchCenter = destinationPoint(location[0], location[1], centerEastM, centerNorthM);
    return {
      nominalVoltage,
      batteryWh,
      usableWh,
      estimatedPowerW,
      timeHours,
      timeSeconds,
      radiusM,
      offsetM,
      centerEastM,
      centerNorthM,
      launchCenter,
      conservativeM: radiusM * clampFinite(inputs.conservativeFraction, 0, 1),
    };
  }, [inputs, location]);

  const display = useMemo(() => {
    const distance = (meters: number) => units === "metric" ? meters / 1000 : meters / 1609.344;
    const distanceUnit = units === "metric" ? "km" : "mi";
    const speed = (ms: number) => units === "metric" ? ms * 3.6 : ms * 2.236936;
    const speedUnit = units === "metric" ? "km/h" : "mph";
    return { distance, distanceUnit, speed, speedUnit };
  }, [units]);

  const radioAnalysis = useMemo(() => {
    const effectiveRangeM = clampFinite(radioRangeM) * clampFinite(radioFactor, 0.05, 1);
    const flightPolygon = localCircle(calc.centerEastM, calc.centerNorthM, calc.radiusM);
    const radioPolygon = localCircle(0, 0, effectiveRangeM);
    const overlapPolygon = radioConstraint
      ? intersectConvexPolygons(flightPolygon, radioPolygon)
      : flightPolygon;
    const areaM2 = polygonAreaM2(overlapPolygon);
    const centerDistance = calc.offsetM;
    let status = "Battery envelope only";
    if (radioConstraint) {
      if (!overlapPolygon.length) status = "No overlap";
      else if (centerDistance + calc.radiusM <= effectiveRangeM) status = "Battery-limited";
      else if (centerDistance + effectiveRangeM <= calc.radiusM) status = "Radio-limited";
      else status = "Partial overlap";
    }
    return { effectiveRangeM, overlapPolygon, areaM2, status };
  }, [calc, radioConstraint, radioFactor, radioRangeM]);

  const summary = useMemo(() => [
    "RANGE 4-REN — INVESTIGATIVE RANGE ESTIMATE",
    `Recovery: ${location[0].toFixed(6)}, ${location[1].toFixed(6)}`,
    `Possible launch center: ${calc.launchCenter[0].toFixed(6)}, ${calc.launchCenter[1].toFixed(6)}`,
    `Flight time: ${(calc.timeHours * 60).toFixed(1)} min`,
    `Still-air / wind-corrected radius: ${display.distance(calc.radiusM).toFixed(2)} ${display.distanceUnit}`,
    `Center offset: ${display.distance(calc.offsetM).toFixed(2)} ${display.distanceUnit} toward ${inputs.windFromDeg.toFixed(0)}° true (upwind)`,
    `Effective radio range: ${display.distance(radioAnalysis.effectiveRangeM).toFixed(2)} ${display.distanceUnit} (${Math.round(radioFactor * 100)}% of entered maximum)`,
    `Suitable launch overlap: ${radioAnalysis.status}; ${(radioAnalysis.areaM2 / 1e6).toFixed(2)} km²`,
    `Battery: ${calc.batteryWh.toFixed(1)} Wh nominal; ${calc.usableWh.toFixed(1)} Wh usable`,
    `Average power: ${calc.estimatedPowerW.toFixed(1)} W`,
    `Airspeed: ${display.speed(inputs.airspeedMs).toFixed(1)} ${display.speedUnit}`,
    `Wind: ${display.speed(inputs.windMs).toFixed(1)} ${display.speedUnit} from ${inputs.windFromDeg.toFixed(0)}° true`,
    "Model: constant airspeed, fixed battery-limited time, constant wind when enabled.",
    "Caution: theoretical envelope, not a probability boundary or proof of origin.",
  ].join("\n"), [calc, display, inputs, location, radioAnalysis, radioFactor]);

  useEffect(() => {
    let active = true;
    import("leaflet").then((module) => {
      if (!active) return;
      leafletRef.current = module;
      setMapReady(true);
    }).catch(() => {
      if (active) setSearchStatus("The local map engine could not start. Restart the development server.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapNode.current || mapRef.current) return;
    const L = leafletRef.current;
    if (!L) return;
    const map = L.map(mapNode.current, { zoomControl: true }).setView(location, 11);
    L.control.scale({ imperial: units === "imperial", metric: units === "metric" }).addTo(map);
    map.on("click", (event: LeafletMouseEvent) => {
      const next: [number, number] = [event.latlng.lat, event.latlng.lng];
      setLocation(next);
      setLatText(next[0].toFixed(6));
      setLngText(next[1].toFixed(6));
    });
    mapRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 50);
  }, [mapReady, location, units]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    if (showBasemap && !tileLayerRef.current) {
      tileLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
    } else if (!showBasemap && tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }
  }, [mapReady, showBasemap]);

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    const L = leafletRef.current;
    if (!L) return;
    const group = layerGroupRef.current;
    group.clearLayers();
    const recoveryIcon = L.divIcon({ className: "map-marker recovery-marker", html: "<span>◆</span>", iconSize: [26, 26], iconAnchor: [13, 13] });
    const originIcon = L.divIcon({ className: "map-marker origin-marker", html: "<span>◎</span>", iconSize: [28, 28], iconAnchor: [14, 14] });
    L.marker(location, { icon: recoveryIcon }).bindTooltip("Drone Found", { permanent: false }).addTo(group);
    if (showWindCorrected) {
      L.marker(calc.launchCenter, { icon: originIcon }).bindTooltip("Wind-corrected launch-area center").addTo(group);
    }
    if (showStillAir) {
      L.circle(location, { radius: calc.radiusM, color: "#8392a5", weight: 2, dashArray: "7 8", fillColor: "#8392a5", fillOpacity: 0.05 })
        .bindTooltip("Still-air Theoretical Max").addTo(group);
    }
    if (showWindCorrected) {
      L.circle(calc.launchCenter, { radius: calc.radiusM, color: "#f2b84b", weight: 3, fillColor: "#f2b84b", fillOpacity: 0.12, className: "layer-wind-corrected" })
        .bindTooltip("Possible Launch Area (wind-corrected)").addTo(group);
    }
    if (showConservative) {
      L.circle(calc.launchCenter, { radius: calc.conservativeM, color: "#2dd4bf", weight: 2, fillColor: "#2dd4bf", fillOpacity: 0.09 })
        .bindTooltip(`Conservative ${Math.round(inputs.conservativeFraction * 100)}% radius`).addTo(group);
    }
    if (showWindArrow && calc.offsetM > 0) {
      L.polyline([location, calc.launchCenter], { color: "#ff6b5f", weight: 3, opacity: 0.9 })
        .bindTooltip(`Upwind offset ${display.distance(calc.offsetM).toFixed(2)} ${display.distanceUnit}`).addTo(group);
    }
    if (showRadioRange && radioAnalysis.effectiveRangeM > 0) {
      L.circle(location, { radius: radioAnalysis.effectiveRangeM, color: "#4b8fc9", weight: 2, dashArray: "4 6", fillColor: "#4b8fc9", fillOpacity: 0.04 })
        .bindTooltip("Effective Radio-Link Range").addTo(group);
    }
    if (showSuitableOverlap && radioAnalysis.overlapPolygon.length >= 3) {
      const overlapLatLngs = radioAnalysis.overlapPolygon.map(([eastM, northM]) =>
        destinationPoint(location[0], location[1], eastM, northM),
      );
      L.polygon(overlapLatLngs, { color: "#15a68f", weight: 3, fillColor: "#2dd4bf", fillOpacity: 0.24, className: "layer-suitable-overlap" })
        .bindTooltip("Suitable Launch Area — flight + radio overlap").addTo(group);
    }
    if (firstFitRef.current && calc.radiusM > 0) {
      const bounds = L.latLngBounds([location, calc.launchCenter]);
      bounds.extend(envelopeBounds(L, calc.launchCenter, calc.radiusM));
      if (showStillAir) bounds.extend(envelopeBounds(L, location, calc.radiusM));
      if (showRadioRange) bounds.extend(envelopeBounds(L, location, radioAnalysis.effectiveRangeM));
      mapRef.current.fitBounds(bounds, { padding: [34, 34], maxZoom: 13 });
      firstFitRef.current = false;
    }
  }, [calc, display, inputs.conservativeFraction, location, mapReady, radioAnalysis, showConservative, showRadioRange, showStillAir, showSuitableOverlap, showWindArrow, showWindCorrected]);

  const setCoordinates = useCallback(() => {
    const lat = Number(latText);
    const lng = Number(lngText);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setSearchStatus("Enter valid latitude and longitude.");
      return;
    }
    setLocation([lat, lng]);
    mapRef.current?.setView([lat, lng], Math.max(mapRef.current.getZoom(), 11));
    setSearchStatus("Recovery location updated.");
  }, [latText, lngText]);

  const searchPlace = async () => {
    if (!search.trim()) return;
    setSearchStatus("Searching…");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(search)}`);
      const results = await response.json();
      if (!results.length) {
        setSearchStatus("No matching place found.");
        return;
      }
      const next: [number, number] = [Number(results[0].lat), Number(results[0].lon)];
      setLocation(next);
      setLatText(next[0].toFixed(6));
      setLngText(next[1].toFixed(6));
      mapRef.current?.setView(next, 12);
      setSearchStatus(results[0].display_name);
    } catch {
      setSearchStatus("Search unavailable. Enter coordinates or click the map.");
    }
  };

  const fitGeometry = () => {
    const L = leafletRef.current;
    if (!mapRef.current || !L) return;
    const bounds = L.latLngBounds([location, calc.launchCenter]);
    if (showWindCorrected) bounds.extend(envelopeBounds(L, calc.launchCenter, calc.radiusM));
    if (showStillAir) bounds.extend(envelopeBounds(L, location, calc.radiusM));
    if (showRadioRange) bounds.extend(envelopeBounds(L, location, radioAnalysis.effectiveRangeM));
    mapRef.current.fitBounds(bounds, { padding: [34, 34] });
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const exportGeoJSON = () => {
    const geojson = {
      type: "FeatureCollection",
      name: "Range 4-Ren — Investigative Range Estimate",
      features: [
        { type: "Feature", properties: { role: "recovery_location", label: "Drone Found" }, geometry: { type: "Point", coordinates: [location[1], location[0]] } },
        { type: "Feature", properties: { role: "launch_area_center", offset_m: calc.offsetM, upwind_bearing_deg_true: inputs.windFromDeg }, geometry: { type: "Point", coordinates: [calc.launchCenter[1], calc.launchCenter[0]] } },
        { type: "Feature", properties: { role: "possible_launch_area_wind_corrected", radius_m: calc.radiusM, model: "constant-air-vector-plus-constant-wind" }, geometry: { type: "Polygon", coordinates: [circlePolygon(calc.launchCenter, calc.radiusM)] } },
        { type: "Feature", properties: { role: "effective_radio_link_range", radius_m: radioAnalysis.effectiveRangeM, entered_max_m: radioRangeM, environment_factor: radioFactor }, geometry: { type: "Polygon", coordinates: [circlePolygon(location, radioAnalysis.effectiveRangeM)] } },
        ...(radioAnalysis.overlapPolygon.length >= 3 ? [{
          type: "Feature",
          properties: { role: "suitable_launch_area_overlap", area_m2: radioAnalysis.areaM2, constraint_status: radioAnalysis.status },
          geometry: { type: "Polygon", coordinates: [localPolygonCoordinates(location, radioAnalysis.overlapPolygon)] },
        }] : []),
      ],
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `range-4-ren-${location[0].toFixed(4)}-${location[1].toFixed(4)}.geojson`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    // Keep the object URL alive long enough for stricter local browsers to
    // register the download before cleanup.
    window.setTimeout(() => {
      URL.revokeObjectURL(anchor.href);
      anchor.remove();
    }, 1000);
  };

  const weightDisplay = units === "metric" ? inputs.weightKg : inputs.weightKg * 2.2046226;
  const airspeedDisplay = display.speed(inputs.airspeedMs);
  const windDisplay = display.speed(inputs.windMs);

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">R4</span>
          <div>
            <p>FIELD ANALYSIS TOOL</p>
            <h1>Range 4-Ren <em>Investigative Range Estimator</em></h1>
          </div>
        </div>
        <div className="unit-switch" role="group" aria-label="Units">
          <button className={units === "metric" ? "active" : ""} onClick={() => setUnits("metric")}>Metric</button>
          <button className={units === "imperial" ? "active" : ""} onClick={() => setUnits("imperial")}>Imperial</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-intro">
            <p className="eyebrow">INPUT PARAMETERS</p>
            <p>All calculations run in SI units. Select a preset or enter recovered-aircraft data.</p>
          </div>

          <section className="control-section">
            <div className="section-heading"><span>01</span><h2>Aircraft profile</h2></div>
            <div className="preset-selectors">
              <label>
                <span>Aircraft category</span>
                <select
                  value={presetCategory}
                  onChange={(event) => {
                    setPresetCategory(event.target.value as DroneCategory);
                    setSelectedPresetId("");
                  }}
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label} · 10 models</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Commercial make & model</span>
                <select value={selectedPresetId} onChange={(event) => loadPreset(event.target.value)}>
                  <option value="">Select recovered drone…</option>
                  {categoryPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.maker} {preset.model}</option>
                  ))}
                </select>
              </label>
            </div>
            {selectedPreset && (
              <div className="preset-card" aria-live="polite">
                <div><span>LOADED STANDARD</span><strong>{selectedPreset.maker} {selectedPreset.model}</strong></div>
                <dl>
                  <div><dt>Battery</dt><dd>{selectedPreset.battery}</dd></div>
                  <div><dt>Weight</dt><dd>{selectedPreset.weightBasis}</dd></div>
                  <div><dt>Power model</dt><dd>{selectedPreset.specificPower} W/kg inferred cruise average</dd></div>
                  <div><dt>Radio link</dt><dd>{getPublishedRadioRangeKm(selectedPreset.id)} km published ideal maximum</dd></div>
                  <div><dt>Audit note</dt><dd>{selectedPreset.assumption}</dd></div>
                </dl>
                <a href={selectedPreset.source} target="_blank" rel="noreferrer">Manufacturer / technical source ↗</a>
                <p>Preset values are editable. Confirm the recovered battery label, payload, and aircraft variant.</p>
              </div>
            )}
            <Field label="All-up weight" value={weightDisplay} onChange={(value) => update("weightKg", units === "metric" ? value : value / 2.2046226)} unit={units === "metric" ? "kg" : "lb"} step="0.01" />
          </section>

          <section className="control-section">
            <div className="section-heading"><span>02</span><h2>Battery & usable energy</h2></div>
            <Field label="Capacity" value={inputs.capacityMah} onChange={(value) => update("capacityMah", value)} unit="mAh" step="50" />
            <label className="check-row"><input type="checkbox" checked={inputs.useCells} onChange={(event) => update("useCells", event.target.checked)} /><span>Derive nominal voltage from cell count (3.7 V/cell)</span></label>
            <div className="two-col">
              <Field label="Cell count" value={inputs.cells} onChange={(value) => update("cells", value)} unit="S" step="1" disabled={!inputs.useCells} />
              <Field label="Nominal voltage" value={inputs.voltage} onChange={(value) => update("voltage", value)} unit="V" step="0.1" disabled={inputs.useCells} />
            </div>
            <label className="slider-field">
              <span><b>Usable capacity</b><strong>{Math.round(inputs.usableFraction * 100)}%</strong></span>
              <input type="range" min="50" max="100" value={inputs.usableFraction * 100} onChange={(event) => update("usableFraction", Number(event.target.value) / 100)} />
            </label>
          </section>

          <section className="control-section">
            <div className="section-heading"><span>03</span><h2>Flight model</h2></div>
            <Field label="Cruise airspeed" value={airspeedDisplay} onChange={(value) => update("airspeedMs", units === "metric" ? value / 3.6 : value / 2.236936)} unit={display.speedUnit} step="0.5" />
            <label className="check-row"><input type="checkbox" checked={inputs.usePowerOverride} onChange={(event) => update("usePowerOverride", event.target.checked)} /><span>Use measured average power override</span></label>
            <Field label="Specific power" value={inputs.specificPower} onChange={(value) => update("specificPower", value)} unit="W/kg" step="1" disabled={inputs.usePowerOverride} />
            <Field label="Power override" value={inputs.powerOverride} onChange={(value) => update("powerOverride", value)} unit="W" step="1" disabled={!inputs.usePowerOverride} />
          </section>

          <section className="control-section wind-section">
            <div className="section-heading"><span>04</span><h2>Wind conditions</h2></div>
            <div className="wind-grid">
              <div>
                <Field label="Wind speed" value={windDisplay} onChange={(value) => update("windMs", units === "metric" ? value / 3.6 : value / 2.236936)} unit={display.speedUnit} step="0.5" />
                <Field label="Direction from true north" value={inputs.windFromDeg} onChange={(value) => update("windFromDeg", ((value % 360) + 360) % 360)} unit="°T" step="1" />
              </div>
              <div className="compass" aria-label={`Wind from ${inputs.windFromDeg} degrees true`}>
                <span className="north">N</span><span className="east">E</span><span className="south">S</span><span className="west">W</span>
                <i style={{ transform: `rotate(${inputs.windFromDeg}deg)` }}><b>▲</b></i>
              </div>
            </div>
            <label className="check-row"><input type="checkbox" checked={inputs.constantWind} onChange={(event) => update("constantWind", event.target.checked)} /><span>Assume constant wind during entire flight</span></label>
            {inputs.windMs > inputs.airspeedMs && <p className="warning">Wind exceeds cruise airspeed. The geometric envelope remains valid, but the drone may be unable to make progress upwind.</p>}
          </section>

          <section className="control-section radio-section">
            <div className="section-heading"><span>05</span><h2>Radio-link constraint</h2></div>
            <Field
              label="Published / entered maximum"
              value={display.distance(radioRangeM)}
              onChange={(value) => setRadioRangeM(units === "metric" ? value * 1000 : value * 1609.344)}
              unit={display.distanceUnit}
              step="0.1"
            />
            <label className="slider-field">
              <span><b>Terrain & interference factor</b><strong>{Math.round(radioFactor * 100)}%</strong></span>
              <input type="range" min="10" max="100" value={radioFactor * 100} onChange={(event) => setRadioFactor(Number(event.target.value) / 100)} />
            </label>
            <div className="radio-factor-labels"><span>Dense / obstructed</span><span>Published ideal</span></div>
            <div className="effective-radio">
              <span>EFFECTIVE LINK RADIUS</span>
              <strong>{display.distance(radioAnalysis.effectiveRangeM).toFixed(2)} {display.distanceUnit}</strong>
            </div>
            <label className="check-row"><input type="checkbox" checked={radioConstraint} onChange={(event) => setRadioConstraint(event.target.checked)} /><span>Require operator at launch to retain link at recovery</span></label>
            <p className="model-note">Disable this constraint for autonomous waypoint, programmed return, or continued lost-link flight. Buildings, terrain, antenna orientation, RF noise, region, and altitude can reduce range nonlinearly.</p>
          </section>

          <details className="assumptions">
            <summary>Assumptions & limitations <span>+</span></summary>
            <div>
              <p>This is a theoretical kinematic envelope, not a probability surface and not proof of a launch site.</p>
              <ul>
                <li>Constant airspeed, level cruise, and fixed average power.</li>
                <li>Constant wind speed/direction for the full flight when enabled.</li>
                <li>No climb, descent, hover, maneuver, payload, reserve, terrain, obstacle, or regulatory effects.</li>
                <li>Battery voltage, capacity, age, temperature, and health can materially alter endurance.</li>
                <li>Radio coverage is modeled as a derated circle; real coverage is terrain- and orientation-dependent and may be highly irregular.</li>
                <li>Launch-to-recovery flight is assumed continuous, with no intermediate landing or battery change.</li>
              </ul>
            </div>
          </details>
        </aside>

        <section className="map-column">
          <div className="location-bar">
            <div>
              <p className="eyebrow">RECOVERY LOCATION</p>
              <span>Click the map, enter coordinates, or search a place.</span>
            </div>
            <div className="coord-inputs">
              <label><span>LAT</span><input value={latText} onChange={(e) => setLatText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setCoordinates()} /></label>
              <label><span>LON</span><input value={lngText} onChange={(e) => setLngText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setCoordinates()} /></label>
              <button onClick={setCoordinates}>Set</button>
            </div>
            <div className="place-search">
              <input aria-label="Search place" placeholder="Search place or address" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchPlace()} />
              <button onClick={searchPlace} aria-label="Search">⌕</button>
            </div>
          </div>
          {searchStatus && <div className="search-status">{searchStatus}</div>}
          <div className="map-wrap">
            <div ref={mapNode} className="map" aria-label="Interactive map showing drone recovery and possible launch area" />
            {!mapReady && <div className="map-loading">Loading operational map…</div>}
            <div className="map-tools">
              <button
                type="button"
                aria-pressed={showBasemap}
                title="Loading the basemap sends tile requests and your IP address to OpenStreetMap."
                onClick={() => setShowBasemap((current) => !current)}
              >
                Basemap {showBasemap ? "on" : "off"}
              </button>
              <button onClick={fitGeometry}>Fit analysis</button>
            </div>
            <div className="legend">
              <p>MAP LAYERS</p>
              <label><input type="checkbox" checked={showStillAir} onChange={(e) => setShowStillAir(e.target.checked)} /><i className="key still" /> Still-air Theoretical Max</label>
              <label><input data-testid="toggle-wind-corrected" type="checkbox" checked={showWindCorrected} onChange={(e) => setShowWindCorrected(e.target.checked)} /><i className="key corrected" /> Possible Launch Area (wind-corrected)</label>
              <label><input type="checkbox" checked={showConservative} onChange={(e) => setShowConservative(e.target.checked)} /><i className="key conservative" /> Conservative radius</label>
              <label><input type="checkbox" checked={showWindArrow} onChange={(e) => setShowWindArrow(e.target.checked)} /><i className="key arrow" /> Upwind center offset</label>
              <label><input type="checkbox" checked={showRadioRange} onChange={(e) => setShowRadioRange(e.target.checked)} /><i className="key radio" /> Effective radio-link range</label>
              <label><input data-testid="toggle-suitable-overlap" type="checkbox" checked={showSuitableOverlap} onChange={(e) => setShowSuitableOverlap(e.target.checked)} /><i className="key overlap" /> Suitable launch overlap</label>
              <label className="conservative-control">Conservative factor <input type="range" min="50" max="90" value={inputs.conservativeFraction * 100} onChange={(e) => update("conservativeFraction", Number(e.target.value) / 100)} /><b>{Math.round(inputs.conservativeFraction * 100)}%</b></label>
            </div>
          </div>

          <section className="results">
            <div className="results-head">
              <div><p className="eyebrow">LIVE ESTIMATE</p><h2>Calculated flight envelope</h2></div>
              <div className="export-actions">
                <button onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</button>
                <button className="primary" onClick={exportGeoJSON}>Export GeoJSON</button>
              </div>
            </div>
            <div className="result-grid">
              <article className="hero-result">
                <span>WIND-CORRECTED RADIUS</span>
                <strong>{display.distance(calc.radiusM).toFixed(2)} <small>{display.distanceUnit}</small></strong>
                <p>Same air-relative radius; center shifted upwind.</p>
              </article>
              <article><span>FLIGHT TIME</span><strong>{(calc.timeHours * 60).toFixed(1)} <small>min</small></strong><p>{calc.timeHours.toFixed(3)} hours</p></article>
              <article><span>CENTER OFFSET</span><strong>{display.distance(calc.offsetM).toFixed(2)} <small>{display.distanceUnit}</small></strong><p>{inputs.constantWind ? `${inputs.windFromDeg.toFixed(0)}° true · upwind` : "Wind correction disabled"}</p></article>
              <article><span>USABLE ENERGY</span><strong>{calc.usableWh.toFixed(1)} <small>Wh</small></strong><p>{calc.batteryWh.toFixed(1)} Wh nominal</p></article>
              <article><span>AVERAGE POWER</span><strong>{calc.estimatedPowerW.toFixed(1)} <small>W</small></strong><p>{inputs.usePowerOverride ? "Measured override" : `${inputs.specificPower.toFixed(0)} W/kg × ${inputs.weightKg.toFixed(3)} kg`}</p></article>
              <article><span>CONSERVATIVE RADIUS</span><strong>{display.distance(calc.conservativeM).toFixed(2)} <small>{display.distanceUnit}</small></strong><p>{Math.round(inputs.conservativeFraction * 100)}% of theoretical</p></article>
              <article><span>EFFECTIVE RADIO RANGE</span><strong>{display.distance(radioAnalysis.effectiveRangeM).toFixed(2)} <small>{display.distanceUnit}</small></strong><p>{Math.round(radioFactor * 100)}% environment factor</p></article>
              <article className={radioAnalysis.status === "No overlap" ? "no-overlap" : ""}><span>SUITABLE OVERLAP</span><strong>{(radioAnalysis.areaM2 / 1e6).toFixed(2)} <small>km²</small></strong><p>{radioAnalysis.status}</p></article>
            </div>
            <div className="formula-strip">
              <div><b>1</b><span>Battery energy</span><code>({inputs.capacityMah.toFixed(0)} ÷ 1000) × {calc.nominalVoltage.toFixed(1)} V = {calc.batteryWh.toFixed(2)} Wh</code></div>
              <div><b>2</b><span>Usable energy</span><code>{calc.batteryWh.toFixed(2)} × {inputs.usableFraction.toFixed(2)} = {calc.usableWh.toFixed(2)} Wh</code></div>
              <div><b>3</b><span>Flight time</span><code>{calc.usableWh.toFixed(2)} Wh ÷ {calc.estimatedPowerW.toFixed(2)} W = {calc.timeHours.toFixed(3)} h</code></div>
              <div><b>4</b><span>Still-air radius</span><code>{inputs.airspeedMs.toFixed(2)} m/s × {calc.timeSeconds.toFixed(0)} s = {(calc.radiusM / 1000).toFixed(2)} km</code></div>
              <div><b>5</b><span>Upwind offset</span><code>{inputs.constantWind ? `${inputs.windMs.toFixed(2)} m/s × ${calc.timeSeconds.toFixed(0)} s = ${(calc.offsetM / 1000).toFixed(2)} km @ ${inputs.windFromDeg.toFixed(0)}°T` : "constant-wind correction disabled"}</code></div>
              <div><b>6</b><span>Offset components</span><code>E {calc.centerEastM.toFixed(0)} m · N {calc.centerNorthM.toFixed(0)} m</code></div>
              <div><b>7</b><span>Effective radio range</span><code>{(radioRangeM / 1000).toFixed(2)} km × {radioFactor.toFixed(2)} = {(radioAnalysis.effectiveRangeM / 1000).toFixed(2)} km</code></div>
              <div><b>8</b><span>Suitable launch set</span><code>wind-corrected flight circle ∩ radio circle = {(radioAnalysis.areaM2 / 1e6).toFixed(2)} km²</code></div>
            </div>
            <div className="confidence-note"><span>!</span><p><b>Interpret with caution.</b> Real-world flight and radio range are typically lower due to wind variability, maneuvers, temperature, battery aging, terrain, buildings, RF interference, antenna orientation, and regional transmitter limits.</p></div>
          </section>
        </section>
      </section>
      <footer><span>DRONE RANGE ESTIMATOR · INVESTIGATIVE MODE</span><span>Model output is advisory and must be corroborated with independent evidence.</span></footer>
    </main>
  );
}
