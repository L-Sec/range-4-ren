export type DroneCategory = "micro" | "camera" | "heavy" | "fixed";

export type DronePreset = {
  id: string;
  category: DroneCategory;
  maker: string;
  model: string;
  weightKg: number;
  capacityMah: number;
  voltage: number;
  airspeedMs: number;
  specificPower: number;
  battery: string;
  weightBasis: string;
  assumption: string;
  source: string;
};

export const CATEGORY_LABELS: Record<DroneCategory, string> = {
  micro: "Micro / sub-250 g",
  camera: "Camera / prosumer",
  heavy: "Enterprise / heavy multirotor",
  fixed: "Fixed-wing / VTOL mapping",
};

// Commonly encountered commercial models, grouped for investigative triage.
// Published battery and standard-weight values should always be checked against
// the recovered aircraft and battery label. Specific power is an auditable
// modeling estimate calibrated to published endurance, not a manufacturer rating.
export const DRONE_PRESETS: DronePreset[] = [
  {
    id: "dji-mini-4-pro", category: "micro", maker: "DJI", model: "Mini 4 Pro",
    weightKg: 0.249, capacityMah: 2590, voltage: 7.32, airspeedMs: 12, specificPower: 110,
    battery: "2590 mAh · 7.32 V · 18.96 Wh", weightBasis: "<249 g standard battery",
    assumption: "12 m/s representative cruise; power inferred from 34 min published endurance.",
    source: "https://www.dji.com/mini-4-pro/specs",
  },
  {
    id: "dji-mini-3-pro", category: "micro", maker: "DJI", model: "Mini 3 Pro",
    weightKg: 0.249, capacityMah: 2453, voltage: 7.38, airspeedMs: 12, specificPower: 105,
    battery: "2453 mAh · 7.38 V · 18.1 Wh", weightBasis: "<249 g standard battery",
    assumption: "12 m/s representative cruise; power inferred from 34 min published endurance.",
    source: "https://www.dji.com/mini-3-pro/specs",
  },
  {
    id: "dji-mini-3", category: "micro", maker: "DJI", model: "Mini 3",
    weightKg: 0.248, capacityMah: 2453, voltage: 7.38, airspeedMs: 10, specificPower: 95,
    battery: "2453 mAh · 7.38 V · 18.1 Wh", weightBasis: "248 g standard battery",
    assumption: "10 m/s representative cruise; power inferred from 38 min published endurance.",
    source: "https://www.dji.com/mini-3/specs",
  },
  {
    id: "dji-mini-2", category: "micro", maker: "DJI", model: "Mini 2",
    weightKg: 0.242, capacityMah: 2250, voltage: 7.7, airspeedMs: 10, specificPower: 114,
    battery: "2250 mAh · 7.7 V · 17.32 Wh", weightBasis: "<249 g; 242 g reference",
    assumption: "10 m/s representative cruise; power inferred from 31 min published endurance.",
    source: "https://www.dji.com/mini-2/specs",
  },
  {
    id: "dji-mini-2-se", category: "micro", maker: "DJI", model: "Mini 2 SE",
    weightKg: 0.246, capacityMah: 2250, voltage: 7.7, airspeedMs: 10, specificPower: 112,
    battery: "2250 mAh · 7.7 V · 17.32 Wh", weightBasis: "246 g standard configuration",
    assumption: "10 m/s representative cruise; power inferred from 31 min published endurance.",
    source: "https://www.dji.com/mini-2-se/specs",
  },
  {
    id: "dji-mini-4k", category: "micro", maker: "DJI", model: "Mini 4K",
    weightKg: 0.246, capacityMah: 2250, voltage: 7.7, airspeedMs: 10, specificPower: 112,
    battery: "2250 mAh · 7.7 V · 17.32 Wh", weightBasis: "246 g standard configuration",
    assumption: "10 m/s representative cruise; power inferred from 31 min published endurance.",
    source: "https://www.dji.com/mini-2-se/specs",
  },
  {
    id: "dji-mini-se", category: "micro", maker: "DJI", model: "Mini SE",
    weightKg: 0.249, capacityMah: 2250, voltage: 7.7, airspeedMs: 9, specificPower: 114,
    battery: "2250 mAh · 7.7 V · 17.32 Wh", weightBasis: "<249 g standard configuration",
    assumption: "9 m/s representative cruise; power inferred from 30 min published endurance.",
    source: "https://www.dji.com/mini-se/specs",
  },
  {
    id: "dji-mavic-mini", category: "micro", maker: "DJI", model: "Mavic Mini",
    weightKg: 0.249, capacityMah: 2400, voltage: 7.2, airspeedMs: 8, specificPower: 114,
    battery: "2400 mAh · 7.2 V · 17.28 Wh", weightBasis: "249 g international model",
    assumption: "8 m/s representative cruise; power inferred from 30 min published endurance.",
    source: "https://www.dji.com/mavic-mini/specs",
  },
  {
    id: "autel-evo-nano-plus", category: "micro", maker: "Autel", model: "EVO Nano+",
    weightKg: 0.249, capacityMah: 2250, voltage: 7.7, airspeedMs: 10, specificPower: 122,
    battery: "2250 mAh · 7.7 V · 17.32 Wh", weightBasis: "249 g without accessories",
    assumption: "10 m/s standard-mode cruise; power inferred from 28 min published endurance.",
    source: "https://www.autelrobotics.com/productdetail/evo-nano-series-drones/",
  },
  {
    id: "potensic-atom", category: "micro", maker: "Potensic", model: "ATOM",
    weightKg: 0.249, capacityMah: 2230, voltage: 7.2, airspeedMs: 10, specificPower: 99,
    battery: "2230 mAh · 7.2 V · 16.06 Wh", weightBasis: "<249 g including battery",
    assumption: "10 m/s representative cruise; power inferred from 32 min published endurance.",
    source: "https://www.potensic.com/atom",
  },

  {
    id: "dji-air-3s", category: "camera", maker: "DJI", model: "Air 3S",
    weightKg: 0.724, capacityMah: 4276, voltage: 14.6, airspeedMs: 13, specificPower: 94,
    battery: "4276 mAh · 14.6 V · 62.5 Wh", weightBasis: "724 g takeoff weight",
    assumption: "13 m/s investigative cruise; power inferred from 45 min published endurance.",
    source: "https://www.dji.com/support/product/air-3s",
  },
  {
    id: "dji-air-3", category: "camera", maker: "DJI", model: "Air 3",
    weightKg: 0.72, capacityMah: 4241, voltage: 14.76, airspeedMs: 13, specificPower: 93,
    battery: "4241 mAh · 14.76 V · 62.6 Wh", weightBasis: "720 g takeoff weight",
    assumption: "13 m/s investigative cruise; power inferred from 46 min published endurance.",
    source: "https://www.dji.com/air-3/specs",
  },
  {
    id: "dji-air-2s", category: "camera", maker: "DJI", model: "Air 2S",
    weightKg: 0.595, capacityMah: 3500, voltage: 11.55, airspeedMs: 12, specificPower: 108,
    battery: "3500 mAh · 11.55 V · 40.42 Wh", weightBasis: "595 g takeoff weight",
    assumption: "12 m/s investigative cruise; power inferred from 31 min published endurance.",
    source: "https://www.dji.com/air-2s/specs",
  },
  {
    id: "dji-mavic-3-pro", category: "camera", maker: "DJI", model: "Mavic 3 Pro",
    weightKg: 0.958, capacityMah: 5000, voltage: 15.4, airspeedMs: 15, specificPower: 92,
    battery: "5000 mAh · 15.4 V · 77 Wh", weightBasis: "958 g standard model",
    assumption: "15 m/s investigative cruise; power inferred from 43 min published endurance.",
    source: "https://www.dji.com/mavic-3-pro/specs",
  },
  {
    id: "dji-mavic-3-classic", category: "camera", maker: "DJI", model: "Mavic 3 Classic",
    weightKg: 0.895, capacityMah: 5000, voltage: 15.4, airspeedMs: 15, specificPower: 92,
    battery: "5000 mAh · 15.4 V · 77 Wh", weightBasis: "895 g standard model",
    assumption: "15 m/s investigative cruise; power inferred from 46 min published endurance.",
    source: "https://www.dji.com/mavic-3-classic/specs",
  },
  {
    id: "dji-mavic-2-pro", category: "camera", maker: "DJI", model: "Mavic 2 Pro",
    weightKg: 0.907, capacityMah: 3850, voltage: 15.4, airspeedMs: 13, specificPower: 104,
    battery: "3850 mAh · 15.4 V · 59.29 Wh", weightBasis: "907 g takeoff weight",
    assumption: "13 m/s investigative cruise; power inferred from 31 min published endurance.",
    source: "https://www.dji.com/mavic-2/info#specs",
  },
  {
    id: "dji-mavic-air-2", category: "camera", maker: "DJI", model: "Mavic Air 2",
    weightKg: 0.57, capacityMah: 3500, voltage: 11.55, airspeedMs: 12, specificPower: 103,
    battery: "3500 mAh · 11.55 V · 40.42 Wh", weightBasis: "570 g takeoff weight",
    assumption: "12 m/s investigative cruise; power inferred from 34 min published endurance.",
    source: "https://www.dji.com/mavic-air-2/specs",
  },
  {
    id: "autel-evo-lite-plus", category: "camera", maker: "Autel", model: "EVO Lite+",
    weightKg: 0.835, capacityMah: 6175, voltage: 11.13, airspeedMs: 13, specificPower: 101,
    battery: "6175 mAh · 11.13 V · 68.7 Wh", weightBasis: "835 g takeoff weight",
    assumption: "13 m/s investigative cruise; power inferred from 40 min published endurance.",
    source: "https://www.autelrobotics.com/productdetail/evo-lite-series-drones/",
  },
  {
    id: "autel-evo-ii-pro-v3", category: "camera", maker: "Autel", model: "EVO II Pro V3",
    weightKg: 1.191, capacityMah: 7100, voltage: 11.55, airspeedMs: 14, specificPower: 85,
    battery: "7100 mAh · 11.55 V · 82 Wh", weightBasis: "1,191 g with battery and propellers",
    assumption: "14 m/s investigative cruise; power inferred from 40 min published endurance.",
    source: "https://www.autelrobotics.com/productdetail/evo-ii-pro-v3/",
  },
  {
    id: "parrot-anafi", category: "camera", maker: "Parrot", model: "ANAFI",
    weightKg: 0.32, capacityMah: 2700, voltage: 7.6, airspeedMs: 11, specificPower: 126,
    battery: "2700 mAh · 7.6 V · 20.52 Wh", weightBasis: "320 g standard aircraft",
    assumption: "11 m/s investigative cruise; power inferred from 25 min published endurance.",
    source: "https://www.parrot.com/en/drones/anafi/technical-specifications",
  },

  {
    id: "dji-mavic-3e", category: "heavy", maker: "DJI", model: "Mavic 3 Enterprise",
    weightKg: 0.915, capacityMah: 5000, voltage: 15.4, airspeedMs: 15, specificPower: 92,
    battery: "5000 mAh · 15.4 V · 77 Wh", weightBasis: "915 g with battery and propellers",
    assumption: "15 m/s normal-mode cruise; power inferred from 45 min published endurance.",
    source: "https://enterprise.dji.com/mavic-3-enterprise/specs",
  },
  {
    id: "dji-mavic-3t", category: "heavy", maker: "DJI", model: "Mavic 3 Thermal",
    weightKg: 0.92, capacityMah: 5000, voltage: 15.4, airspeedMs: 15, specificPower: 92,
    battery: "5000 mAh · 15.4 V · 77 Wh", weightBasis: "920 g with battery and propellers",
    assumption: "15 m/s normal-mode cruise; power inferred from 45 min published endurance.",
    source: "https://enterprise.dji.com/mavic-3-enterprise/specs",
  },
  {
    id: "dji-phantom-4-rtk", category: "heavy", maker: "DJI", model: "Phantom 4 RTK",
    weightKg: 1.391, capacityMah: 5870, voltage: 15.2, airspeedMs: 13, specificPower: 105,
    battery: "5870 mAh · 15.2 V · 89.2 Wh", weightBasis: "1,391 g takeoff weight",
    assumption: "13 m/s mapping cruise; power inferred from 30 min published endurance.",
    source: "https://enterprise.dji.com/phantom-4-rtk/info#specs",
  },
  {
    id: "dji-phantom-4-pro-v2", category: "heavy", maker: "DJI", model: "Phantom 4 Pro V2.0",
    weightKg: 1.375, capacityMah: 5870, voltage: 15.2, airspeedMs: 13, specificPower: 109,
    battery: "5870 mAh · 15.2 V · 89.2 Wh", weightBasis: "1,375 g takeoff weight",
    assumption: "13 m/s investigative cruise; power inferred from 30 min published endurance.",
    source: "https://www.dji.com/phantom-4-pro-v2/specs",
  },
  {
    id: "dji-inspire-2", category: "heavy", maker: "DJI", model: "Inspire 2",
    weightKg: 3.44, capacityMah: 8560, voltage: 22.8, airspeedMs: 16, specificPower: 103,
    battery: "2 × 4280 mAh · 22.8 V · 195.2 Wh total", weightBasis: "3,440 g with two batteries, no gimbal",
    assumption: "Capacity encoded as parallel-energy equivalent; power inferred from 27 min endurance.",
    source: "https://www.dji.com/inspire-2/info#specs",
  },
  {
    id: "dji-matrice-30", category: "heavy", maker: "DJI", model: "Matrice 30",
    weightKg: 3.77, capacityMah: 11760, voltage: 26.1, airspeedMs: 15, specificPower: 98,
    battery: "2 × 5880 mAh · 26.1 V (TB30)", weightBasis: "3,770 g including two batteries",
    assumption: "Capacity encoded as parallel-energy equivalent; power calibrated to 41 min endurance.",
    source: "https://enterprise.dji.com/matrice-30/specs",
  },
  {
    id: "dji-matrice-30t", category: "heavy", maker: "DJI", model: "Matrice 30T",
    weightKg: 3.77, capacityMah: 11760, voltage: 26.1, airspeedMs: 15, specificPower: 98,
    battery: "2 × 5880 mAh · 26.1 V (TB30)", weightBasis: "3,770 g including two batteries",
    assumption: "Capacity encoded as parallel-energy equivalent; power calibrated to 41 min endurance.",
    source: "https://enterprise.dji.com/matrice-30/specs",
  },
  {
    id: "dji-matrice-300", category: "heavy", maker: "DJI", model: "Matrice 300 RTK",
    weightKg: 6.3, capacityMah: 11870, voltage: 52.8, airspeedMs: 15, specificPower: 78,
    battery: "2 × 5935 mAh · 52.8 V · 548 Wh total", weightBasis: "6.3 kg with two TB60 batteries",
    assumption: "Capacity encoded as parallel-energy equivalent; power inferred from 55 min endurance.",
    source: "https://www.dji.com/support/product/matrice-300",
  },
  {
    id: "dji-matrice-350", category: "heavy", maker: "DJI", model: "Matrice 350 RTK",
    weightKg: 6.47, capacityMah: 11760, voltage: 44.76, airspeedMs: 15, specificPower: 73,
    battery: "2 × 5880 mAh · 44.76 V · 526.4 Wh total", weightBasis: "Approx. 6.47 kg with two TB65 batteries",
    assumption: "Capacity encoded as parallel-energy equivalent; power inferred from 55 min endurance.",
    source: "https://enterprise.dji.com/matrice-350-rtk/specs",
  },
  {
    id: "autel-evo-max-4t", category: "heavy", maker: "Autel", model: "EVO Max 4T",
    weightKg: 1.6, capacityMah: 8070, voltage: 14.88, airspeedMs: 14, specificPower: 88,
    battery: "8070 mAh · 14.88 V · 120 Wh", weightBasis: "Approx. 1,600 g takeoff weight",
    assumption: "14 m/s investigative cruise; power inferred from 42 min published endurance.",
    source: "https://www.autelrobotics.com/productdetail/evo-max-4t/",
  },

  {
    id: "wingtraone-gen2", category: "fixed", maker: "Wingtra", model: "WingtraOne GEN II",
    weightKg: 4.5, capacityMah: 5395, voltage: 36.7, airspeedMs: 16, specificPower: 37,
    battery: "2 × 99 Wh · 198 Wh total (mAh equivalent)", weightBasis: "4.5 kg maximum takeoff weight",
    assumption: "mAh is energy-equivalent at 36.7 V; 16 m/s published operational cruise.",
    source: "https://wingtra.com/wp-content/uploads/WingtraOne-Brochure.pdf",
  },
  {
    id: "ebee-x-standard", category: "fixed", maker: "AgEagle / senseFly", model: "eBee X — standard",
    weightKg: 1.6, capacityMah: 4900, voltage: 14.8, airspeedMs: 18, specificPower: 37,
    battery: "4900 mAh · 14.8 V standard pack", weightBasis: "Up to 1.6 kg with camera and battery",
    assumption: "18 m/s representative mapping cruise; verify pack label and installed payload.",
    source: "https://www.sensefly.com/drones/ebee-x/",
  },
  {
    id: "ebee-x-endurance", category: "fixed", maker: "AgEagle / senseFly", model: "eBee X — endurance",
    weightKg: 1.6, capacityMah: 7100, voltage: 14.8, airspeedMs: 18, specificPower: 36,
    battery: "7100 mAh · 14.8 V endurance pack", weightBasis: "Up to 1.6 kg with camera and battery",
    assumption: "18 m/s representative mapping cruise; power calibrated to 90 min maximum endurance.",
    source: "https://www.sensefly.com/drones/ebee-x/",
  },
  {
    id: "ebee-geo", category: "fixed", maker: "AgEagle / senseFly", model: "eBee Geo",
    weightKg: 1.4, capacityMah: 4900, voltage: 14.8, airspeedMs: 18, specificPower: 57,
    battery: "4900 mAh · 14.8 V standard pack", weightBasis: "Approx. 1.4 kg with camera and battery",
    assumption: "18 m/s representative mapping cruise; verify pack and payload on recovered aircraft.",
    source: "https://www.sensefly.com/drones/ebee-geo/",
  },
  {
    id: "ebee-ag", category: "fixed", maker: "AgEagle / senseFly", model: "eBee Ag",
    weightKg: 1.4, capacityMah: 4900, voltage: 14.8, airspeedMs: 18, specificPower: 47,
    battery: "4900 mAh · 14.8 V standard pack", weightBasis: "Approx. 1.4 kg with sensor and battery",
    assumption: "18 m/s representative mapping cruise; payload choice materially changes endurance.",
    source: "https://www.sensefly.com/drones/ebee-ag/",
  },
  {
    id: "ebee-tac", category: "fixed", maker: "AgEagle / senseFly", model: "eBee TAC",
    weightKg: 1.6, capacityMah: 7100, voltage: 14.8, airspeedMs: 18, specificPower: 36,
    battery: "7100 mAh · 14.8 V endurance pack", weightBasis: "Up to 1.6 kg with camera and battery",
    assumption: "18 m/s representative cruise; endurance-pack configuration modeled.",
    source: "https://www.sensefly.com/drones/ebee-tac/",
  },
  {
    id: "quantum-trinity-f90", category: "fixed", maker: "Quantum Systems", model: "Trinity F90+",
    weightKg: 5, capacityMah: 10000, voltage: 22.2, airspeedMs: 17, specificPower: 24,
    battery: "10,000 mAh · 22.2 V modeled mission pack", weightBasis: "5.0 kg maximum takeoff weight",
    assumption: "17 m/s published cruise; battery entry is a modeling pack—confirm recovered label.",
    source: "https://helpdesk.quantum-systems.com/documents/products/f90_manual_V2.3.0.49.pdf",
  },
  {
    id: "parrot-disco", category: "fixed", maker: "Parrot", model: "Disco",
    weightKg: 0.75, capacityMah: 2700, voltage: 11.1, airspeedMs: 18, specificPower: 44,
    battery: "2700 mAh · 11.1 V · 3S LiPo", weightBasis: "750 g standard aircraft",
    assumption: "18 m/s representative cruise; power inferred from 45 min published endurance.",
    source: "https://www.parrot.com/assets/s3fs-public/2021-09/disco-fpv_user-guide_uk.pdf",
  },
  {
    id: "smartplanes-nxt", category: "fixed", maker: "SmartPlanes", model: "NXT",
    weightKg: 1.1, capacityMah: 3600, voltage: 11.1, airspeedMs: 8.7, specificPower: 25,
    battery: "3600 mAh · 11.1 V standard pack", weightBasis: "Up to 1.1 kg with high-capacity configuration",
    assumption: "8.7 m/s published stable speed; standard 1.2-hour battery configuration.",
    source: "https://smartplanes.com/drones/nxt/",
  },
  {
    id: "yangda-mapird-pro", category: "fixed", maker: "YANGDA", model: "Mapird Pro",
    weightKg: 6.96, capacityMah: 25000, voltage: 22.2, airspeedMs: 17, specificPower: 35,
    battery: "25,000 mAh · 22.2 V · 6S LiPo", weightBasis: "Approx. 6.96 kg with battery and 600 g payload",
    assumption: "17 m/s published cruise; power inferred from 112 min stated endurance.",
    source: "https://www.yangdaonline.com/yangda-mapird-pro-long-endurance-vtol-drone-for-mapping-and-surveillance/.html",
  },
];

