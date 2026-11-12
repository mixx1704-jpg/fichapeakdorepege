import type { Perk } from "./data";

export type CatalogEffect = "all" | "steps" | "accuracy" | "dodge" | "rd" | "special";
export type CatalogSort = "level" | "name" | "cost-asc" | "cost-desc" | "steps" | "steps-percent" | "accuracy" | "accuracy-percent" | "dodge" | "dodge-percent" | "rd" | "rd-percent";
export type CatalogActivation = "all" | "passive" | "conditional";
export type CatalogEntry = { id: string; name: string; description: string; useType?: string; type?: string; requirement?: string; cost: number | number[]; minGrade?: number; grade?: number; sourceId?: string };

export const catalogEffectOptions: [CatalogEffect, string][] = [["all", "Todos os efeitos"], ["steps", "Passos de dano"], ["accuracy", "Acerto"], ["dodge", "Desvio / esquiva"], ["rd", "Redução de dano (RD)"], ["special", "Propriedade especial"]];
export const catalogSortOptions: [CatalogSort, string][] = [["level", "Level e nome"], ["name", "Nome A–Z"], ["cost-asc", "Menor custo em PE"], ["cost-desc", "Maior custo em PE"], ["steps", "Maior ganho de passos fixos"], ["steps-percent", "Maior ganho de passos (%)"], ["accuracy", "Maior ganho de acerto fixo"], ["accuracy-percent", "Maior ganho de acerto (%)"], ["dodge", "Maior ganho de desvio fixo"], ["dodge-percent", "Maior ganho de desvio (%)"], ["rd", "Maior ganho de RD fixa"], ["rd-percent", "Maior ganho de RD (%)"]];

export function isConditionalCatalogEntry(item: CatalogEntry): boolean {
  const usage = normalizeCatalogSearch(item.useType || item.type || "");
  const text = normalizeCatalogSearch(item.description);
  return /ativa|ativavel|condicion|gatilho/.test(usage) || /\b(ao |apos |enquanto |quando |se |antes de |uma vez por |por turno|por rodada|ativar|ativacao|sacrific)/.test(text);
}

const metricWords = { steps: "passos?(?: de dano)?", accuracy: "acertos?", dodge: "(?:desvio|esquiva)", rd: "(?:rd|reducao de dano)" };

function catalogMetricText(description: string) {
  return normalizeCatalogSearch(description).replace(/[−–]/g, "-")
    // Illustrative scenarios describe one possible outcome rather than a purchased gain.
    .replace(/\b(?:por exemplo|exemplos?|como exemplo)\s*:?(?:[^.\n]|\.(?=\d))*(?:\.(?!\d)|$)/g, " ")
    .replace(/(?:^|[.;\n])\s*com\s+\d+\s+(?:tentaculos|partes)\s*,(?:[^.\n]|\.(?=\d))*/g, " ")
    // Defensive accuracy belongs to its defense, not the offensive accuracy column.
    .replace(/acertos?\s+(?:adicionais?\s+|aditivos?\s+)?(?:de\s+|(?:em|nos?)\s+(?:testes?\s+(?:de\s+)?)?)(desvio|esquiva|bloqueio)/g, "$1");
}

function isPositiveCatalogGain(text: string, index: number) {
  const preceding = text.slice(Math.max(0, index - 160), index).split(/[.;\n]/).at(-1) || "";
  const directions = [...preceding.matchAll(/\b(recebe|recebem|ganha|ganham|concede|concedem|soma|adiciona|aumenta|recupera|perde|perdem|reduz|reduzem|sofre|sofrem|penalidade)\b/g)];
  const latest = directions.at(-1);
  if (latest && /^(?:perde|perdem|reduz|reduzem|sofre|sofrem|penalidade)$/.test(latest[1])) return false;
  return !/(?:inimigo|adversario|alvo)\s+(?:recebe|ganha)\s*$/.test(preceding);
}

