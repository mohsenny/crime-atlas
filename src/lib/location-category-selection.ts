type CategorySelectionOption = {
  value: string;
  label: string;
  shortLabel?: string;
  isDefault?: boolean;
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function findAllOffensesCategorySlug(categories: CategorySelectionOption[]) {
  return (
    categories.find(
      (category) => category.label === "All recorded offenses" || category.shortLabel === "All offenses",
    )?.value ?? null
  );
}

export function getDefaultLocationCategorySlugs(categories: CategorySelectionOption[]) {
  const allOffensesCategorySlug = findAllOffensesCategorySlug(categories);

  if (allOffensesCategorySlug) {
    return [allOffensesCategorySlug];
  }

  const configuredDefaults = unique(
    categories.filter((category) => category.isDefault).map((category) => category.value),
  );

  if (configuredDefaults.length > 0) {
    return configuredDefaults;
  }

  return unique(categories.slice(0, 1).map((category) => category.value));
}

export function normalizeLocationCategorySlugs(
  categories: CategorySelectionOption[],
  requestedCategorySlugs: string[],
) {
  const validCategorySlugs = new Set(categories.map((category) => category.value));
  const allOffensesCategorySlug = findAllOffensesCategorySlug(categories);
  const requested = unique(requestedCategorySlugs.filter((slug) => validCategorySlugs.has(slug)));

  if (allOffensesCategorySlug && requested.includes(allOffensesCategorySlug)) {
    return [allOffensesCategorySlug];
  }

  const nextSelection = allOffensesCategorySlug
    ? requested.filter((slug) => slug !== allOffensesCategorySlug)
    : requested;

  return nextSelection.length > 0 ? nextSelection : getDefaultLocationCategorySlugs(categories);
}