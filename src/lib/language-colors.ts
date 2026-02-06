export type LanguageGradientColors = { left: string; right: string };

// GitHub 常见语言颜色（用于图表等纯色场景）
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Vue: "#41b883",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Lua: "#000080",
  Scala: "#c22d40",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Clojure: "#db5855",
  Objective_C: "#438eff",
};

function getDeterministicHslColor(input: string): string {
  // 稳定的 fallback，避免颜色随渲染跳动
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function getLanguageColor(language: string | null): string {
  if (!language) return "hsl(220, 10%, 65%)";
  return LANGUAGE_COLORS[language] || getDeterministicHslColor(language);
}

// 基于编程语言的双色配色方案（与卡片渐变样式配套）
const LANGUAGE_GRADIENT_COLORS: Record<string, LanguageGradientColors> = {
  TypeScript: {
    left: "hsl(210 80% 55% / 0.5)",
    right: "hsl(220 60% 35% / 0.4)",
  },
  JavaScript: {
    left: "hsl(48 95% 55% / 0.5)",
    right: "hsl(20 85% 55% / 0.45)",
  },
  Python: { left: "hsl(210 60% 50% / 0.45)", right: "hsl(48 90% 55% / 0.45)" },
  Rust: { left: "hsl(25 55% 65% / 0.5)", right: "hsl(10 55% 35% / 0.45)" },
  Go: { left: "hsl(190 90% 45% / 0.5)", right: "hsl(195 70% 35% / 0.45)" },
  Java: { left: "hsl(30 70% 45% / 0.5)", right: "hsl(210 45% 50% / 0.45)" },
  "C++": { left: "hsl(340 65% 50% / 0.45)", right: "hsl(220 55% 50% / 0.45)" },
  C: { left: "hsl(220 55% 50% / 0.45)", right: "hsl(210 45% 40% / 0.4)" },
  Ruby: { left: "hsl(0 70% 50% / 0.45)", right: "hsl(350 55% 40% / 0.4)" },
  Swift: { left: "hsl(20 85% 55% / 0.5)", right: "hsl(350 70% 50% / 0.45)" },
  Kotlin: { left: "hsl(280 60% 55% / 0.45)", right: "hsl(25 85% 55% / 0.45)" },
  PHP: { left: "hsl(230 35% 55% / 0.45)", right: "hsl(260 40% 50% / 0.4)" },
  Vue: { left: "hsl(153 65% 45% / 0.5)", right: "hsl(165 55% 40% / 0.45)" },
  CSS: { left: "hsl(220 70% 55% / 0.45)", right: "hsl(264 65% 55% / 0.45)" },
  HTML: { left: "hsl(20 85% 55% / 0.5)", right: "hsl(350 70% 45% / 0.45)" },
  Shell: { left: "hsl(120 30% 45% / 0.45)", right: "hsl(100 25% 35% / 0.4)" },
};

const DEFAULT_GRADIENT: LanguageGradientColors = {
  left: "hsl(260 70% 60% / 0.45)",
  right: "hsl(190 70% 50% / 0.45)",
};

export function getLanguageColors(
  language: string | null,
): LanguageGradientColors {
  return LANGUAGE_GRADIENT_COLORS[language || ""] || DEFAULT_GRADIENT;
}
