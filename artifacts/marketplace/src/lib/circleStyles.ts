/**
 * Shared Dubizzle-style circle style helper.
 * Used by PropertyMap (detail page) and MapSearchPage (search map).
 */

export const CIRCLE_COLOR = "#3B82F6";

/** Default radius in metres */
export const CIRCLE_RADIUS_DEFAULT = 100;
/** Hovered radius in metres */
export const CIRCLE_RADIUS_HOVER = 115;
/** Selected radius in metres */
export const CIRCLE_RADIUS_SELECTED = 130;

export interface CirclePathOptions {
  fillColor: string;
  fillOpacity: number;
  color: string;
  weight: number;
}

/** Returns Leaflet pathOptions for a circle based on interaction state. */
export function getCirclePathOptions(
  selected: boolean,
  hovered: boolean,
): CirclePathOptions {
  return {
    fillColor: CIRCLE_COLOR,
    fillOpacity: selected ? 0.35 : hovered ? 0.28 : 0.20,
    color: CIRCLE_COLOR,
    weight: selected ? 3 : 2,
  };
}

/** Returns the radius in metres based on interaction state. */
export function getCircleRadius(selected: boolean, hovered: boolean): number {
  if (selected) return CIRCLE_RADIUS_SELECTED;
  if (hovered) return CIRCLE_RADIUS_HOVER;
  return CIRCLE_RADIUS_DEFAULT;
}
