import type { AttributeKey, CatalogCategory, KaguneFamily, Perk, SpeciesId } from "./data";
import { genericExpansionRows } from "./rework-generic-expansion";
import { colossusPerk, scalingPerks } from "./scaling-perks";
import { damageStepRows } from "./damage-step-perks";
import { healingPerks } from "./healing";
import { criticalPerks } from "./critical";
import { TACTICAL_PERK_DEFINITIONS, tacticalCapstones } from "./tactical";
import { normalizePerkPurchases } from "./perk-migrations";
import { endgameProperties } from "./endgame-properties";

/** Numeric effects are the source of truth for both the card and the calculation. */
export interface ReworkBonuses {
  physicalHit: number;
  kaguneHit: number;
  block: number;
  dodge: number;
  physicalSteps: number;
  kaguneSteps: number;
  physicalDamage: number;
  kaguneDamage: number;
  rd: number;
  weaponRD: number;
  life: number;
  sanity: number;
  rc: number;
  movement: number;
  initiative: number;
  range: number;
  attributeChecks: Record<AttributeKey, number>;
}

type BonusKey = Exclude<keyof ReworkBonuses, "attributeChecks">;
type Scale = { attribute: AttributeKey; divisor?: number; multiplier?: number; minimum?:number };
type BonusValue = number | Scale;
type Modifiers = Partial<Record<BonusKey, BonusValue>> & { checks?: Partial<Record<AttributeKey, number>> };
type Definition = { perk: Perk; modifiers: Modifiers; weaponOnly: boolean };
const keys: AttributeKey[] = ["forca", "vigor", "precisao", "agilidade", "raciocinio", "percepcao", "presenca", "controle"];
const labels: Record<AttributeKey, string> = {
  forca: "Força", vigor: "Vigor", precisao: "Precisão", agilidade: "Agilidade",
  raciocinio: "Raciocínio", percepcao: "Percepção", presenca: "Presença", controle: "Controle",
};
const bonusLabels: Record<BonusKey, string> = {
  physicalHit: "acertos em ataques físicos", kaguneHit: "acertos de Kagune/Quinque",
  block: "acertos de Bloqueio", dodge: "acertos de Desvio",
  physicalSteps: "Passos de Dano físico", kaguneSteps: "Passos de Dano de Kagune/Quinque",
  physicalDamage: "dano fixo físico", kaguneDamage: "dano fixo de Kagune/Quinque",
  rd: "RD", weaponRD: "RD da Kagune/Quinque", life: "Vida máxima", sanity: "Sanidade máxima", rc: "RC máximo",
  movement: "espaços de Deslocamento", initiative: "Iniciativa", range: "metros de alcance da Kagune/Quinque",
};
const definitions: Definition[] = [];
const bothHit = (value: BonusValue): Modifiers => ({ physicalHit: value, kaguneHit: value });
const bothSteps = (value: BonusValue): Modifiers => ({ physicalSteps: value, kaguneSteps: value });
const half = (attribute: AttributeKey): Scale => ({ attribute, divisor: 2 });
function describe(modifiers: Modifiers) {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(modifiers)) {
    if (key === "checks") {
      for (const [attribute, bonus] of Object.entries(value)) parts.push(`+${bonus} acertos em testes de ${labels[attribute as AttributeKey]}`);
    } else if (typeof value === "number") {
      parts.push(`+${value} ${bonusLabels[key as BonusKey]}`);
    } else {
      const scale = value as Scale;
      const attribute = labels[scale.attribute];
      const amount = scale.divisor === 2 ? `metade de ${attribute}, arredondada para baixo` : `${attribute}${scale.multiplier && scale.multiplier !== 1 ? ` × ${scale.multiplier}` : ""}`;
      parts.push(`${bonusLabels[key as BonusKey]} +${amount}${scale.minimum?`, mínimo ${scale.minimum}`:''}`);
    }
  }
  return parts.join("; ").replace(/\+1 acertos\b/g, "+1 acerto").replace(/\+1 Passos\b/g, "+1 Passo").replace(/\+1 espa\u00e7os\b/g, "+1 espa\u00e7o").replace(/\+1 metros\b/g, "+1 metro") + ".";
}
function add(id: string, name: string, level: number, cost: number, category: CatalogCategory, modifiers: Modifiers, options: Partial<Perk> = {}, flavor = "") {
  // Raise existing damage effects by tier; defensive/utility purchases gain no new damage.
  if(level<20){
    const minimum=level<4?2:level<7?4:level<10?6:level<13?10:level<16?15:level<18?25:30;
    modifiers={...modifiers};
    for(const key of ['physicalSteps','kaguneSteps'] as const){const value=modifiers[key];if(typeof value==='number'&&value>0)modifiers[key]=Math.max(value,minimum);else if(value&&typeof value==='object')modifiers[key]={...value,minimum};}
  }
  const weaponOnly = options.location === "kakuhou";
  const equipmentCompatible = !options.species && (["kaguneHit", "kaguneSteps", "kaguneDamage", "block", "dodge", "rd", "weaponRD", "range", "rc", "checks"] as const)
    .some(key => modifiers[key] !== undefined && (key !== "checks" || Object.keys(modifiers.checks || {}).length > 0));
  const requirement = [
    `LEVEL ${level}+`,
    ...(options.attribute && options.min ? [`${labels[options.attribute]} ${options.min}+`] : []),
    ...(options.kaguneTypes || []),
    ...(options.requirement ? [options.requirement] : []),
  ].join(" · ");
  const perk: Perk = {
    id: `r26-${id}`, name, category, cost, maxRank: 1, minGrade: level,
    supplement: true, sourceId: "REWORK 2026", useType: "Passiva · automática",
    description: `${flavor ? `${flavor} ` : ""}${weaponOnly ? "Enquanto a Kagune/Quinque estiver em uso: " : ""}${describe(modifiers)}${endgameProperties[`r26-${id}`]?` ${endgameProperties[`r26-${id}`].description}`:''}`,
    ...options, equipmentCompatible, requirement,
  };
  definitions.push({ perk, modifiers, weaponOnly });
}

