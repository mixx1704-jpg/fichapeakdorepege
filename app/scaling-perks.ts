import type { AttributeKey, KaguneFamily, Perk, SpeciesId } from "./data";
import { endgameProperties } from './endgame-properties';

/** Each percentage uses the same unmodified subtotal, once; bonuses never compound. */
export const SCALING_PERCENT_CAP = 75;
export const PENETRATION_PERCENT_CAP = 50;
export const scalingStats = ["life", "sanity", "rc", "rd", "physicalHit", "kaguneHit", "block", "dodge", "physicalSteps", "kaguneSteps", "physicalDamage", "kaguneDamage"] as const;
export type ScalingStat = typeof scalingStats[number];
export type ScalingBase = Partial<Record<ScalingStat, number>>;
export type ScalingValues = Record<ScalingStat, number>;
export interface ScalingContext {
  perks: Record<string, { rank: number }>;
  attributes: Record<AttributeKey, number>;
  weaponActive: boolean;
  level?: number;
  species?: SpeciesId;
  kaguneTypes?: KaguneFamily[];
  weaponKind?: "kagune" | "quinque" | "arata" | "none" | string;
  quinque?: boolean;
  hasRC?: boolean;
}
interface ScalingDefinition {
  perk: Perk;
  percentages?: ScalingBase;
  penetrationPercent?: number;
  weaponOnly?: boolean;
}
const statLabels: Record<ScalingStat, string> = {
  life: "Vida máxima", sanity: "Sanidade máxima", rc: "RC máximo", rd: "RD",
  physicalHit: "acertos em ataques físicos", kaguneHit: "acertos de Kagune/Quinque",
  block: "acertos de Bloqueio", dodge: "acertos de Desvio",
  physicalSteps: "Passos de Dano físico", kaguneSteps: "Passos de Dano de Kagune/Quinque",
  physicalDamage: "dano fixo físico", kaguneDamage: "dano fixo de Kagune/Quinque",
};
const definitions: ScalingDefinition[] = [];
function addPercentage(id: string, name: string, level: number, cost: number, percentages: ScalingBase, options: Partial<Perk> = {}, weaponOnly = false) {
  const effects = Object.entries(percentages).map(([stat, percent]) => `+${percent}% de ${statLabels[stat as ScalingStat]}`).join("; ");
  definitions.push({
    percentages, weaponOnly,
    perk: {
      id: `r26-escala-${id}`, name, minGrade: level, cost, maxRank: 1,
      category: "Genérica", sourceId: "REWORK 2026", supplement: true,
      useType: "Passiva · automática", equipmentCompatible: false,
      description: `${weaponOnly ? "Com a Kagune/Quinque em uso: " : ""}${effects}. Percentuais da mesma grandeza somam até 75%, sobre o subtotal sem estas perks; o bônus é calculado uma única vez, arredondado para baixo.`,
      requirement: `LEVEL ${level}+`, ...options,
    },
  });
}

addPercentage("massa-vital", "Massa Vital", 2, 5, { life: 15 }, { category: "Vigor" });
addPercentage("corpo-expansivo", "Corpo Expansivo", 10, 14, { life: 25 }, { category: "Vigor" });
addPercentage("armadura-organica", "Armadura Orgânica", 3, 7, { rd: 15 }, { category: "Combate", equipmentCompatible: true });
addPercentage("muralha-crescente", "Muralha Crescente", 12, 18, { rd: 30 }, { category: "Combate", equipmentCompatible: true });
addPercentage("mente-profunda", "Mente Profunda", 2, 5, { sanity: 20 }, { category: "Controle" });
addPercentage("reserva-mental", "Reserva Mental", 11, 12, { sanity: 30 }, { category: "Controle" });
addPercentage("reservatorio-rc", "Reservatório RC", 3, 6, { rc: 20 }, { requiresRC: true, location: "kakuhou", equipmentCompatible: true });
addPercentage("coracao-rc", "Coração RC", 13, 17, { rc: 30 }, { requiresRC: true, location: "kakuhou", equipmentCompatible: true });
addPercentage("acuracia-progressiva", "Acurácia Progressiva", 5, 9, { physicalHit: 10, kaguneHit: 10 }, { category: "Combate", equipmentCompatible: true });
addPercentage("potencia-continua", "Potência Contínua", 7, 11, { physicalSteps: 15, kaguneSteps: 15 }, { category: "Combate", equipmentCompatible: true });
addPercentage("defesa-adaptativa", "Defesa Adaptativa", 8, 12, { block: 15, dodge: 15 }, { category: "Combate", equipmentCompatible: true });
addPercentage("pico-predatorio", "Pico Predatório", 18, 35, { physicalSteps: 25, kaguneSteps: 25, physicalHit: 15, kaguneHit: 15 }, { category: "Combate", equipmentCompatible: true });

