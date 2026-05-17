import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const FONTS_LOADED = new Set<string>();

export function loadGoogleFont(family: string) {
  if (!family || family === "Tajawal" || FONTS_LOADED.has(family)) return;
  FONTS_LOADED.add(family);
  const existing = document.querySelector(`link[data-gfont="${family}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.gfont = family;
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function applyThemeToRoot(settings: Record<string, string>) {
  const root = document.documentElement;

  if (settings.primaryColorHsl) {
    root.style.setProperty("--primary", settings.primaryColorHsl);
    root.style.setProperty("--ring", settings.primaryColorHsl);
    root.style.setProperty("--sidebar-primary", settings.primaryColorHsl);
    root.style.setProperty("--sidebar-ring", settings.primaryColorHsl);
    root.style.setProperty("--chart-1", settings.primaryColorHsl);
  }
  if (settings.secondaryColorHsl) {
    root.style.setProperty("--secondary", settings.secondaryColorHsl);
    root.style.setProperty("--sidebar-accent", settings.secondaryColorHsl);
    root.style.setProperty("--chart-2", settings.secondaryColorHsl);
  }
  if (settings.accentColorHsl) {
    root.style.setProperty("--accent", settings.accentColorHsl);
    root.style.setProperty("--chart-3", settings.accentColorHsl);
  }
  if (settings.fontFamily) {
    loadGoogleFont(settings.fontFamily);
    root.style.setProperty("--app-font-sans", `'${settings.fontFamily}', sans-serif`);
  }
  if (settings.borderRadius) {
    root.style.setProperty("--radius", settings.borderRadius);
  }
}

export function ThemeProvider() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settings) return;
    applyThemeToRoot(settings as unknown as Record<string, string>);
  }, [settings]);

  return null;
}
