import { useColorScheme } from "react-native";
import { generateColorVariants } from "../utils/colorUtils";

const baseColors = {
  primary: "#072d69",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  background: "#FFFFFF",
  card: "#F3F4F6",
  text: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
};

const palette = {
  light: {
    primary: "#3B82F6",
    success: "#22C55E",
    danger: "#EF4444",
    warning: "#F59E0B",
    background: "#FFFFFF",
    card: "#eeeeee",
    text: "#000000",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
    borderSecondary: "#E2E8F0",
    tint: "#3B82F6",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#3B82F6",
    placeholder: "#9CA3AF",
    placeholderSecondary: "#D1D5DB",
    placeholderTertiary: "#E5E7EB",
    headerBg: "#FFFFFF",
    headerBorder: "#E5E7EB",
    bubbleMine: "#3B82F6",
    bubbleOther: "#F3F4F6",
    textMine: "#FFFFFF",
    textOther: "#111827",
    timestamp: "#6B7280",
    online: "#22C55E",
    offline: "#9CA3AF",
    inputBg: "#F9FAFB",
    inputBorder: "#E5E7EB",
    sendActive: "#3B82F6",
    sendInactive: "#D1D5DB",
    dateSeparatorBg: "#F3F4F6",
    dateSeparatorText: "#6B7280",
  },
  dark: {
    primary: "#0073FF",
    success: "#22C55E",
    danger: "#EF4444",
    warning: "#FBBF24",
    background: "#000000",
    card: "#181818",
    text: "#FFFFFF",
    textSecondary: "#94A3B8",
    border: "#334155",
    borderSecondary: "#1E293B",
    tint: "#FFFFFF",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#3B82F6",
    placeholder: "#6B7078",
    placeholderSecondary: "#4B5563",
    placeholderTertiary: "#374151",
    headerBg: "#191C14",
    headerBorder: "#22262E",
    bubbleMine: "#0A84FF",
    bubbleOther: "#1E2228",
    textMine: "#FFFFFF",
    textOther: "#E7E9EC",
    timestamp: "#8A8F98",
    online: "#008d1f",
    offline: "#8A8F98",
    inputBg: "#1E2228",
    inputBorder: "#2A2E36",
    sendActive: "#0A84FF",
    sendInactive: "#2A2E36",
    dateSeparatorBg: "#1A1D22",
    dateSeparatorText: "#8A8F98",
  },
};

export function useAppColors() {
  const scheme = useColorScheme();

  return {
    theme: scheme ?? "light",
    colors: palette[scheme ?? "light"],
  };
}

export function useAutoColors() {
  const scheme = useColorScheme() ?? "light";

  const colors = Object.fromEntries(
    Object.entries(baseColors).map(([key, hex]) => {
      const variants = generateColorVariants(hex);
      return [key, scheme === "dark" ? variants.dark : variants.light];
    }),
  );

  return { theme: scheme, colors };
}