const penetrationRows: [string, string, number, number, number][] = [
  ["ponta-invasiva", "Ponta Invasiva", 2, 6, 10],
  ["fio-antiblindagem", "Fio Antiblindagem", 4, 8, 15],
  ["corte-de-junta", "Corte de Junta", 7, 11, 20],
  ["fenda-profunda", "Fenda Profunda", 10, 15, 25],
  ["ruptura-controlada", "Ruptura Controlada", 14, 22, 35],
  ["cerco-perfeito", "Cerco Perfeito", 18, 35, 50],
];
for (const [id, name, level, cost, percent] of penetrationRows) definitions.push({
  penetrationPercent: percent,
  perk: {
    id: `r26-penetracao-${id}`, name, minGrade: level, cost, maxRank: 1,
    category: "Combate", sourceId: "REWORK 2026", supplement: true, equipmentCompatible: true,
    useType: "Passiva · calculadora de ataque", requirement: `LEVEL ${level}+`,
    description: `Ataques físicos e de Kagune/Quinque ignoram ${percent}% da RD do alvo. Use somente a maior fonte de penetração, limitada a 50%. RD ignorada = piso(RD do alvo × ${percent}/100); a RD restante ainda protege normalmente. A calculadora mostra RD restante e dano final.`,
  },
});

const poisonRows: [string, string, number, number, string][] = [
  ["inoculacao", "Inoculação Tóxica", 1, 5, "Libera veneno tóxico: ao final de cada turno do alvo, dano bruto = piso(3% da Vida máxima do alvo × cargas); subtraia piso(RD do alvo/2), mínimo 0. Até 3 cargas por 3 turnos. Uma dose aceita acrescenta 1 carga e renova o tempo."],
  ["concentrado", "Veneno Concentrado", 4, 8, "A potência do veneno tóxico passa de 3% para 4% da Vida máxima do alvo por carga e por turno. O teto permanece 16% da Vida máxima por turno, antes da mitigação."],
  ["persistente", "Veneno Persistente", 6, 10, "O veneno dura +2 turnos: 5 turnos ao receber uma dose aceita. A duração é renovada, nunca somada indefinidamente."],
  ["acumulativo", "Veneno Acumulativo", 8, 12, "O limite de veneno sobe em +1 carga, para 4. Cada dose aceita acrescenta uma carga até o limite; o dano tóxico bruto não ultrapassa 16% da Vida máxima por turno."],
  ["corrosivo", "Veneno Corrosivo", 12, 18, "Libera o tipo corrosivo: sem dano direto, reduz 5% da RD do alvo por carga, até 20%, enquanto durar. Usa a maior fonte de penetração/redução percentual de RD, com teto global de 50%; não soma percentuais em cascata."],
  ["paralisante", "Veneno Neurotóxico", 15, 22, "Libera o tipo neurotóxico: sem dano direto, impõe −mínimo(10, piso(Controle do aplicador/3) × cargas) acertos em ataques e Desvio até expirar. Não remove ações ou reações."],
];
export const poisonPerks: Perk[] = poisonRows.map(([id, name, level, cost, effect]) => ({
  id: `r26-veneno-${id}`, name, minGrade: level, cost, maxRank: 1, category: "Combate",
  sourceId: "REWORK 2026", supplement: true, location: "kakuhou", requiresRC: true,
  equipmentCompatible: true, useType: "Ativa · calculadora de veneno",
  requiredPerk: id === "inoculacao" ? undefined : "r26-veneno-inoculacao",
  requirement: `LEVEL ${level}+ · Kagune/Quinque em uso${id === "inoculacao" ? "" : " · Inoculação Tóxica"}`,
  description: `${effect} A calculadora registra cargas e turnos e gera texto para copiar. Um único tipo de veneno por alvo. Resistência do alvo: 1d20 + Vigor + Controle contra CD 15 + Controle do aplicador; sucesso impede a nova dose, sem remover a anterior. Arredonde todos os resultados para baixo.`,
}));

export const colossusPerk: Perk = {
  id: "r26-colosso-carne", name: "Colosso de Carne", cost: 15, minGrade: 1, maxRank: 1,
  category: "Combate", sourceId: "REWORK 2026", supplement: true, location: "vantagens",
  requiredWeapon: "kagune", equipmentCompatible: false,
  useType: "Ativa · união de partes", requirement: "LEVEL 1+ · Kagune com partes extras",
  description: "Una todas as partes em uma única grande Kagune. Para N partes, sacrifique N − 1 extras; pares = piso((N − 1)/2). Perca 1 acerto em testes de Agilidade por par, ganhe +1 metro de alcance base e +1 acerto de Kagune por par. A parte unida recebe piso(soma da Dureza de todas as partes/2), piso(soma da RD de todas as partes/2) e a soma do dano de todas as partes unidas. Bônus gerais de personagem entram uma única vez no ataque unido; o dano próprio e os efeitos específicos das partes continuam somando. A ficha permite ativar, conferir os totais e copiar o ataque; ao desfazer, as partes e a mobilidade originais retornam.",
};

export const scalingPerks: Perk[] = [...definitions.map(({ perk }) => perk), ...poisonPerks];

