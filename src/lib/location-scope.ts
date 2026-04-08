import type { Route } from "next";

export type LocationScope = "city" | "country";

export const DEFAULT_LOCATION_SCOPE: LocationScope = "city";

export function isLocationScope(value: string | null | undefined): value is LocationScope {
  return value === "city" || value === "country";
}

export function getScopeLabel(
  scope: LocationScope,
  options: {
    plural?: boolean;
    capitalized?: boolean;
  } = {},
) {
  const { plural = false, capitalized = false } = options;
  const label = scope === "country" ? (plural ? "countries" : "country") : plural ? "cities" : "city";

  if (!capitalized) {
    return label;
  }

  return `${label.slice(0, 1).toUpperCase()}${label.slice(1)}`;
}

export function buildOverviewHref(scope: LocationScope): Route {
  return (scope === DEFAULT_LOCATION_SCOPE ? "/" : `/?scope=${scope}`) as Route;
}