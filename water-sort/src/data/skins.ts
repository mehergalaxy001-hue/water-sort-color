/**
 * Water Colour 2D - Modular Shop presets
 */

export interface BottleSkin {
  id: string;
  name: string;
  cost: number;
  glassColor: string; // Hex color for the glass outline
  glowColor: string;  // Glow shadow outline color
  sticker?: string;   // Decorative center symbol overlay (emoji)
  shineType?: "sparkle" | "normal" | "glossy" | "rainbow-glistening";
}

export interface BackgroundTheme {
  id: string;
  name: string;
  cost: number;
  gradientClass: string; // Tailwinds background class
  style?: Record<string, string>; // Inline style adjustments
}

// Generate exactly 50 premium bottle skins
// Prices starting from 10,000 up to 50,000 coins
export const BOTTLE_SKINS: BottleSkin[] = [
  { id: "skin_0", name: "Standard Vessel", cost: 0, glassColor: "rgba(255, 255, 255, 0.85)", glowColor: "rgba(255, 255, 255, 0.1)", shineType: "normal" },
  { id: "skin_1", name: "Aqua Potion", cost: 10000, glassColor: "#38bdf8", glowColor: "rgba(56, 189, 248, 0.4)", sticker: "💧", shineType: "glossy" },
  { id: "skin_2", name: "Toxic Flask", cost: 10816, glassColor: "#a3e635", glowColor: "rgba(163, 230, 53, 0.4)", sticker: "☣️", shineType: "sparkle" },
  { id: "skin_3", name: "Leon Sparks", cost: 11632, glassColor: "#fbbf24", glowColor: "rgba(251, 191, 36, 0.45)", sticker: "⚡", shineType: "sparkle" },
  { id: "skin_4", name: "Crystalline Vial", cost: 12448, glassColor: "#f472b6", glowColor: "rgba(244, 114, 182, 0.4)", sticker: "💎", shineType: "rainbow-glistening" },
  { id: "skin_5", name: "Gold Chalice", cost: 13265, glassColor: "#fbbf24", glowColor: "rgba(251, 191, 36, 0.6)", sticker: "👑", shineType: "glossy" },
  { id: "skin_6", name: "Magic Beaker", cost: 14081, glassColor: "#c084fc", glowColor: "rgba(192, 132, 252, 0.45)", sticker: "🔮", shineType: "rainbow-glistening" },
  { id: "skin_7", name: "Lava Glass", cost: 14897, glassColor: "#f87171", glowColor: "rgba(248, 113, 113, 0.5)", sticker: "🔥", shineType: "sparkle" },
  { id: "skin_8", name: "Dark Relic", cost: 15714, glassColor: "#94a3b8", glowColor: "rgba(148, 163, 184, 0.3)", sticker: "💀", shineType: "normal" },
  { id: "skin_9", name: "Cosmic Decanter", cost: 16530, glassColor: "#818cf8", glowColor: "rgba(129, 140, 248, 0.5)", sticker: "🌌", shineType: "rainbow-glistening" },
  { id: "skin_10", name: "Shadow Potion", cost: 17346, glassColor: "#475569", glowColor: "rgba(71, 85, 105, 0.4)", sticker: "🦇", shineType: "normal" },
  { id: "skin_11", name: "Prism Goblet", cost: 18163, glassColor: "#34d399", glowColor: "rgba(52, 211, 153, 0.45)", sticker: "🌈", shineType: "rainbow-glistening" },
  { id: "skin_12", name: "Ember Chalice", cost: 18979, glassColor: "#fb923c", glowColor: "rgba(251, 146, 60, 0.5)", sticker: "🍁", shineType: "sparkle" },
  { id: "skin_13", name: "Enchanted Jar", cost: 19795, glassColor: "#e879f9", glowColor: "rgba(232, 121, 249, 0.5)", sticker: "✨", shineType: "sparkle" },
  { id: "skin_14", name: "Emerald Vial", cost: 20612, glassColor: "#34d399", glowColor: "rgba(52, 211, 153, 0.5)", sticker: "🍀", shineType: "glossy" },
  { id: "skin_15", name: "Sapphire Flask", cost: 21428, glassColor: "#60a5fa", glowColor: "rgba(96, 165, 250, 0.5)", sticker: "🐳", shineType: "glossy" },
  { id: "skin_16", name: "Amethyst Bottle", cost: 22244, glassColor: "#a78bfa", glowColor: "rgba(167, 139, 250, 0.5)", sticker: "🦄", shineType: "rainbow-glistening" },
  { id: "skin_17", name: "Fairy Glass", cost: 23061, glassColor: "#f472b6", glowColor: "rgba(244, 114, 182, 0.5)", sticker: "🧚‍♀️", shineType: "sparkle" },
  { id: "skin_18", name: "Sunfire Flask", cost: 23877, glassColor: "#f59e0b", glowColor: "rgba(245, 158, 111, 0.6)", sticker: "☀️", shineType: "sparkle" },
  { id: "skin_19", name: "Abyss Decanter", cost: 24693, glassColor: "#1e1b4b", glowColor: "rgba(30, 27, 75, 0.6)", sticker: "🐙", shineType: "normal" },
  { id: "skin_20", name: "Obsidian Jar", cost: 25510, glassColor: "#0f172a", glowColor: "rgba(15, 23, 42, 0.5)", sticker: "🥋", shineType: "normal" },
  { id: "skin_21", name: "Aura Goblet", cost: 26326, glassColor: "#a5b4fc", glowColor: "rgba(165, 180, 252, 0.5)", sticker: "🧬", shineType: "rainbow-glistening" },
  { id: "skin_22", name: "Glacier Tube", cost: 27142, glassColor: "#93c5fd", glowColor: "rgba(147, 197, 253, 0.5)", sticker: "❄️", shineType: "glossy" },
  { id: "skin_23", name: "Chrono Hourglass", cost: 27959, glassColor: "#fcd34d", glowColor: "rgba(252, 211, 77, 0.5)", sticker: "⏳", shineType: "normal" },
  { id: "skin_24", name: "Galaxy Carafe", cost: 28775, glassColor: "#c084fc", glowColor: "rgba(192, 132, 252, 0.5)", sticker: "🌠", shineType: "rainbow-glistening" },
  { id: "skin_25", name: "Starlight Vial", cost: 29591, glassColor: "#fef08a", glowColor: "rgba(254, 240, 138, 0.5)", sticker: "⭐", shineType: "sparkle" },
  { id: "skin_26", name: "Ocean Tear", cost: 30408, glassColor: "#38bdf8", glowColor: "rgba(56, 189, 248, 0.5)", sticker: "🌊", shineType: "glossy" },
  { id: "skin_27", name: "Volcano Urn", cost: 31224, glassColor: "#ef4444", glowColor: "rgba(239, 68, 68, 0.5)", sticker: "🌋", shineType: "sparkle" },
  { id: "skin_28", name: "Spectral Flask", cost: 32040, glassColor: "#fb7185", glowColor: "rgba(251, 113, 133, 0.5)", sticker: "👻", shineType: "rainbow-glistening" },
  { id: "skin_29", name: "Holy Grail", cost: 32857, glassColor: "#f59e0b", glowColor: "rgba(245, 158, 11, 0.7)", sticker: "🕊️", shineType: "sparkle" },
  { id: "skin_30", name: "Cursed Vessel", cost: 33673, glassColor: "#15803d", glowColor: "rgba(21, 128, 61, 0.5)", sticker: "😈", shineType: "normal" },
  { id: "skin_31", name: "Plasma Core", cost: 34489, glassColor: "#ec4899", glowColor: "rgba(236, 72, 153, 0.5)", sticker: "⚛️", shineType: "sparkle" },
  { id: "skin_32", name: "Phoenix Egg", cost: 35306, glassColor: "#ea580c", glowColor: "rgba(234, 88, 12, 0.6)", sticker: "🥚", shineType: "sparkle" },
  { id: "skin_33", name: "Mermaid Potion", cost: 36122, glassColor: "#2dd4bf", glowColor: "rgba(45, 212, 191, 0.5)", sticker: "🧜‍♀️", shineType: "glossy" },
  { id: "skin_34", name: "Dracula Goblet", cost: 36938, glassColor: "#b91c1c", glowColor: "rgba(185, 28, 28, 0.6)", sticker: "🧛‍♂️", shineType: "normal" },
  { id: "skin_35", name: "Elf Chalice", cost: 37755, glassColor: "#10b981", glowColor: "rgba(16, 185, 129, 0.5)", sticker: "🧝‍♀️", shineType: "sparkle" },
  { id: "skin_36", name: "Druid Horn", cost: 38571, glassColor: "#854d0e", glowColor: "rgba(133, 77, 14, 0.5)", sticker: "🌲", shineType: "normal" },
  { id: "skin_37", name: "Necro Urn", cost: 39387, glassColor: "#334155", glowColor: "rgba(51, 65, 85, 0.5)", sticker: "⚱️", shineType: "normal" },
  { id: "skin_38", name: "Celestial Orb", cost: 40204, glassColor: "#a5b4fc", glowColor: "rgba(165, 180, 252, 0.6)", sticker: "🪐", shineType: "rainbow-glistening" },
  { id: "skin_39", name: "Thunder Bottle", cost: 41020, glassColor: "#38bdf8", glowColor: "rgba(56, 189, 248, 0.5)", sticker: "⛈️", shineType: "sparkle" },
  { id: "skin_40", name: "Lunar Jar", cost: 41836, glassColor: "#bae6fd", glowColor: "rgba(186, 230, 253, 0.5)", sticker: "🌙", shineType: "rainbow-glistening" },
  { id: "skin_41", name: "Solar Crucible", cost: 42653, glassColor: "#fbbf24", glowColor: "rgba(251, 191, 36, 0.6)", sticker: "☀️", shineType: "sparkle" },
  { id: "skin_42", name: "Void Catalyst", cost: 43469, glassColor: "#22d3ee", glowColor: "rgba(34, 211, 238, 0.5)", sticker: "🌀", shineType: "rainbow-glistening" },
  { id: "skin_43", name: "Aether Flask", cost: 44285, glassColor: "#f472b6", glowColor: "rgba(244, 114, 182, 0.5)", sticker: "☁️", shineType: "glossy" },
  { id: "skin_44", name: "Tempest Tube", cost: 45102, glassColor: "#22d3ee", glowColor: "rgba(34, 211, 238, 0.5)", sticker: "🌪️", shineType: "sparkle" },
  { id: "skin_45", name: "Blizzard Goblet", cost: 45918, glassColor: "#e2e8f0", glowColor: "rgba(226, 232, 240, 0.5)", sticker: "🏔️", shineType: "normal" },
  { id: "skin_46", name: "Wildfire Potion", cost: 46734, glassColor: "#f97316", glowColor: "rgba(249, 115, 22, 0.6)", sticker: "🔥", shineType: "sparkle" },
  { id: "skin_47", name: "Zen Shaker", cost: 47551, glassColor: "#10b981", glowColor: "rgba(16, 185, 129, 0.5)", sticker: "🌸", shineType: "sparkle" },
  { id: "skin_48", name: "Quantum Beaker", cost: 48367, glassColor: "#8b5cf6", glowColor: "rgba(139, 92, 246, 0.5)", sticker: "⚛️", shineType: "rainbow-glistening" },
  { id: "skin_49", name: "Infinity Urn", cost: 50000, glassColor: "#f43f5e", glowColor: "rgba(244, 63, 94, 0.7)", sticker: "♾️", shineType: "rainbow-glistening" }
];