// One unrestricted purchase at each LEVEL, including the new endgame.
add("fundamento", "Fundamento de Combate", 1, 3, "Combate", bothHit(1));
add("guarda-viva", "Guarda Viva", 2, 4, "Combate", { block: 1, dodge: 1 });
add("golpe-denso", "Golpe Denso", 3, 5, "Combate", bothSteps(3));
add("cicatrizes-ferro", "Cicatrizes de Ferro", 4, 5, "Genérica", { life: 8, rd: 1 });
add("nervos-precisos", "Nervos Precisos", 5, 6, "Combate", { ...bothHit(2), initiative: 1 });
add("instinto-guarda", "Instinto de Guarda", 6, 6, "Combate", { block: 2, dodge: 2 });
add("peso-execucao", "Peso da Execução", 7, 7, "Combate", { ...bothSteps(8), physicalDamage: 2, kaguneDamage: 2 });
add("corpo-campo", "Corpo de Campo", 8, 8, "Vigor", { life: 12, rd: 2 });
add("ritmo-dominante", "Ritmo Dominante", 9, 8, "Combate", { ...bothHit(3), movement: 1 });
add("defesa-integral", "Defesa Integral", 10, 9, "Combate", { block: 3, dodge: 3, rd: 1 });
add("impacto-certeiro", "Impacto Certeiro", 11, 10, "Combate", { ...bothSteps(12), ...bothHit(1) });
add("vontade-fundida", "Vontade Fundida", 12, 10, "Controle", { sanity: 12, block: 2, dodge: 2 });
add("execucao-avancada", "Execução Avançada", 13, 12, "Combate", { ...bothHit(4), physicalDamage: 3, kaguneDamage: 3 });
add("romper-teto", "Romper o Teto", 14, 14, "Combate", { ...bothSteps(20), life: 15 });
add("ameaca-absoluta", "Ameaça Absoluta", 15, 18, "Combate", { ...bothHit(5), initiative: 3 });
add("fortaleza-pessoal", "Fortaleza Pessoal", 16, 20, "Vigor", { rd: 4, life: 20, block: 3 });
add("supremacia-movimento", "Supremacia em Movimento", 17, 22, "Agilidade", { dodge: 5, movement: 2, ...bothHit(2) });
add("assinatura-letal", "Assinatura Letal", 18, 25, "Combate", { ...bothSteps(35), physicalDamage: 5, kaguneDamage: 5 });
add("presenca-catastrofe", "Presença de Catástrofe", 19, 35, "Presença", { ...bothHit(7), block: 5, dodge: 5 });
add("lenda-viva", "Lenda Viva", 20, 240, "Combate", { life: 100, checks: Object.fromEntries(keys.map(key => [key, 20])) }, {}, "Versatilidade: amplia os testes de atributos, sem aumentar os ataques ou as defesas.");