function isEligible(definition: ScalingDefinition, context: ScalingContext): boolean {
  const { perk, weaponOnly } = definition;
  if (Math.floor(context.perks[perk.id]?.rank || 0) <= 0) return false;
  if ((context.level ?? 1) < (perk.minGrade ?? 1)) return false;
  if (weaponOnly && !context.weaponActive) return false;
  if (weaponOnly && context.weaponKind !== undefined && !["kagune", "quinque"].includes(context.weaponKind)) return false;
  if (context.quinque && !perk.equipmentCompatible) return false;
  if (perk.requiredWeapon && perk.requiredWeapon !== context.weaponKind) return false;
  if (perk.requiresRC && context.hasRC === false) return false;
  if (perk.species && (!context.species || !perk.species.includes(context.species))) return false;
  if (perk.kaguneTypes?.some(family => !context.kaguneTypes?.includes(family))) return false;
  if (perk.attribute && (context.attributes[perk.attribute] || 0) < (perk.min || 0)) return false;
  if (Object.entries(perk.requirements || {}).some(([attribute, min]) => (context.attributes[attribute as AttributeKey] || 0) < Number(min))) return false;
  if (perk.requiredPerk) {
    const prerequisite = [...definitions.map(({ perk: item }) => item), ...poisonPerks].find(item => item.id === perk.requiredPerk);
    if (!prerequisite || prerequisite.requiredPerk || Math.floor(context.perks[prerequisite.id]?.rank || 0) <= 0) return false;
    if (!isEligible({ perk: prerequisite, weaponOnly: prerequisite.location === "kakuhou" }, context)) return false;
  }
  return true;
}
/** Shared by the attack and poison calculators so dormant/underlevel purchases stay inactive. */
export function isScalingPerkActive(id: string, context: ScalingContext): boolean {
  const definition = definitions.find(({ perk }) => perk.id === id);
  if (definition) return isEligible(definition, context);
  const poison = poisonPerks.find(perk => perk.id === id);
  if (poison) return isEligible({ perk: poison, weaponOnly: true }, context);
  if (id === colossusPerk.id) return isEligible({ perk: colossusPerk, weaponOnly: true }, context);
  return false;
}
function emptyValues(): ScalingValues {
  return Object.fromEntries(scalingStats.map(stat => [stat, 0])) as ScalingValues;
}
function nonnegativeInteger(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
}
export function scalingIncrease(stat: ScalingStat, subtotal: number, percentages: ScalingBase): number {
  const percent = Math.min(SCALING_PERCENT_CAP, nonnegativeInteger(percentages[stat]));
  return Math.floor(nonnegativeInteger(subtotal) * percent / 100);
}
export function calculateScalingBonuses(context: ScalingContext, base: ScalingBase) {
  const percentages = emptyValues();
  const bonuses = emptyValues();
  const totals = emptyValues();
  const activePerkIds: string[] = [];
  let penetrationPercent = 0;
  for (const definition of definitions) {
    if (!isEligible(definition, context)) continue;
    activePerkIds.push(definition.perk.id);
    for (const [stat, percent] of Object.entries(definition.percentages || {})) {
      const key = stat as ScalingStat;
      percentages[key] = Math.min(SCALING_PERCENT_CAP, percentages[key] + nonnegativeInteger(percent));
    }
    penetrationPercent = Math.min(PENETRATION_PERCENT_CAP, Math.max(penetrationPercent, definition.penetrationPercent || 0));
  }
  for(const [id,property] of Object.entries(endgameProperties)){
    if((context.level||1)<20||Math.floor(context.perks[id]?.rank||0)<=0)continue;
    // Body resources cannot be inherited by independent weapons.
    if(context.quinque && id!=='r26-exp-geral-coroa-da-devastacao')continue;
    activePerkIds.push(id);
    for(const [stat,percent] of Object.entries(property.percentages)){
      const key=stat as ScalingStat;
      percentages[key]=Math.min(SCALING_PERCENT_CAP,percentages[key]+nonnegativeInteger(percent));
    }
  }
  for (const stat of scalingStats) {
    const subtotal = nonnegativeInteger(base[stat]);
    bonuses[stat] = scalingIncrease(stat, subtotal, percentages);
    totals[stat] = subtotal + bonuses[stat];
  }
  return { bonuses, percentages, totals, penetrationPercent, activePerkIds };
}
export function calculatePenetration(context: ScalingContext): number {
  return calculateScalingBonuses(context, {}).penetrationPercent;
}
/** RD is removed once from the original target value, never from an already reduced value. */
export function applyPartialPenetration(rawDamage: number, targetRD: number, penetrationPercent: number) {
  const damage = nonnegativeInteger(rawDamage);
  const rd = nonnegativeInteger(targetRD);
  const percentage = Math.min(PENETRATION_PERCENT_CAP, nonnegativeInteger(penetrationPercent));
  const ignoredRD = Math.floor(rd * percentage / 100);
  const remainingRD = rd - ignoredRD;
  return { rawDamage: damage, targetRD: rd, penetrationPercent: percentage, ignoredRD, remainingRD, damage: Math.max(0, damage - remainingRD) };
}
