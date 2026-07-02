// Fabric data dictionary
export const fabricData: Record<string, string[]> = {
  "Denim": ["14oz Raw Selvedge", "12oz Stretch Denim", "10oz Bull Denim", "Chambray"],
  "Cotton": ["100% Cotton Jersey", "Cotton Poplin", "Cotton Twill", "Combed Cotton", "Cotton Canvas", "Pima Cotton"],
  "Linen": ["100% Linen", "Linen/Cotton Blend", "Heavyweight Linen", "Handkerchief Linen"],
  "Silk": ["Silk Charmeuse", "Silk Chiffon", "Raw Silk", "Silk Crepe de Chine", "Habotai"],
  "Wool": ["Merino Wool", "Worsted Wool", "Wool Flannel", "Boiled Wool", "Tweed", "Gabardine"],
  "Synthetics": ["100% Polyester", "Nylon Spandex", "Acrylic Knit", "Polyester Microfiber"],
  "Rayon / Viscose": ["Rayon Challis", "Viscose Crepe", "Modal Jersey", "Cupro"],
  "Fleece": ["Cotton Fleece", "Polar Fleece", "Microfleece", "Sherpa Fleece"],
  "Corduroy": ["14 Wale Corduroy", "8 Wale Corduroy", "Stretch Corduroy", "Pinwale Corduroy"],
  "Velvet / Velour": ["Cotton Velvet", "Crushed Velvet", "Stretch Velour", "Panne Velvet"],
  "Spandex / Activewear": ["4-way Stretch Spandex", "Nylon Tricot", "Ribbed Knit Stretch", "Lycra Blend"],
  "Flannel": ["100% Cotton Flannel", "Yarn-Dyed Flannel", "Brushed Flannel", "Plaid Flannel"],
  "Satin": ["Polyester Satin", "Duchess Satin", "Silk Satin", "Sateen"],
  "Canvas / Duck": ["10oz Cotton Duck", "Waxed Canvas", "Heavy Duty Canvas"],
  "Muslin": ["Unbleached Muslin", "Bleached Muslin", "Sheer Muslin"],
  "Poplin": ["Cotton Poplin", "Stretch Poplin", "Poly-Cotton Poplin"],
  "Jersey": ["Cotton Spandex Jersey", "Bamboo Jersey", "Slub Jersey", "Ponte de Roma"],
  "Chiffon / Georgette": ["Silk Georgette", "Poly Chiffon", "Crepe de Chine"],
  "Terry Cloth": ["100% Cotton Terry", "French Terry", "Bamboo Terry", "Microfiber Terry"],
  "Broadcloth": ["100% Cotton Broadcloth", "Poly-Cotton Broadcloth"],
  "Batiste": ["Cotton Batiste", "Silk Batiste"],
  "Tencel / Lyocell": ["Tencel Twill", "Lyocell Jersey"],
  "Other": []
};

