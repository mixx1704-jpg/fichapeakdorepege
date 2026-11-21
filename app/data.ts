import { perkCatalog } from './perk-catalog';
import { archetypeDefinitions } from "./archetype";
import { combatManeuvers } from "./expansion-data";
import { reworkText } from "./rework-rules";

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

const ghoulSpecies: SpeciesId[] = ["ghoul", "ghoul-dominante", "ghoul-artificial"];
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
}

export const drawbacks: Drawback[] = [
  { id: "horrendo", name: "Horrendo", credit: [3, 4, 5], description: "Sua aparência provoca estranhamento, dúvida ou medo conforme o valor escolhido." },
  { id: "estigma-ghoul", name: "Estigma Ghoul", credit: 3, description: "Você tem fama de Ghoul e sofre -1 dado em testes sociais com desconhecidos.", species: ["humano", "humano-dominante", "ghoul-artificial", "quinx"] },
  { id: "fraqueza-extremos", name: "Fraqueza aos Extremos", credit: 3, description: "Escolha frio ou calor: sob a condição, -1 dado em todas as rolagens e +3 dano de ataques ligados ao extremo." },
  { id: "voices", name: "Voices, Voices, Voices, Voices!", credit: 5, description: "Trauma, vozes e visões permitem ao Narrador introduzir percepções que podem ou não ser reais." },
  { id: "kagune-eterna", name: "Kagune Eterna", credit: 5, description: "Você não consegue desenvolver Kakuja. Quinx não pode escolher.", species: ghoulSpecies },
  { id: "culpa-sobrevivente", name: "Culpa do Sobrevivente", credit: 5, description: "Quando um aliado chega a 0 PV, perca 1 Sanidade." },
  { id: "ghoul-sem-dentes", name: "Ghoul sem Dentes", credit: 6, description: "Você não consegue ativar a Kagune; os PE continuam mesmo se ela despertar depois.", species: ghoulSpecies },
  { id: "cheiro-sangue", name: "Cheiro de Sangue", credit: 3, description: "Seu cheiro denuncia que há algo errado para sentidos apurados." },
  { id: "corpo-exigente", name: "Corpo Exigente", credit: 3, description: "Você precisa de 2 PE de alimento para reduzir 1 ponto de Fome.", species: ghoulSpecies },
  { id: "marcado-medo", name: "Marcado pelo Medo", credit: 5, description: "Escolha um medo; diante dele, teste Controle para evitar consequências narrativas." },
  { id: "divida-sangue", name: "Dívida de Sangue", credit: 3, description: "Uma pessoa ou grupo cobra missões e deveres periódicos." },
  { id: "obcecado", name: "Obcecado", credit: 3, description: "Diante da obsessão, teste Raciocínio para não agir por impulso." },
  { id: "predador-seletivo", name: "Predador Seletivo", credit: 3, description: "Fora do tipo de presa escolhido, a alimentação reduz só 1 Fome, embora conceda PE normal.", species: ghoulSpecies },
  { id: "corpo-fragil", name: "Corpo Frágil", credit: 3, description: "Todos os golpes sofridos causam +2 Passos de Dano." },
  { id: "soca-fofo", name: "Soca Fofo", credit: 3, description: "Ataques físicos causam -2 Passos de Dano." },
  { id: "miseravel", name: "Miserável", credit: [3, 4, 5], description: "Dificuldade crescente de obter ou manter dinheiro." },
  { id: "desgarrado", name: "Desgarrado", credit: 3, description: "Você não possui moradia estável." },
  { id: "mente-fragil", name: "Mente Frágil", credit: 6, description: "Ganhe uma Mácula e reduza pela metade a Sanidade Máxima." },
  { id: "desabilidade", name: "Desabilidade", credit: 5, description: "Escolha um Atributo por compra: ele não pode passar de 4. Uma vez por Atributo.", targetAttribute: true, maxRank: attributeKeys.length, uniqueTargets: true },
];

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
}

export const evolutions: Evolution[] = perkCatalog.evolutions;

for (const item of drawbacks) {
  item.name = reworkText(item.name);
  item.description = reworkText(item.description);
}