// Each attribute has early, intermediate and advanced purchases with real combat value.
const attributeLevels = [1, 3, 5, 8, 11, 16];
type AttributeRow = [string, string, Modifiers];
const attributeRows: Record<AttributeKey, AttributeRow[]> = {
  forca: [
    ["punho-pesado", "Punho Pesado", { physicalSteps: 1, checks: { forca: 1 } }],
    ["rompe-carne", "Rompe-Carne", { ...bothSteps(1), physicalDamage: 2 }],
    ["musculatura-ofensiva", "Musculatura Ofensiva", { ...bothHit(2), life: 5 }],
    ["peso-tita", "Peso de Titã", { physicalSteps: half("forca"), kaguneSteps: 2 }],
    ["impacto-demolidor", "Impacto Demolidor", { ...bothSteps(3), physicalDamage: half("forca") }],
    ["forca-soberana", "Força Soberana", { ...bothHit(4), ...bothSteps(4), checks: { forca: 4 } }],
  ],
  vigor: [
    ["constituicao-robusta", "Constituição Robusta", { life: 6, block: 1 }],
    ["ossos-reforcados", "Ossos Reforçados", { rd: 1, block: 2 }],
    ["reservas-vitais", "Reservas Vitais", { life: { attribute: "vigor", multiplier: 2 }, sanity: 3 }],
    ["defesa-colossal", "Defesa Colossal", { block: half("vigor"), rd: 2 }],
    ["corpo-inquebravel", "Corpo Inquebrável", { life: 18, rd: 3 }],
    ["fortaleza-pulsante", "Fortaleza Pulsante", { block: 5, rd: 5, life: 25 }],
  ],
  precisao: [
    ["mira-assentada", "Mira Assentada", { ...bothHit(1), checks: { precisao: 1 } }],
    ["angulo-cirurgico", "Ângulo Cirúrgico", { ...bothHit(2), physicalDamage: 1, kaguneDamage: 1 }],
    ["corte-limpo", "Corte Limpo", { ...bothSteps(2), checks: { precisao: 2 } }],
    ["perfuracao-perfeita", "Perfuração Perfeita", { physicalDamage: half("precisao"), kaguneDamage: half("precisao"), ...bothHit(1) }],
    ["exatidao-inumana", "Exatidão Inumana", { ...bothHit(4), ...bothSteps(2) }],
    ["execucao-milimetrica", "Execução Milimétrica", { ...bothHit(6), ...bothSteps(4) }],
  ],
  agilidade: [
    ["passo-fantasma", "Passo Fantasma", { dodge: 2, initiative: 1 }],
    ["corpo-fluido", "Corpo Fluido", { dodge: 2, movement: 1 }],
    ["cadencia-veloz", "Cadência Veloz", { ...bothHit(2), dodge: 1 }],
    ["vetor-imprevisivel", "Vetor Imprevisível", { dodge: half("agilidade"), ...bothSteps(1) }],
    ["velocidade-predatoria", "Velocidade Predatória", { ...bothHit(3), dodge: 3, initiative: 3 }],
    ["instante-zero", "Instante Zero", { dodge: 6, ...bothHit(4), movement: 2 }],
  ],
  raciocinio: [
    ["calculo-combate", "Cálculo de Combate", { ...bothHit(1), checks: { raciocinio: 1 } }],
    ["geometria-defensiva", "Geometria Defensiva", { block: 2, dodge: 2 }],
    ["anatomia-aplicada", "Anatomia Aplicada", { ...bothSteps(2), physicalDamage: 1, kaguneDamage: 1 }],
    ["equacao-caca", "Equação da Caça", { physicalHit: half("raciocinio"), kaguneHit: half("raciocinio") }],
    ["estrategia-violenta", "Estratégia Violenta", { ...bothSteps(3), block: 2, dodge: 2 }],
    ["mente-guerra", "Mente de Guerra", { ...bothHit(5), ...bothSteps(3), initiative: 4 }],
  ],
  percepcao: [
    ["olhos-abertos", "Olhos Abertos", { initiative: 2, dodge: 1, checks: { percepcao: 1 } }],
    ["leitura-trajetoria", "Leitura de Trajetória", { ...bothHit(2), block: 1 }],
    ["sentido-combate", "Sentido de Combate", { block: 2, dodge: 2, initiative: 1 }],
    ["mira-instintiva", "Mira Instintiva", { physicalHit: half("percepcao"), kaguneHit: half("percepcao") }],
    ["leitura-integral", "Leitura Integral", { ...bothHit(3), dodge: 3, initiative: 3 }],
    ["olho-predador", "Olho do Predador", { ...bothHit(6), ...bothSteps(3), checks: { percepcao: 4 } }],
  ],
  presenca: [
    ["postura-dominante", "Postura Dominante", { ...bothHit(1), sanity: 3 }],
    ["espirito-ferro", "Espírito de Ferro", { sanity: 6, block: 1, dodge: 1 }],
    ["pressao-sanguinea", "Pressão Sanguínea", { ...bothSteps(2), checks: { presenca: 2 } }],
    ["autoridade-brutal", "Autoridade Brutal", { physicalDamage: half("presenca"), kaguneDamage: half("presenca"), ...bothHit(1) }],
    ["aura-soberana", "Aura Soberana", { ...bothHit(3), sanity: 10, rd: 1 }],
    ["rei-campo", "Rei do Campo", { ...bothHit(5), ...bothSteps(4), sanity: 15 }],
  ],
  controle: [
    ["pulso-estavel", "Pulso Estável", { ...bothHit(1), sanity: 4 }],
    ["vontade-blindada", "Vontade Blindada", { block: 2, dodge: 2, sanity: 3 }],
    ["mente-cortante", "Mente Cortante", { ...bothSteps(2), checks: { controle: 2 } }],
    ["sincronia-plena", "Sincronia Plena", { physicalHit: half("controle"), kaguneHit: half("controle"), sanity: 5 }],
    ["calma-predatoria", "Calma Predatória", { block: 3, dodge: 3, rd: 2, sanity: 8 }],
    ["dominio-absoluto", "Domínio Absoluto", { ...bothHit(5), ...bothSteps(4), block: 4, dodge: 4 }],
  ],
};
for (const attribute of keys) attributeRows[attribute].forEach(([id, name, modifiers], index) => {
  add(id, name, attributeLevels[index], [3, 4, 6, 8, 11, 20][index], labels[attribute] as CatalogCategory, modifiers, { attribute, min: [1, 2, 3, 4, 6, 9][index] });
});

