import type { Perk } from "./data";

export interface PerkCatalogFilters {
  query?: string;
  category?: string;
  ownedOnly?: boolean;
  availableOnly?: boolean;
  isOwned?: (item: Perk) => boolean;
  isAvailable?: (item: Perk) => boolean;
}

export const normalizeCatalogSearch = (text: string) => text
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .trim();

/** Every perk shares one catalog, including organ, equipment and chimera purchases. */
export function filterPerkCatalog(items: readonly Perk[], filters: PerkCatalogFilters = {}): Perk[] {
  const query = normalizeCatalogSearch(filters.query || "");
  const category = normalizeCatalogSearch(filters.category || "Todas");
  return items.filter((item) => {
    if (filters.ownedOnly && !filters.isOwned?.(item)) return false;
    if (filters.availableOnly && !filters.isAvailable?.(item)) return false;
    if (category !== "todas" && category !== "todos"
      && normalizeCatalogSearch(item.category) !== category
      && normalizeCatalogSearch(item.organGroup || "") !== category) return false;
    if (!query) return true;
    return normalizeCatalogSearch(`${item.id} ${item.sourceId || ""} ${item.category} ${item.organGroup || ""} ${item.name} ${item.description} ${item.requirement || ""}`).includes(query);
  }).sort((left, right) =>
    Math.max(1, left.minGrade || 1) - Math.max(1, right.minGrade || 1)
    || left.category.localeCompare(right.category, "pt-BR", { sensitivity: "base" })
    || left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" })
    || left.id.localeCompare(right.id));
}