// Exactly 10 beautifully themed backgrounds
// Price is exactly 10,000 coins each (except default background themed at 0)
export const BACKGROUND_THEMES: BackgroundTheme[] = [
  { id: "bg_0", name: "Royal Blue & Depth Blue", cost: 0, gradientClass: "bg-gradient-to-b from-[#0c2461] to-[#070b19]" },
  { id: "bg_1", name: "Midnight Neon Glow", cost: 10000, gradientClass: "bg-gradient-to-b from-[#180026] via-[#090014] to-[#010103]" },
  { id: "bg_2", name: "Golden Royal", cost: 10000, gradientClass: "bg-gradient-to-b from-[#2e1d03] via-[#120701] to-[#040200]" },
  { id: "bg_3", name: "Forest Moss", cost: 10000, gradientClass: "bg-gradient-to-b from-[#0e2c1e] via-[#05150d] to-[#010603]" },
  { id: "bg_4", name: "Cosmic Nebula", cost: 10000, gradientClass: "bg-gradient-to-b from-[#11012c] via-[#060012] to-[#020005]" },
  { id: "bg_5", name: "Volcanic Crimson Red", cost: 10000, gradientClass: "bg-gradient-to-b from-[#3b0808] via-[#1a0202] to-[#030000]" },
  { id: "bg_6", name: "Sunset Over Horizon", cost: 10000, gradientClass: "bg-gradient-to-b from-[#4d1226] via-[#1a0011] to-[#080006]" },
  { id: "bg_7", name: "Witches Purple Cauldron", cost: 10000, gradientClass: "bg-gradient-to-b from-[#1e0b36] via-[#0b0314] to-[#000000]" },
  { id: "bg_8", name: "Cyberpunk Digital Alley", cost: 10000, gradientClass: "bg-gradient-to-b from-[#061e29] via-[#010912] to-[#000205]" },
  { id: "bg_9", name: "Glacial Deep Frost", cost: 10000, gradientClass: "bg-gradient-to-b from-[#082a3a] via-[#02131c] to-[#000204]" }
];