type RaceRow = [string, string, Modifiers];
const raceRows: Record<SpeciesId, RaceRow[]> = {
  humano: [
    ["engenho-humano", "Engenho Humano", { ...bothHit(2), checks: { raciocinio: 1 } }],
    ["treinamento-elite", "Treinamento de Elite", { block: 2, dodge: 2, ...bothSteps(1) }],
    ["humanidade-tenaz", "Humanidade Tenaz", { life: 15, sanity: 10, rd: 1 }],
    ["apice-humano", "Ápice Humano", { ...bothHit(5), ...bothSteps(4), dodge: 3 }],
  ],
  ghoul: [
    ["predador-nato", "Predador Nato", { kaguneHit: 2, physicalSteps: 1, rc: 3 }],
    ["sangue-predador", "Sangue Predador", { life: 10, kaguneSteps: 2, rc: 4 }],
    ["kakuhou-adulta", "Kakuhou Adulta", { kaguneHit: 3, kaguneDamage: 3, rd: 2 }],
    ["coroa-predador", "Coroa do Predador", { kaguneHit: 6, kaguneSteps: 5, rc: 12 }],
  ],
  "humano-dominante": [
    ["forca-herdada", "Força Herdada", { ...bothSteps(1), life: 5 }],
    ["fisiologia-hibrida", "Fisiologia Híbrida", { life: 12, rd: 2 }],
    ["instinto-domado", "Instinto Domado", { ...bothHit(3), block: 2, dodge: 2 }],
    ["soberania-hibrida", "Soberania Híbrida", { ...bothSteps(5), rd: 4, sanity: 10 }],
  ],
  "ghoul-dominante": [
    ["linhagem-dominante", "Linhagem Dominante", { kaguneHit: 2, block: 1, dodge: 1 }],
    ["pressao-kakuhou", "Pressão da Kakuhou", { kaguneSteps: 3, rc: 5 }],
    ["carnica-coroa", "Carnífica Coroa", { rd: 3, kaguneHit: 3, life: 10 }],
    ["herdeiro-catastrofe", "Herdeiro da Catástrofe", { kaguneHit: 5, kaguneSteps: 6, rc: 15 }],
  ],
  "ghoul-artificial": [
    ["sincronia-enxerto", "Sincronia do Enxerto", { kaguneHit: 2, sanity: 5 }],
    ["integracao-total", "Integração Total", { kaguneSteps: 2, rd: 2, rc: 4 }],
    ["organismo-reconstruido", "Organismo Reconstruído", { life: 18, block: 2, dodge: 2 }],
    ["evolucao-induzida", "Evolução Induzida", { kaguneHit: 5, kaguneSteps: 5, sanity: 12, rc: 10 }],
  ],
  quinx: [
    ["frame-estavel", "Frame Estável", { kaguneHit: 2, sanity: 4 }],
    ["blindagem-frame", "Blindagem do Frame", { block: 2, rd: 2, life: 6 }],
    ["liberacao-otimizada", "Liberação Otimizada", { kaguneHit: 3, kaguneSteps: 3, rc: 6 }],
    ["frame-soberano", "Frame Soberano", { kaguneHit: 5, kaguneSteps: 5, rd: 3, sanity: 10 }],
  ],
};
for (const species of Object.keys(raceRows) as SpeciesId[]) raceRows[species].forEach(([id, name, modifiers], index) => {
  add(id, name, [1, 4, 8, 14][index], [4, 6, 10, 20][index], "Genérica", modifiers, { species: [species] });
});

// Weapon perks are available to their Kagune family and the corresponding Quinque.
// Their defensive and offensive values only enter calculations while the weapon is used.
type OrganRow = [string, string, Modifiers, boolean?];
const organRows: Record<KaguneFamily, OrganRow[]> = {
  Ukaku: [
    ["pena-aguda", "Pena Aguda", { kaguneHit: 2, kaguneDamage: 1 }],
    ["asa-reflexa", "Asa Reflexa", { dodge: 2, initiative: 1 }],
    ["cadencia-cristalina", "Cadência Cristalina", { kaguneSteps: 2, range: 1 }],
    ["balistica-mental", "Balística Mental", { kaguneHit: half("controle"), kaguneDamage: 2 }, true],
    ["plumagem-cortante", "Plumagem Cortante", { kaguneSteps: 3, kaguneHit: 2 }],
    ["ceu-blindado", "Céu Blindado", { dodge: 4, rd: 2 }],
    ["mira-neural", "Mira Neural", { kaguneHit: half("controle"), kaguneSteps: 3 }, true],
    ["tempestade-cristal", "Tempestade de Cristal", { kaguneHit: 5, kaguneSteps: 5, range: 3 }],
    ["serafim-devastacao", "Serafim da Devastação", { kaguneSteps: 60, range: 12, dodge: 15 }],
  ],
  Koukaku: [
    ["aco-nervoso", "Aço Nervoso", { kaguneHit: 2, block: 1 }],
    ["placa-vital", "Placa Vital", { rd: 2, block: 1 }],
    ["gume-comprimido", "Gume Comprimido", { kaguneSteps: 2, kaguneDamage: 2 }],
    ["comando-couraca", "Comando da Couraça", { block: half("controle"), rd: 2 }, true],
    ["massa-guerra", "Massa de Guerra", { kaguneSteps: 3, block: 2, rd: 1 }],
    ["fortaleza-sinaptica", "Fortaleza Sináptica", { kaguneHit: half("controle"), rd: 3 }, true],
    ["casco-soberano", "Casco Soberano", { rd: 5, block: 5 }],
    ["martelo-cerco", "Martelo de Cerco", { kaguneHit: 5, kaguneSteps: 6, kaguneDamage: 5 }],
    ["bastiao-apocaliptico", "Bastião Apocalíptico", { rd: 50, block: 20 }],
  ],
  Rinkaku: [
    ["tendao-predatorio", "Tendão Predatório", { kaguneHit: 2, kaguneSteps: 1 }],
    ["trama-resistente", "Trama Resistente", { block: 2, rd: 1 }],
    ["caudas-devastadoras", "Caudas Devastadoras", { kaguneSteps: 2, kaguneDamage: 2 }],
    ["rede-consciente", "Rede Consciente", { kaguneHit: half("controle"), dodge: 2 }, true],
    ["feixe-muscular", "Feixe Muscular", { kaguneSteps: 3, kaguneDamage: 3 }],
    ["nervos-hidra", "Nervos da Hidra", { block: half("controle"), dodge: half("controle") }, true],
    ["sangue-esmagador", "Sangue Esmagador", { kaguneHit: 4, kaguneSteps: 4, range: 2 }],
    ["hidra-insaciavel", "Hidra Insaciável", { kaguneHit: 6, kaguneSteps: 6, rd: 3 }],
    ["orochi-soberano", "Orochi Soberano", { kaguneSteps: 70, kaguneDamage: 40 }],
  ],
  Bikaku: [
    ["eixo-predatorio", "Eixo Predatório", { kaguneHit: 2, dodge: 1 }],
    ["guarda-caudal", "Guarda Caudal", { block: 2, dodge: 1 }],
    ["gume-balanceado", "Gume Balanceado", { kaguneSteps: 2, kaguneDamage: 2 }],
    ["equilibrio-mental", "Equilíbrio Mental", { block: half("controle"), dodge: 2 }, true],
    ["cauda-verdugo", "Cauda do Verdugo", { kaguneHit: 3, kaguneSteps: 3 }],
    ["centro-consciente", "Centro Consciente", { kaguneHit: half("controle"), dodge: half("controle") }, true],
    ["duelista-supremo", "Duelista Supremo", { kaguneHit: 4, block: 4, dodge: 4 }],
    ["gume-soberano", "Gume Soberano", { kaguneSteps: 6, kaguneDamage: 6, kaguneHit: 3 }],
    ["rei-duelo", "Rei do Duelo", { kaguneHit: 20, dodge: 20, kaguneSteps: 35 }],
  ],
};
for (const family of Object.keys(organRows) as KaguneFamily[]) organRows[family].forEach(([id, name, modifiers, control], index) => {
  const level = [1, 2, 4, 6, 8, 10, 14, 18, 20][index];
  const familyEndgameCost = { Ukaku: 300, Koukaku: 320, Rinkaku: 350, Bikaku: 280 }[family];
  add(id, name, level, index === 8 ? familyEndgameCost : [3, 4, 6, 8, 10, 12, 18, 28][index], control ? "Controle" : "Combate", modifiers, {
    location: "kakuhou", organGroup: family, kaguneTypes: [family],
    ...(control ? { attribute: "controle" as const, min: index < 5 ? 3 : 5 } : {}),
  });
});

