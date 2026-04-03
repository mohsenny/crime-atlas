export function normalizeSourceLabel(value: string) {
  return value
    .replace(/\n/g, " ")
    .replace(/([A-Za-zÄÖÜäöüß])-\s*([a-zäöüß])/g, "$1$2")
    .replace(/-\s+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
