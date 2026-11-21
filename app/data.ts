import { perkCatalog } from './perk-catalog';
import { archetypeDefinitions } from "./archetype";
import { combatManeuvers } from "./expansion-data";

export { combatManeuvers };

export const attributeKeys = [
  "forca",
  "vigor",
  "precisao",
  "agilidade",
  "raciocinio",
  "percepcao",
  "presenca",
  "controle",
] as const;

export type AttributeKey = (typeof attributeKeys)[number];
export type KaguneFamily = "Ukaku" | "Koukaku" | "Rinkaku" | "Bikaku";

export const attributeLabels: Record<AttributeKey, string> = {
  forca: "Força",
  vigor: "Vigor",
  precisao: "Precisão",
  agilidade: "Agilidade",
  raciocinio: "Raciocínio",
  percepcao: "Percepção",
  presenca: "Presença",
  controle: "Controle",
};

export const physicalAttributes: AttributeKey[] = ["forca", "vigor", "precisao", "agilidade"];
export const mentalAttributes: AttributeKey[] = ["raciocinio", "percepcao", "presenca", "controle"];

export const attributeDescriptions: Record<AttributeKey, string> = {
  forca: "Impacto físico, carga, agarrões e golpes corpo a corpo.",
  vigor: "Fôlego, resistência, bloqueio, doenças e tolerância à dor.",
  precisao: "Mira, arremessos, armas e manipulação delicada.",
  agilidade: "Esquiva, velocidade, furtividade e acrobacia.",
  raciocinio: "Lógica, estratégia, improviso e análise.",
  percepcao: "Atenção, leitura de intenções e detalhes ocultos.",
  presenca: "Influência, intimidação, inspiração e carisma.",
  controle: "Fome, sanidade, foco e domínio dos impulsos.",
};

export const archetypes = archetypeDefinitions;

export const speciesOptions = [
  { id: "humano", label: "Humano", lifeBase: 1, cap: 11, creationGrant: 6, subCost: 0, hasKagune: false, hasHunger: false, summary: "+1 Vida por Level, +6 PE de criação, +1 Atributo Mental e uma rerrolagem por sessão." },
  { id: "ghoul", label: "Ghoul", lifeBase: 2, cap: 11, creationGrant: 0, subCost: 0, hasKagune: true, hasHunger: true, summary: "+2 Vida por Level, Kakuhou, Kagune, RC e Fome. Controle soma em ataque, bloqueio e esquiva." },
  { id: "humano-dominante", label: "Híbrido — Humano Dominante", lifeBase: 3, cap: 11, creationGrant: 6, subCost: 6, hasKagune: false, hasHunger: false, summary: "+3 Vida por Level, base humana, +2 em um Atributo Físico e 6 PE para efeitos passivos de Kakuhou." },
  { id: "ghoul-dominante", label: "Híbrido — Ghoul Dominante", lifeBase: 4, cap: 11, creationGrant: 0, subCost: 8, hasKagune: true, hasHunger: true, summary: "+4 Vida por Level, +1 em dois Atributos Físicos diferentes e efeitos de Kagune custam -3 PE (mínimo 1)." },
  { id: "ghoul-artificial", label: "Ghoul Artificial", lifeBase: 4, cap: 11, creationGrant: 6, subCost: 6, hasKagune: true, hasHunger: true, summary: "Base humana e Ghoul, +1 Mental, +1 Físico, +4 Vida por Level, Kakuhou, Kagune, RC e Fome. Pode usar a variação Humano-Dominante sem herdar suas fraquezas." },
  { id: "quinx", label: "Quinx", lifeBase: 2, cap: 11, creationGrant: 6, subCost: 6, hasKagune: true, hasHunger: false, summary: "+2 Vida por Level, Frame, Carga Instintiva e Kagune implantada." },
] as const;

export type SpeciesId = (typeof speciesOptions)[number]["id"];

export type CatalogCategory =
  | "Genérica"
  | "Força"
  | "Vigor"
  | "Precisão"
  | "Agilidade"
  | "Raciocínio"
  | "Percepção"
  | "Presença"
  | "Controle"
  | "Kagune Quimera"
  | "Híbrida"
  | "Combate";

export interface Perk {
  supplement?: boolean;
  sourceId?: string;
  sourcePage?: number;
  chapter?: number;
  useType?: string;
  location?: "vantagens" | "kakuhou";
  organGroup?: string;
  requiredWeapon?: "kagune" | "quinque" | "arata";
  equipmentCompatible?: boolean;
  requiresKakuja?: boolean;
  requiresRC?: boolean;
  id: string;
  name: string;
  category: CatalogCategory;
  cost: number | number[];
  costMode?: "choice" | "sum";
  description: string;
  requirement?: string;
  attribute?: AttributeKey;
  min?: number;
  species?: SpeciesId[];
  maxRank?: number;
  targetAttribute?: "physical" | "mental" | "any";
  requirements?: Partial<Record<AttributeKey, number>>;
  minGrade?: number;
  kaguneTypes?: KaguneFamily[];
  minKaguneTypes?: number;
  requiredEffect?: string;
  requiredEvolution?: string;
  requiredPerk?: string;
}

export const perks: Perk[] = perkCatalog.perks;

export interface Drawback {
  id: string;
  name: string;
  credit: number | number[];
  description: string;
  species?: SpeciesId[];
  targetAttribute?: boolean;
  maxRank?: number;
  uniqueTargets?: boolean;
  automation?: { custom?: import('./perk-catalog').CatalogAutomation['custom'] };
}

export const drawbacks: Drawback[] = perkCatalog.drawbacks;

export interface KaguneEffect {
  id: string;
  name: string;
  family: "Geral" | "Ukaku" | "Koukaku" | "Rinkaku" | "Bikaku";
  cost: number | number[];
  costMode?: "sum" | "choice";
  maxRank?: number;
  type: string;
  requirement?: string;
  description: string;
  targetAttribute?: boolean;
  rankCap?: "grade";
  repeatCost?: number;
  levelCostStart?: number;
  levelCostStep?: number;
  requiresEffects?: { id: string; minRank?: number }[];
  minPassiveEffects?: number;
  rdPerAdditionalRank?: number;
  grade?: number;
  mechanics?: import('./catalog-mechanics').CatalogMechanics;
  automation?: { custom?: import('./perk-catalog').CatalogAutomation['custom'] };
}

export const kaguneEffects: KaguneEffect[] = perkCatalog.kaguneEffects;

export interface Evolution {
  id: string;
  name: string;
  cost: number;
  grade: number;
  family: "Geral" | KaguneFamily | "Quimera";
  requirement?: string;
  description: string;
  kaguneTypes?: KaguneFamily[];
  minKaguneTypes?: number;
  maxRank?: number;
  rankCosts?: number[];
  rankGrades?: number[];
  attributeRequirements?: Partial<Record<AttributeKey, number>>;
  requiresEffects?: { id: string; minRank?: number }[];
  requiresEvolutions?: string[];
  requiresKakuja?: "incomplete" | "complete";
  requiresLowSanity?: boolean;
  narrativeRequirement?: string;
  mechanics?: import('./catalog-mechanics').CatalogMechanics;
  automation?: { custom?: import('./perk-catalog').CatalogAutomation['custom'] };
}

export const evolutions: Evolution[] = perkCatalog.evolutions;