export const getPresetsForCategory = (category: DroneCategory) =>
  DRONE_PRESETS.filter((preset) => preset.category === category);

// Manufacturer-advertised maximum control/video-link distances under ideal,
// unobstructed conditions. Regional limits differ, so the estimator applies a
// separate editable terrain/interference factor.
const RADIO_RANGE_KM: Record<string, number> = {
  "dji-mini-4-pro": 20, "dji-mini-3-pro": 12, "dji-mini-3": 10,
  "dji-mini-2": 10, "dji-mini-2-se": 10, "dji-mini-4k": 10,
  "dji-mini-se": 4, "dji-mavic-mini": 4, "autel-evo-nano-plus": 10,
  "potensic-atom": 6, "dji-air-3s": 20, "dji-air-3": 20,
  "dji-air-2s": 12, "dji-mavic-3-pro": 15, "dji-mavic-3-classic": 15,
  "dji-mavic-2-pro": 10, "dji-mavic-air-2": 10, "autel-evo-lite-plus": 12,
  "autel-evo-ii-pro-v3": 15, "parrot-anafi": 4, "dji-mavic-3e": 15,
  "dji-mavic-3t": 15, "dji-phantom-4-rtk": 7, "dji-phantom-4-pro-v2": 10,
  "dji-inspire-2": 7, "dji-matrice-30": 15, "dji-matrice-30t": 15,
  "dji-matrice-300": 15, "dji-matrice-350": 20, "autel-evo-max-4t": 20,
  "wingtraone-gen2": 10, "ebee-x-standard": 8, "ebee-x-endurance": 8,
  "ebee-geo": 8, "ebee-ag": 8, "ebee-tac": 8,
  "quantum-trinity-f90": 7.5, "parrot-disco": 2, "smartplanes-nxt": 5,
  "yangda-mapird-pro": 10,
};

export const getPublishedRadioRangeKm = (presetId: string) =>
  RADIO_RANGE_KM[presetId] ?? 5;