// Sixteen distinct combat purchases for each attribute. The last is an exclusive
// LEVEL 20 capstone requiring 15 permanent attribute points, beyond normal buying.
const expansionLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 19, 20];
const expansionMinimums = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 9, 11, 13, 15];
const expansionCosts = [3, 4, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 24, 32, 45, 90];
const full = (attribute: AttributeKey, multiplier = 1): Scale => ({ attribute, multiplier });
const attributeExpansionRows: Record<AttributeKey, AttributeRow[]> = {
  forca: [
    ["soco-ancora", "Soco Âncora", { physicalSteps: 2, physicalDamage: 2 }],
    ["musculos-guarda", "Músculos de Guarda", { block: 2, life: 5 }],
    ["tracao-devastadora", "Tração Devastadora", { ...bothSteps(2), checks: { forca: 2 } }],
    ["maos-de-prensa", "Mãos de Prensa", { physicalHit: 3, physicalDamage: 4 }],
    ["densidade-ofensiva", "Densidade Ofensiva", { ...bothSteps(3), life: 8 }],
    ["potencia-constante", "Potência Constante", { physicalDamage: full("forca"), kaguneDamage: half("forca") }],
    ["coluna-de-aco", "Coluna de Aço", { rd: 3, block: 4, checks: { forca: 3 } }],
    ["pulso-esmagador", "Pulso Esmagador", { ...bothHit(4), ...bothSteps(3) }],
    ["musculatura-de-cerco", "Musculatura de Cerco", { ...bothSteps(5), physicalDamage: 5, kaguneDamage: 5 }],
    ["peso-da-mao", "Peso da Mão", { physicalHit: full("forca"), kaguneHit: half("forca"), block: 3 }],
    ["anatomia-demolidora", "Anatomia Demolidora", { ...bothSteps(8), life: 18, rd: 3 }],
    ["martelo-humano", "Martelo Humano", { ...bothSteps(12), physicalDamage: 12, kaguneDamage: 8 }],
    ["dominio-da-massa", "Domínio da Massa", { ...bothHit(12), block: 10, life: 30 }],
    ["fornalha-muscular", "Fornalha Muscular", { ...bothSteps(20), physicalDamage: full("forca", 2), kaguneDamage: full("forca") }],
    ["peso-do-mundo", "Peso do Mundo", { ...bothSteps(30), ...bothHit(20), rd: 15, life: 50 }],
    ["atlas-vivo", "Atlas Vivo", { physicalSteps: 60, physicalDamage: 60, life: 80, checks: { forca: 20 } }],
  ],
  vigor: [
    ["tecido-denso", "Tecido Denso", { life: 8, rd: 1 }],
    ["base-inamovivel", "Base Inamovível", { block: 3, checks: { vigor: 2 } }],
    ["reserva-do-corpo", "Reserva do Corpo", { life: 10, sanity: 4 }],
    ["escudo-de-ossos", "Escudo de Ossos", { rd: 2, block: 3 }],
    ["impacto-corporal", "Impacto Corporal", { ...bothSteps(3), life: 8 }],
    ["casca-resistente", "Casca Resistente", { rd: half("vigor"), life: 8 }],
    ["pulso-inesgotavel", "Pulso Inesgotável", { life: full("vigor", 3), checks: { vigor: 3 } }],
    ["guarda-de-granito", "Guarda de Granito", { block: full("vigor"), rd: 3 }],
    ["vitalidade-de-guerra", "Vitalidade de Guerra", { life: 25, ...bothHit(3), sanity: 5 }],
    ["corpo-baluarte", "Corpo Baluarte", { block: 8, rd: 5, life: 12 }],
    ["ossos-de-titanio", "Ossos de Titânio", { rd: 8, ...bothSteps(5), checks: { vigor: 5 } }],
    ["vida-monumental", "Vida Monumental", { life: 50, block: 10, sanity: 10 }],
    ["bastiao-de-carne", "Bastião de Carne", { rd: 15, block: 15, ...bothSteps(8) }],
    ["coracao-de-guerra", "Coração de Guerra", { life: full("vigor", 6), rd: 18, physicalDamage: 15, kaguneDamage: 15 }],
    ["muralha-invencivel", "Muralha Invencível", { life: 100, rd: 25, block: 20 }],
    ["corpo-continental", "Corpo Continental", { life: 200, rd: 60, block: 20 }],
  ],
  precisao: [
    ["linha-do-gume", "Linha do Gume", { ...bothHit(2), checks: { precisao: 1 } }],
    ["corte-calibrado", "Corte Calibrado", { physicalDamage: 3, kaguneDamage: 3 }],
    ["empunhadura-certa", "Empunhadura Certa", { ...bothHit(2), block: 2 }],
    ["golpe-de-agulha", "Golpe de Agulha", { ...bothSteps(3), ...bothHit(1) }],
    ["mao-cirurgica", "Mão Cirúrgica", { ...bothHit(3), physicalDamage: 3, kaguneDamage: 3 }],
    ["geometria-do-corte", "Geometria do Corte", { physicalDamage: full("precisao"), kaguneDamage: full("precisao") }],
    ["contra-angulo", "Contra Ângulo", { block: 4, dodge: 4, checks: { precisao: 3 } }],
    ["mira-sem-tremor", "Mira sem Tremor", { physicalHit: full("precisao"), kaguneHit: full("precisao") }],
    ["fio-sem-desperdicio", "Fio sem Desperdício", { ...bothSteps(6), physicalDamage: 5, kaguneDamage: 5 }],
    ["ritmo-do-carrasco", "Ritmo do Carrasco", { ...bothHit(8), initiative: 4, block: 3 }],
    ["perfuracao-absoluta", "Perfuração Absoluta", { ...bothHit(10), ...bothSteps(8) }],
    ["ponto-de-ruptura", "Ponto de Ruptura", { physicalDamage: 18, kaguneDamage: 18, ...bothSteps(10) }],
    ["mira-infalivel", "Mira Infalível", { ...bothHit(18), block: 8, dodge: 8 }],
    ["arte-do-corte-final", "Arte do Corte Final", { ...bothSteps(22), physicalDamage: full("precisao", 2), kaguneDamage: full("precisao", 2) }],
    ["sentenca-perfeita", "Sentença Perfeita", { ...bothHit(20), ...bothSteps(25), initiative: 10 }],
    ["zero-desvio", "Zero Desvio", { ...bothHit(20), physicalDamage: 60, kaguneDamage: 60, initiative: 15 }],
  ],
  agilidade: [
    ["passo-solto", "Passo Solto", { dodge: 2, movement: 1 }],
    ["arranque-de-caca", "Arranque de Caça", { initiative: 3, ...bothHit(1) }],
    ["golpe-em-fluxo", "Golpe em Fluxo", { ...bothHit(2), ...bothSteps(1) }],
    ["quadril-escapista", "Quadril Escapista", { dodge: 4, checks: { agilidade: 2 } }],
    ["cadencia-do-gume", "Cadência do Gume", { ...bothSteps(3), physicalDamage: 2, kaguneDamage: 2 }],
    ["ritmo-elastico", "Ritmo Elástico", { dodge: full("agilidade"), initiative: 2 }],
    ["vetor-de-ataque", "Vetor de Ataque", { ...bothHit(4), movement: 2 }],
    ["impacto-de-impulso", "Impacto de Impulso", { physicalDamage: full("agilidade"), kaguneDamage: full("agilidade"), ...bothSteps(2) }],
    ["tracado-fantasma", "Traçado Fantasma", { dodge: 7, block: 3, initiative: 4 }],
    ["pressao-ininterrupta", "Pressão Ininterrupta", { ...bothHit(7), ...bothSteps(5), movement: 1 }],
    ["pernas-de-relampago", "Pernas de Relâmpago", { dodge: 12, initiative: 8, movement: 3 }],
    ["corte-em-transito", "Corte em Trânsito", { ...bothSteps(12), ...bothHit(8) }],
    ["fluxo-impossivel", "Fluxo Impossível", { dodge: 20, block: 10, ...bothHit(10) }],
    ["momento-soberano", "Momento Soberano", { dodge: full("agilidade", 2), ...bothSteps(20), initiative: 12, movement: 4 }],
    ["velocidade-sem-fim", "Velocidade sem Fim", { ...bothHit(20), dodge: 20, ...bothSteps(20) }],
    ["alem-do-instante", "Além do Instante", { dodge: 20, movement: 10, initiative: 20 }],
  ],
  raciocinio: [
    ["logica-de-combate", "Lógica de Combate", { ...bothHit(2), checks: { raciocinio: 1 } }],
    ["mapa-da-guarda", "Mapa da Guarda", { block: 2, dodge: 2 }],
    ["fisica-do-impacto", "Física do Impacto", { ...bothSteps(2), physicalDamage: 2, kaguneDamage: 2 }],
    ["sequencia-eficiente", "Sequência Eficiente", { ...bothHit(3), initiative: 2 }],
    ["engenharia-da-defesa", "Engenharia da Defesa", { rd: 2, block: 3, dodge: 2 }],
    ["calculo-da-abertura", "Cálculo da Abertura", { physicalHit: full("raciocinio"), kaguneHit: full("raciocinio") }],
    ["vetores-de-ruptura", "Vetores de Ruptura", { physicalDamage: full("raciocinio"), kaguneDamage: full("raciocinio"), ...bothSteps(2) }],
    ["xadrez-corporal", "Xadrez Corporal", { block: 5, dodge: 5, initiative: 3 }],
    ["anatomia-do-desastre", "Anatomia do Desastre", { ...bothSteps(6), ...bothHit(4) }],
    ["plano-ininterrupto", "Plano Ininterrupto", { ...bothHit(8), sanity: 10, rd: 3 }],
    ["algoritmo-de-guerra", "Algoritmo de Guerra", { block: 10, dodge: 10, ...bothSteps(6) }],
    ["solucao-demolidora", "Solução Demolidora", { ...bothSteps(14), physicalDamage: 10, kaguneDamage: 10 }],
    ["cerebro-de-cerco", "Cérebro de Cerco", { ...bothHit(15), rd: 10, initiative: 10 }],
    ["previsao-dominante", "Previsão Dominante", { block: full("raciocinio", 2), dodge: full("raciocinio", 2), ...bothHit(15) }],
    ["estrategia-total", "Estratégia Total", { ...bothSteps(25), ...bothHit(20), rd: 15, sanity: 25 }],
    ["mente-laplace", "Mente de Laplace", { ...bothHit(20), sanity: 60, checks: { raciocinio: 20 } }],
  ],
  percepcao: [
    ["visao-de-combate", "Visão de Combate", { ...bothHit(2), initiative: 1 }],
    ["reflexo-de-alerta", "Reflexo de Alerta", { dodge: 3, checks: { percepcao: 2 } }],
    ["olho-no-gume", "Olho no Gume", { block: 3, ...bothHit(1) }],
    ["leitura-do-corpo", "Leitura do Corpo", { ...bothSteps(2), physicalDamage: 2, kaguneDamage: 2 }],
    ["janela-perfeita", "Janela Perfeita", { ...bothHit(3), dodge: 2, initiative: 2 }],
    ["sentido-de-trajetoria", "Sentido de Trajetória", { block: full("percepcao"), dodge: half("percepcao") }],
    ["pupila-predatoria", "Pupila Predatória", { physicalHit: full("percepcao"), kaguneHit: full("percepcao"), initiative: 2 }],
    ["radiografia-viva", "Radiografia Viva", { physicalDamage: full("percepcao"), kaguneDamage: full("percepcao"), ...bothSteps(2) }],
    ["campo-de-leitura", "Campo de Leitura", { block: 6, dodge: 6, checks: { percepcao: 4 } }],
    ["mira-de-cacador", "Mira de Caçador", { ...bothHit(8), ...bothSteps(4), initiative: 4 }],
    ["olhos-onipresentes", "Olhos Onipresentes", { block: 12, dodge: 12, initiative: 8 }],
    ["enxergar-a-ruptura", "Enxergar a Ruptura", { ...bothSteps(12), physicalDamage: 12, kaguneDamage: 12 }],
    ["leitura-incontornavel", "Leitura Incontornável", { ...bothHit(18), block: 10, dodge: 10 }],
    ["instinto-onisciente", "Instinto Onisciente", { block: full("percepcao", 2), dodge: full("percepcao", 2), initiative: 15 }],
    ["olho-do-abismo", "Olho do Abismo", { ...bothHit(20), ...bothSteps(20), physicalDamage: 20, kaguneDamage: 20 }],
    ["horizonte-absoluto", "Horizonte Absoluto", { block: 20, dodge: 20, initiative: 20, checks: { percepcao: 20 } }],
  ],
  presenca: [
    ["porte-de-guerra", "Porte de Guerra", { ...bothHit(2), sanity: 3 }],
    ["alma-firme", "Alma Firme", { sanity: 6, life: 4 }],
    ["pressao-do-golpe", "Pressão do Golpe", { ...bothSteps(2), checks: { presenca: 2 } }],
    ["postura-inquebravel", "Postura Inquebrável", { block: 3, dodge: 2, sanity: 4 }],
    ["peso-da-vontade", "Peso da Vontade", { ...bothHit(3), physicalDamage: 3, kaguneDamage: 3 }],
    ["impacto-da-alma", "Impacto da Alma", { physicalDamage: full("presenca"), kaguneDamage: full("presenca"), life: 8 }],
    ["autoridade-de-campo", "Autoridade de Campo", { block: 4, dodge: 4, sanity: 8 }],
    ["porte-soberano", "Porte Soberano", { physicalHit: full("presenca"), kaguneHit: full("presenca"), initiative: 3 }],
    ["coragem-carniceira", "Coragem Carniceira", { ...bothSteps(6), life: 20, sanity: 6 }],
    ["aura-de-guerra", "Aura de Guerra", { ...bothHit(7), rd: 4, checks: { presenca: 4 } }],
    ["vontade-monumental", "Vontade Monumental", { sanity: 25, life: 25, block: 6, dodge: 6 }],
    ["peso-da-coroa", "Peso da Coroa", { ...bothSteps(14), physicalDamage: 12, kaguneDamage: 12 }],
    ["soberania-viva", "Soberania Viva", { ...bothHit(15), rd: 10, sanity: 20 }],
    ["majestade-violenta", "Majestade Violenta", { physicalDamage: full("presenca", 2), kaguneDamage: full("presenca", 2), life: 50, ...bothSteps(15) }],
    ["vontade-de-imperio", "Vontade de Império", { ...bothHit(20), ...bothSteps(25), sanity: 40, rd: 15 }],
    ["imperador-do-campo", "Imperador do Campo", { life: 100, sanity: 80, block: 20, checks: { presenca: 20 } }],
  ],
  controle: [
    ["dominio-do-pulso", "Domínio do Pulso", { ...bothHit(2), sanity: 4 }],
    ["freio-mental", "Freio Mental", { block: 2, dodge: 2, sanity: 3 }],
    ["intencao-afiada", "Intenção Afiada", { ...bothSteps(2), checks: { controle: 2 } }],
    ["mente-de-aco", "Mente de Aço", { sanity: 8, rd: 2 }],
    ["comando-neural", "Comando Neural", { ...bothHit(3), block: 2, dodge: 2 }],
    ["dano-em-sincronia", "Dano em Sincronia", { physicalDamage: full("controle"), kaguneDamage: full("controle"), ...bothSteps(2) }],
    ["guarda-consciente", "Guarda Consciente", { block: full("controle"), dodge: half("controle"), sanity: 5 }],
    ["cerebro-predatorio", "Cérebro Predatório", { physicalHit: full("controle"), kaguneHit: full("controle"), initiative: 3 }],
    ["coesao-do-corpo", "Coesão do Corpo", { life: 20, rd: 4, block: 4 }],
    ["vontade-de-combate", "Vontade de Combate", { ...bothHit(8), ...bothSteps(5), sanity: 10 }],
    ["mente-impenetravel", "Mente Impenetrável", { block: 12, dodge: 12, sanity: 20 }],
    ["comando-total", "Comando Total", { ...bothSteps(14), physicalDamage: 12, kaguneDamage: 12 }],
    ["dominio-do-instinto", "Domínio do Instinto", { ...bothHit(15), block: 12, dodge: 12, rd: 8 }],
    ["vontade-do-abismo", "Vontade do Abismo", { block: full("controle", 2), dodge: full("controle", 2), sanity: 40, ...bothSteps(15) }],
    ["alma-inabalavel", "Alma Inabalável", { ...bothHit(20), block: 20, dodge: 20, ...bothSteps(20), life: 40 }],
    ["soberano-da-propria-mente", "Soberano da Própria Mente", { ...bothHit(20), block: 20, dodge: 20, sanity: 100, rc: 100, ...bothSteps(30) }],
  ],
};
for (const attribute of keys) attributeExpansionRows[attribute].forEach(([id, name, modifiers], index) => {
  if (attribute === 'controle' && index === 15) return;
  const endgameCost = { forca: 300, vigor: 400, precisao: 320, agilidade: 280, raciocinio: 300, percepcao: 320, presenca: 300, controle: 90 }[attribute];
  add(`exp-${attribute}-${id}`, name, expansionLevels[index], index === 15 ? endgameCost : expansionCosts[index], labels[attribute] as CatalogCategory,
    modifiers, { attribute, min: expansionMinimums[index] });
});
for (const [id, name, level, cost, modifiers] of genericExpansionRows) {
  add(id, name, level, cost, "Genérica", modifiers);
}
for (const [id, name, level, cost, category, modifiers, options] of damageStepRows) {
  add(id, name, level, cost, category, modifiers, options, level === 20 ? "Exclusiva do Level 20: exige 15 no atributo indicado." : "");
}