/** Largest explicitly written positive bonus, per purchase. Percentages stay separate from flat values. */
export function catalogGain(item: CatalogEntry, metric: CatalogSort): number {
  const key = metric.replace("-percent", "") as keyof typeof metricWords;
  if (!(key in metricWords)) return 0;
  const percent = metric.endsWith("-percent");
  const text = catalogMetricText(item.description);
  const words = metricWords[key];
  const unit = percent ? "\\s*%" : "(?![\\d.,]|\\s*%)";
  const before = new RegExp(`\\+\\s*(\\d+(?:[.,]\\d+)?)${unit}\\s*(?:de |(?:em|nos?) (?:testes? (?:de )?)?|sobre (?:os |seus |seus valores totais de )?)?(?:${words})`, "g");
  const after = new RegExp(`(?:${words})\\s*(?::|de)?\\s*\\+\\s*(\\d+(?:[.,]\\d+)?)${unit}`, "g");
  const values = [...text.matchAll(before), ...text.matchAll(after)].filter(match => isPositiveCatalogGain(text, match.index || 0)).map(match => Number(match[1].replace(",", ".")));
  // Compact descriptions such as “+15 Acerto & Desvio & Bloqueio” share one explicit value.
  for (const match of text.matchAll(/\+\s*(\d+(?:[.,]\d+)?)(\s*%)?\s*([^+.;\n]+)/g)) {
    if (Boolean(match[2]) !== percent) continue;
    if (!isPositiveCatalogGain(text, match.index || 0)) continue;
    if (new RegExp(`^(?:acertos?|desvio|esquiva|bloqueio|passos?(?: de dano)?|rd)(?:\\s*(?:&|e|/)\\s*(?:acertos?|desvio|esquiva|bloqueio|passos?(?: de dano)?|rd))*`).test(match[3])) {
      const chain = match[3].match(/^(?:acertos?|desvio|esquiva|bloqueio|passos?(?: de dano)?|rd)(?:\s*(?:&|e|\/)\s*(?:acertos?|desvio|esquiva|bloqueio|passos?(?: de dano)?|rd))*/)?.[0] || "";
      if (new RegExp(`\\b${words}\\b`).test(chain)) values.push(Number(match[1].replace(",", ".")));
    }
  }
  return Math.max(0, ...values);
}

export function catalogHasEffect(item: CatalogEntry, effect: CatalogEffect): boolean {
  if (effect === "all") return true;
  const text = catalogMetricText(`${item.useType || ""} ${item.type || ""} ${item.name} ${item.description}`);
  if (effect === "special") return /propriedade|efeito especial|habilidade especial|veneno|sangramento|penetracao|ignora.{0,15}rd|paralis|imobiliz|regenera|invisib|teleport|supressao|suprim/.test(text);
  return new RegExp(`\\b${metricWords[effect]}\\b`).test(text);
}

export interface CatalogQualityFilters {
  effect?: CatalogEffect;
  activation?: CatalogActivation;
  sort?: CatalogSort;
  price?: (item: CatalogEntry) => number;
}

export function filterCatalogQuality<T extends CatalogEntry>(items: readonly T[], filters: CatalogQualityFilters = {}): T[] {
  const result = items.filter(item => catalogHasEffect(item, filters.effect || "all") && (!filters.activation || filters.activation === "all" || isConditionalCatalogEntry(item) === (filters.activation === "conditional")));
  const sort = filters.sort || "level";
  const price = (item: T) => filters.price?.(item) ?? (Array.isArray(item.cost) ? item.cost[0] || 0 : item.cost);
  return result.sort((a, b) => {
    const metric = ["steps", "steps-percent", "accuracy", "accuracy-percent", "dodge", "dodge-percent", "rd", "rd-percent"].includes(sort);
    const order = metric ? catalogGain(b, sort) - catalogGain(a, sort) : sort === "cost-asc" ? price(a) - price(b) : sort === "cost-desc" ? price(b) - price(a) : sort === "name" ? 0 : Math.max(1, a.minGrade || a.grade || 1) - Math.max(1, b.minGrade || b.grade || 1);
    return order || a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }) || a.id.localeCompare(b.id);
  });
}

export interface PerkCatalogFilters extends CatalogQualityFilters {
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
  const filtered = items.filter((item) => {
    if (filters.ownedOnly && !filters.isOwned?.(item)) return false;
    if (filters.availableOnly && !filters.isAvailable?.(item)) return false;
    if (category !== "todas" && category !== "todos"
      && normalizeCatalogSearch(item.category) !== category
      && normalizeCatalogSearch(item.organGroup || "") !== category) return false;
    if (!query) return true;
    return normalizeCatalogSearch(`${item.id} ${item.sourceId || ""} ${item.category} ${item.organGroup || ""} ${item.name} ${item.description} ${item.requirement || ""}`).includes(query);
  });
  if (filters.effect || filters.activation || filters.sort) return filterCatalogQuality(filtered, filters);
  return filtered.sort((left, right) =>
    Math.max(1, left.minGrade || 1) - Math.max(1, right.minGrade || 1)
    || left.category.localeCompare(right.category, "pt-BR", { sensitivity: "base" })
    || left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" })
    || left.id.localeCompare(right.id));
}