// Wash process options
// temp and duration are industry-standard reference values (ISO / garment finishing guidelines).
// They auto-populate the fields but remain user-editable.
export const washProcessOptions: Array<{
  value: string;
  label: string;
  group: string;
  temp?: string;
  duration?: string;
}> = [
  { value: "", label: "-- Select a Process --", group: "Standard Washes" },

  // ── Standard Washes ──────────────────────────────────────────────────────────
  // Raw/Rinse: cold-to-warm rinse to remove surface dust & loose dye, minimal agitation
  {
    value: "Raw Wash / Rinse",
    label: "Raw Wash / Rinse",
    group: "Standard Washes",
    temp: "30°C – 40°C",
    duration: "10 – 20 min",
  },
  // Normal Machine Wash: standard cotton/blended garment wash per ISO 6330
  {
    value: "Normal Machine Wash",
    label: "Normal Machine Wash",
    group: "Standard Washes",
    temp: "40°C",
    duration: "30 – 45 min",
  },
  // Silicone/Softener Wash: desizing + softener bath for smooth hand-feel
  {
    value: "Silicone / Softener Wash",
    label: "Silicone / Softener Wash",
    group: "Standard Washes",
    temp: "40°C",
    duration: "20 – 30 min",
  },

  // ── Abrasion & Stone Washes ───────────────────────────────────────────────────
  // Stone Wash: pumice stone abrasion for vintage/faded denim look
  {
    value: "Stone Wash",
    label: "Stone Wash",
    group: "Abrasion & Stone Washes",
    temp: "40°C – 60°C",
    duration: "60 – 90 min",
  },
  // Enzyme Wash: cellulase enzymes for softness & controlled fading (pH 4.5–5.5)
  {
    value: "Enzyme Wash",
    label: "Enzyme Wash",
    group: "Abrasion & Stone Washes",
    temp: "50°C – 55°C",
    duration: "40 – 60 min",
  },
  // Enzyme Stone Wash: combination of enzymes + pumice for enhanced abrasion
  {
    value: "Enzyme Stone Wash",
    label: "Enzyme Stone Wash",
    group: "Abrasion & Stone Washes",
    temp: "50°C – 60°C",
    duration: "50 – 75 min",
  },
  // Sand Wash: alkaline/abrasive agents for soft, ashy surface (common on silk & cotton)
  {
    value: "Sand Wash",
    label: "Sand Wash",
    group: "Abrasion & Stone Washes",
    temp: "40°C – 50°C",
    duration: "30 – 50 min",
  },

  // ── Chemical & Distressed ─────────────────────────────────────────────────────
  // Acid Wash: dry-tumble with KMnO₄-soaked stones; produces high-contrast patterns
  {
    value: "Acid Wash",
    label: "Acid Wash",
    group: "Chemical & Distressed",
    temp: "Ambient (Room Temp)",
    duration: "20 – 40 min",
  },
  // Bleach Wash: sodium hypochlorite/H₂O₂ bath for significant lightening
  {
    value: "Bleach Wash",
    label: "Bleach Wash",
    group: "Chemical & Distressed",
    temp: "50°C – 60°C",
    duration: "15 – 30 min",
  },
  // Snow Wash: stones soaked in KMnO₄ tumbled dry for mottled snowflake effect
  {
    value: "Snow Wash",
    label: "Snow Wash",
    group: "Chemical & Distressed",
    temp: "Ambient (Room Temp)",
    duration: "20 – 35 min",
  },
  // Mineral Wash: zeolite/porous minerals; eco-friendly alternative to stone
  {
    value: "Mineral Wash",
    label: "Mineral Wash",
    group: "Chemical & Distressed",
    temp: "40°C – 50°C",
    duration: "20 – 40 min",
  },
  // Vintage/Destroy Wash: multi-step soda-H₂O₂ + mechanical distressing
  {
    value: "Vintage / Destroy Wash",
    label: "Vintage / Destroy Wash",
    group: "Chemical & Distressed",
    temp: "60°C – 70°C",
    duration: "30 – 60 min",
  },

  // ── Garment Dye Processes (High Heat) ────────────────────────────────────────
  // Pigment Dye: surface bonding with binder; vintage/oil-look; requires curing
  {
    value: "Pigment Dye",
    label: "Pigment Dye",
    group: "Garment Dye Processes (High Heat)",
    temp: "40°C – 55°C (+ cure 120°C)",
    duration: "30 – 60 min",
  },
  // Reactive Dye: covalent bond with cellulose; excellent wash fastness
  {
    value: "Reactive Dye",
    label: "Reactive Dye",
    group: "Garment Dye Processes (High Heat)",
    temp: "60°C – 80°C",
    duration: "45 – 60 min",
  },
  // Sulfur Dye: dark shades (black/navy) via reduction-oxidation cycle on cellulosics
  {
    value: "Sulfur Dye",
    label: "Sulfur Dye",
    group: "Garment Dye Processes (High Heat)",
    temp: "70°C – 95°C",
    duration: "50 – 70 min",
  },
  // Direct Dye: substantive to cotton; exhaustion at near-boil for best leveling
  {
    value: "Direct Dye",
    label: "Direct Dye",
    group: "Garment Dye Processes (High Heat)",
    temp: "80°C – 100°C",
    duration: "45 – 60 min",
  },
  // Tie Dye / Dip Dye: fiber-reactive or direct dyes, room-temp fixation common
  {
    value: "Tie Dye / Dip Dye",
    label: "Tie Dye / Dip Dye",
    group: "Garment Dye Processes (High Heat)",
    temp: "Cold – 60°C",
    duration: "20 – 60 min",
  },

  // ── Custom ────────────────────────────────────────────────────────────────────
  { value: "Other", label: "Other (Custom Entry)...", group: "Custom" },
];

// Smart wash tips
export const washTips: Record<string, string> = {
  "Dye": "<strong>Garment Dyeing</strong> requires prolonged high-temperature baths. Expect significantly higher shrinkage (often 5-10% more) compared to standard washes.",
  "Enzyme": "<strong>Abrasion Washes</strong> break down surface fibers. Ensure your before-wash square edges are securely overlocked to prevent fraying from skewing your measurements.",
  "Stone": "<strong>Abrasion Washes</strong> break down surface fibers. Ensure your before-wash square edges are securely overlocked to prevent fraying from skewing your measurements.",
  "Sand": "<strong>Abrasion Washes</strong> break down surface fibers. Ensure your before-wash square edges are securely overlocked to prevent fraying from skewing your measurements.",
  "Acid": "<strong>Harsh Chemicals</strong> can affect the elasticity of spandex blends. If this fabric has stretch, check recovery after this wash.",
  "Bleach": "<strong>Harsh Chemicals</strong> can affect the elasticity of spandex blends. If this fabric has stretch, check recovery after this wash.",
  "Raw Wash / Rinse": "<strong>Raw/Rinse Wash</strong> usually yields the minimum baseline shrinkage. Heat in the tumble dryer will be the main shrinkage factor here."
};

// Group color classes
export const groupColorClasses = [
  'group-a', 'group-b', 'group-c', 'group-d', 'group-e',
  'group-f', 'group-g', 'group-h', 'group-i', 'group-j'
];

export const groupColors: Record<string, string> = {
  'group-a': '#c8e6c9',
  'group-b': '#fff9c4',
  'group-c': '#ffccbc',
  'group-d': '#e1f5fe',
  'group-e': '#f3e5f5',
  'group-f': '#ffeb3b',
  'group-g': '#b2dfdb',
  'group-h': '#ffe0b2',
  'group-i': '#d7ccc8',
  'group-j': '#cfd8dc'
};

// Base visualization size
export const BASE_SIZE = 500;

// Local storage key
export const STORAGE_KEY = 'shrinkStudioResults';

// Grouping threshold
export const GROUP_THRESHOLD = 1.0;
export const RECOMMENDATION_THRESHOLD = 1.5;

// Settings storage keys
export const SETTINGS_KEY = 'shrinkage_settings';
export const WASH_PROFILES_KEY = 'shrinkage_wash_profiles';

// Default app settings
export const DEFAULT_SETTINGS = {
  measurementUnit: 'inches' as const,
  temperatureScale: 'fahrenheit' as const,
  decimalPrecision: 1 as const,
  samplingPercent: 10,
  rollGroupSensitivity: 1.0,
  warningThreshold: 3.0,
  exportFormat: 'json' as const,
};
