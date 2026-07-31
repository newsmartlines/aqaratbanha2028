export function formatPrice(
  price: number | string | null | undefined,
  suffix?: string,
): string {
  const n = Number(price);
  if (!price || isNaN(n) || n === 0) return "—";
  return `${n.toLocaleString("en-US")} ج.م${suffix ?? ""}`;
}

export function formatPriceRent(
  price: number | string | null | undefined,
  rentDuration?: string | null,
): string {
  const n = Number(price);
  if (!price || isNaN(n) || n === 0) return "—";
  const durationSuffix =
    rentDuration === "monthly"
      ? "/شهر"
      : rentDuration === "yearly"
        ? "/سنة"
        : rentDuration === "daily"
          ? "/يوم"
          : "";
  return `${n.toLocaleString("en-US")} ج.م${durationSuffix}`;
}

export function formatPriceShort(
  price: number | string | null | undefined,
): string {
  const n = Number(price);
  if (!price || isNaN(n) || n === 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} م ج.م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ألف ج.م`;
  return `${n.toLocaleString("en-US")} ج.م`;
}
