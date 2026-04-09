type CategorySelectionOption = {
  value: string;
  label: string;
  shortLabel?: string;
  isDefault?: boolean;
};

type ExclusiveFamily = {
  parentSlug: string;
  childSlugs: string[];
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeCategoryText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesAnyText(category: CategorySelectionOption, candidates: string[]) {
  const haystacks = [category.label, category.shortLabel ?? ""].map(normalizeCategoryText);
  return candidates.some((candidate) => {
    const needle = normalizeCategoryText(candidate);
    return haystacks.some((haystack) => haystack === needle);
  });
}

function buildExclusiveCategoryFamilies(categories: CategorySelectionOption[]): ExclusiveFamily[] {
  const familySpecs = [
    {
      parentLabels: ["All theft"],
      childMatcher: (category: CategorySelectionOption) =>
        matchesAnyText(category, [
          "Theft",
          "Other theft",
          "Bicycle theft",
          "Bike theft",
          "Motor vehicle theft",
          "Vehicle theft",
          "Theft from vehicles",
          "From vehicles",
          "Residential burglary",
          "Burglary",
          "Shoplifting",
          "Larceny",
        ]),
    },
    {
      parentLabels: ["All assaults"],
      childMatcher: (category: CategorySelectionOption) =>
        matchesAnyText(category, [
          "Assault",
          "Aggravated assault",
          "Simple assault",
          "Battery",
        ]),
    },
    {
      parentLabels: ["All arson", "All arson-related offenses"],
      childMatcher: (category: CategorySelectionOption) =>
        matchesAnyText(category, [
          "Arson",
        ]),
    },
    {
      parentLabels: ["All damage", "All criminal damage"],
      childMatcher: (category: CategorySelectionOption) =>
        matchesAnyText(category, [
          "Criminal damage",
          "Graffiti damage",
          "Graffiti",
          "Vandalism",
        ]),
    },
  ] satisfies Array<{
    parentLabels: string[];
    childMatcher: (category: CategorySelectionOption) => boolean;
  }>;

  return familySpecs
    .map((spec) => {
      const parent = categories.find((category) => matchesAnyText(category, spec.parentLabels));
      if (!parent) {
        return null;
      }

      const childSlugs = categories
        .filter((category) => category.value !== parent.value && spec.childMatcher(category))
        .map((category) => category.value);

      if (childSlugs.length === 0) {
        return null;
      }

      return {
        parentSlug: parent.value,
        childSlugs,
      } satisfies ExclusiveFamily;
    })
    .filter((family): family is ExclusiveFamily => family !== null);
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
  const exclusiveFamilies = buildExclusiveCategoryFamilies(categories);
  const requested = unique(requestedCategorySlugs.filter((slug) => validCategorySlugs.has(slug)));

  if (allOffensesCategorySlug && requested.includes(allOffensesCategorySlug)) {
    return [allOffensesCategorySlug];
  }

  let nextSelection = allOffensesCategorySlug
    ? requested.filter((slug) => slug !== allOffensesCategorySlug)
    : requested;

  for (const family of exclusiveFamilies) {
    const childSlugSet = new Set(family.childSlugs);
    const parentSelected = nextSelection.includes(family.parentSlug);
    const anyChildSelected = nextSelection.some((slug) => childSlugSet.has(slug));

    if (parentSelected) {
      nextSelection = nextSelection.filter((slug) => !childSlugSet.has(slug));
      continue;
    }

    if (anyChildSelected) {
      nextSelection = nextSelection.filter((slug) => slug !== family.parentSlug);
    }
  }

  return nextSelection.length > 0 ? nextSelection : getDefaultLocationCategorySlugs(categories);
}
