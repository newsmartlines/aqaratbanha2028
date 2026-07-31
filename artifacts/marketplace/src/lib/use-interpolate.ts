import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { interpolate } from "@/lib/interpolate";

/**
 * Returns a function `ip(text)` that replaces {{variable}} placeholders
 * with live values from siteSettings (already cached by React Query).
 *
 * Usage:
 *   const ip = useInterpolate();
 *   <h1>{ip(heroTitle)}</h1>
 */
export function useInterpolate() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 60_000,
  });

  return useCallback(
    (text: string | undefined | null): string => {
      if (!text) return text ?? "";
      if (!settings) return text;
      return interpolate(text, settings as unknown as Record<string, string>);
    },
    [settings]
  );
}