export const reworkPerks: Perk[] = [...definitions.map(({ perk }) => {
  const technique = tacticalCapstones.find(item => item.id === perk.id);
  return technique ? { ...perk, useType: 'Passiva + técnica ativa', description: `${perk.description} Técnica exclusiva: ${technique.description} Use os controles em Combate → Técnicas.` } : perk;
}), ...scalingPerks, colossusPerk, ...healingPerks, ...criticalPerks, ...TACTICAL_PERK_DEFINITIONS];
export const reworkPerkIds = new Set(reworkPerks.map(({ id }) => id));

export interface ReworkBonusContext {
  perks: Record<string, { rank: number }>;
  attributes: Record<AttributeKey, number>;
  weaponActive: boolean;
  level?: number;
  species?: SpeciesId;
  kaguneTypes?: KaguneFamily[];
}

export function calculateReworkBonuses(context: ReworkBonusContext): ReworkBonuses {
  context={...context,perks:normalizePerkPurchases(context.perks)};
  const result: ReworkBonuses = {
    physicalHit: 0, kaguneHit: 0, block: 0, dodge: 0, physicalSteps: 0, kaguneSteps: 0,
    physicalDamage: 0, kaguneDamage: 0, rd: 0, weaponRD: 0, life: 0, sanity: 0, rc: 0,
    movement: 0, initiative: 0, range: 0,
    attributeChecks: { forca: 0, vigor: 0, precisao: 0, agilidade: 0, raciocinio: 0, percepcao: 0, presenca: 0, controle: 0 },
  };
  for (const { perk, modifiers, weaponOnly } of definitions) {
    const rank = Math.max(0, Math.min(perk.maxRank || 1, Math.floor(context.perks[perk.id]?.rank || 0)));
    if (!rank || (weaponOnly && !context.weaponActive)) continue;
    if (context.level !== undefined && context.level < (perk.minGrade || 1)) continue;
    if (context.species && perk.species && !perk.species.includes(context.species)) continue;
    if (context.kaguneTypes && perk.kaguneTypes?.some(family => !context.kaguneTypes!.includes(family))) continue;
    if (perk.attribute && (context.attributes[perk.attribute] || 0) < (perk.min || 0)) continue;
    for (const [key, value] of Object.entries(modifiers)) {
      if(key === 'weaponRD' && !context.weaponActive) continue;
      if (key === "checks") {
        for (const [attribute, amount] of Object.entries(value)) result.attributeChecks[attribute as AttributeKey] += amount * rank;
      } else {
        const amount = typeof value === "number" ? value : Math.max((value as Scale).minimum||0,Math.floor(Math.max(0, context.attributes[(value as Scale).attribute] || 0) * ((value as Scale).multiplier || 1) / ((value as Scale).divisor || 1)));
        result[key as BonusKey] += amount * rank;
      }
    }
  }
  return result;
}
