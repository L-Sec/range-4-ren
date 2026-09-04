# Range 4-Ren

Range 4-Ren is a client-side field analysis tool for estimating the theoretical launch-area envelope of a recovered UAV. The app keeps the physics transparent, performs all calculations in SI units, and maps the correct wind-adjusted origin geometry.

## Architecture

- **Calculation layer:** React state is normalized to SI units and converted only at the interface boundary.
- **Wind geometry:** the forward wind drift is inverted from the known recovery point to locate the possible-origin circle center.
- **Geospatial layer:** Leaflet is bundled locally and renders OpenStreetMap tiles, the recovery point, theoretical circles, offset vector, and launch-area center. The analysis interface and geometry continue to load if map tiles are unavailable.
- **Evidence handoff:** copyable text summary and a WGS84 GeoJSON polygon with model metadata.
- **Privacy:** calculations and exports run in the browser, with no application telemetry. The OpenStreetMap basemap is off by default; enabling it sends the viewed tile area and the user's IP address to OpenStreetMap infrastructure. Place search sends the entered query and the user's IP address to the public Nominatim service only when requested.
- **Commercial preset library:** 40 editable aircraft presets—10 each for micro/sub-250 g, camera/prosumer, enterprise/heavy multirotor, and fixed-wing/VTOL mapping systems. Each preset links to a manufacturer or technical source.
- **Radio-link intersection:** an editable published link range is derated for terrain/interference, then intersected with the wind-corrected flight envelope to show launch sites compatible with both constraints.

## Physical model and formulas

For capacity `C_mAh`, nominal voltage `V`, usable fraction `f`, all-up mass `m`, specific power `p_s`, optional average-power override `P_override`, cruise airspeed `V_a`, wind speed `V_w`, and battery-limited time `T`:

1. `E_battery [Wh] = (C_mAh / 1000) × V`
2. `E_usable [Wh] = E_battery × f`
3. `P_average [W] = P_override`, or `m × p_s`
4. `T [h] = E_usable / P_average`
5. `R₀ [m] = V_a [m/s] × T [s]`
6. `offset [m] = V_w [m/s] × T [s]`

Wind direction follows the meteorological convention: degrees true indicate where the wind is **from**. If `θ` is that direction, the wind-corrected possible-origin center is moved upwind from the recovery point:

- `offset_east = offset × sin(θ)`
- `offset_north = offset × cos(θ)`
- `origin_center = geodesic_offset(recovery, offset_east, offset_north)`

The possible launch area is a circle of radius `R₀` centered at `origin_center`. The still-air comparison is the same-radius circle centered on the recovery point. Wind does not reduce the air-relative radius by a percentage; it translates the reachable set by the wind drift vector.

## Usage

1. Set the recovery location by clicking the map, entering latitude/longitude, or searching for a place.
2. Select an aircraft category and commercial make/model. The preset loads standard weight, battery capacity/voltage, cruise airspeed, and an inferred cruise-power value.
3. Replace preset values with recovered-aircraft and battery-label data where available. Dual-battery systems are encoded as an equivalent total-energy pack and are labeled as such.
4. Enter wind speed and direction **from** true north.
5. Set the radio-link maximum and terrain/interference factor. Keep the link constraint enabled only when the operator is assumed to have remained at launch and retained control at the recovery point.
6. Review every intermediate result in the calculation strip.
7. Toggle comparison layers, change the conservative factor, copy the summary, or export GeoJSON.

The Metric/Imperial preference is stored locally in the browser.

Coordinates appear in copied summaries, GeoJSON content, and exported filenames. Treat those artifacts as operational data and review them before sharing.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Before proposing a change, run:

```bash
npm run lint
npm test
npm audit
```

## Assumptions and limitations

The model assumes constant airspeed, fixed average power, level cruise, and constant wind for the whole flight when enabled. It does not model climb/descent, hover, maneuvering, terrain, obstacles, control-link range, legal constraints, temperature, battery age, reserve policy, or intermediate landings. The output is a theoretical kinematic envelope—not a probability boundary, identification of a launch site, or proof of origin. Corroborate it with telemetry, RF evidence, imagery, witness accounts, and other investigative sources.

When radio constraint is enabled, the suitable launch set is the intersection of the wind-corrected possible-origin circle and a radio circle centered on the recovery point. The radio radius is `published_or_entered_range × environment_factor`.

This assumes the transmitter/operator remained at the launch point and a command link was required at the recovery point. Disable it for autonomous waypoint missions, programmed behavior after link loss, relay/repeater operation, cellular control, or a mobile operator. Published radio ranges are ideal line-of-sight values and vary by regulatory region; terrain, buildings, vegetation, altitude, interference, antenna orientation, and equipment condition can produce much shorter—and non-circular—coverage.

The preset library is an investigative starting point, not an identification database or sales ranking. Product variants, regional batteries, payloads, accessories, firmware, and production revisions can change weight and endurance. Published battery and standard-weight figures are paired with transparent cruise assumptions; cruise power is inferred because manufacturers generally do not publish a representative average-power value.
