import type { AttributeKey } from "./data";

/** Flat, automatic bonuses; every purchase has a useful effect in ordinary combat. */
export type GenericExpansionModifiers = Partial<Record<
  | "physicalHit" | "kaguneHit" | "block" | "dodge"
  | "physicalSteps" | "kaguneSteps" | "physicalDamage" | "kaguneDamage"
  | "rd" | "life" | "sanity" | "rc" | "movement" | "initiative" | "range",
  number
>> & { checks?: Partial<Record<AttributeKey, number>> };

export type GenericExpansionRow = [
  slug: string, name: string, level: number, cost: number, modifiers: GenericExpansionModifiers,
];

export const genericExpansionRows: GenericExpansionRow[] = [
  ["exp-geral-olhar-de-cacador", "Olhar de Caçador", 1, 3, { physicalHit: 2, kaguneHit: 2 }],
  ["exp-geral-peso-de-briga", "Peso de Briga", 1, 3, { physicalSteps: 2, kaguneSteps: 2 }],
  ["exp-geral-base-firme", "Base Firme", 1, 3, { block: 2, rd: 1 }],
  ["exp-geral-folego-inicial", "Fôlego Inicial", 1, 3, { life: 5, sanity: 2 }],

  ["exp-geral-mira-disciplinada", "Mira Disciplinada", 2, 4, { physicalHit: 2, kaguneHit: 2, initiative: 2 }],
  ["exp-geral-impacto-brutal", "Impacto Brutal", 2, 4, { physicalDamage: 3, kaguneDamage: 3 }],
  ["exp-geral-corpo-escapista", "Corpo Escapista", 2, 4, { dodge: 2, movement: 2 }],
  ["exp-geral-centro-emocional", "Centro Emocional", 2, 4, { sanity: 5, checks: { controle: 2, raciocinio: 2 } }],

  ["exp-geral-leitura-agressiva", "Leitura Agressiva", 3, 5, { physicalHit: 3, kaguneHit: 3, checks: { percepcao: 2 } }],
  ["exp-geral-golpe-profundo", "Golpe Profundo", 3, 5, { physicalSteps: 3, kaguneSteps: 3 }],
  ["exp-geral-guarda-de-ferro", "Guarda de Ferro", 3, 5, { block: 3, rd: 2 }],
  ["exp-geral-sangue-teimoso", "Sangue Teimoso", 3, 4, { life: 5, block: 2, checks: { vigor: 2 } }],

  ["exp-geral-gesto-impecavel", "Gesto Impecável", 4, 5, { physicalHit: 3, kaguneHit: 3, physicalDamage: 2, kaguneDamage: 2 }],
  ["exp-geral-violencia-contida", "Violência Contida", 4, 5, { physicalSteps: 3, kaguneSteps: 3, checks: { forca: 2 } }],
  ["exp-geral-passo-fantasma", "Passada Fantasma", 4, 5, { dodge: 3, movement: 2, initiative: 2 }],
  ["exp-geral-mente-ancorada", "Mente Ancorada", 4, 5, { sanity: 5, life: 5, checks: { presenca: 2 } }],

  ["exp-geral-foco-de-duelista", "Foco de Duelista", 5, 6, { physicalHit: 4, kaguneHit: 4, checks: { precisao: 2 } }],
  ["exp-geral-forca-perfurante", "Força Perfurante", 5, 6, { physicalSteps: 4, kaguneSteps: 4, physicalDamage: 2, kaguneDamage: 2 }],
  ["exp-geral-reflexo-lapidado", "Reflexo Lapidado", 5, 6, { block: 3, dodge: 3, rd: 2 }],
  ["exp-geral-coragem-visceral", "Coragem Visceral", 5, 5, { life: 5, sanity: 5, checks: { controle: 3, vigor: 2 } }],

  ["exp-geral-calculo-predatorio", "Cálculo Predatório", 6, 7, { physicalHit: 5, kaguneHit: 5, initiative: 2 }],
  ["exp-geral-punicao-pesada", "Punição Pesada", 6, 7, { physicalSteps: 5, kaguneSteps: 5, physicalDamage: 3, kaguneDamage: 3 }],
  ["exp-geral-defesa-cruzada", "Defesa Cruzada", 6, 7, { block: 4, dodge: 4, rd: 2 }],
  ["exp-geral-reserva-de-guerra", "Reserva de Guerra", 6, 7, { life: 12, sanity: 6, checks: { vigor: 2 } }],

  ["exp-geral-assinatura-precisa", "Assinatura Precisa", 7, 8, { physicalHit: 6, kaguneHit: 6, checks: { precisao: 3 } }],
  ["exp-geral-demolicao-direta", "Demolição Direta", 7, 8, { physicalSteps: 6, kaguneSteps: 6, physicalDamage: 4, kaguneDamage: 4 }],
  ["exp-geral-armadura-viva", "Armadura Viva", 7, 8, { rd: 3, block: 5, life: 6 }],
  ["exp-geral-quietude-feroz", "Quietude Feroz", 7, 8, { sanity: 10, initiative: 3, checks: { controle: 3, raciocinio: 3 } }],

  ["exp-geral-instinto-cirurgico", "Instinto Cirúrgico", 8, 9, { physicalHit: 7, kaguneHit: 7, physicalDamage: 3, kaguneDamage: 3 }],
  ["exp-geral-massa-devastadora", "Massa Devastadora", 8, 9, { physicalSteps: 7, kaguneSteps: 7, checks: { forca: 3 } }],
  ["exp-geral-fluxo-intocavel", "Fluxo Intocável", 8, 9, { dodge: 6, movement: 3, initiative: 3 }],
  ["exp-geral-pulso-incansavel", "Pulso Incansável", 8, 9, { life: 16, rd: 2, sanity: 5 }],

  ["exp-geral-visao-de-executor", "Visão de Executor", 9, 10, { physicalHit: 8, kaguneHit: 8, initiative: 3 }],
  ["exp-geral-colisao-desumana", "Colisão Desumana", 9, 10, { physicalSteps: 8, kaguneSteps: 8, physicalDamage: 5, kaguneDamage: 5 }],
  ["exp-geral-baluarte-movel", "Baluarte Móvel", 9, 10, { block: 6, dodge: 5, rd: 4 }],
  ["exp-geral-vontade-voraz", "Vontade Voraz", 9, 10, { sanity: 14, physicalHit: 3, kaguneHit: 3, checks: { controle: 4 } }],

  ["exp-geral-precisao-implacavel", "Precisão Implacável", 10, 12, { physicalHit: 9, kaguneHit: 9, checks: { precisao: 4, percepcao: 3 } }],
  ["exp-geral-martelo-de-ruina", "Martelo de Ruína", 10, 12, { physicalSteps: 10, kaguneSteps: 10, physicalDamage: 5, kaguneDamage: 5 }],
  ["exp-geral-muralha-de-nervos", "Muralha de Nervos", 10, 12, { block: 7, dodge: 7, rd: 4 }],
  ["exp-geral-essencia-persistente", "Essência Persistente", 10, 12, { life: 22, sanity: 10, checks: { vigor: 4 } }],

  ["exp-geral-dominio-da-distancia", "Domínio da Distância", 11, 14, { physicalHit: 10, kaguneHit: 10, movement: 3, initiative: 3 }],
  ["exp-geral-pressao-esmagadora", "Pressão Esmagadora", 11, 14, { physicalSteps: 11, kaguneSteps: 11, physicalDamage: 6, kaguneDamage: 6 }],
  ["exp-geral-carne-bastiao", "Carne de Bastião", 11, 14, { rd: 6, block: 8, life: 10 }],
  ["exp-geral-paz-no-caos", "Paz no Caos", 11, 13, { sanity: 18, dodge: 5, checks: { controle: 5, raciocinio: 4 } }],

  ["exp-geral-olho-da-tempestade", "Olho da Tempestade", 12, 16, { physicalHit: 11, kaguneHit: 11, initiative: 4 }],
  ["exp-geral-fratura-total", "Fratura Total", 12, 16, { physicalSteps: 12, kaguneSteps: 12, physicalDamage: 7, kaguneDamage: 7 }],
  ["exp-geral-danca-de-aco", "Dança de Aço", 12, 16, { dodge: 9, block: 7, movement: 4, rd: 3 }],
  ["exp-geral-coracao-indomavel", "Coração Indomável", 12, 16, { life: 28, sanity: 12, rd: 3 }],

  ["exp-geral-ameaca-infalivel", "Ameaça Infalível", 13, 18, { physicalHit: 12, kaguneHit: 12, physicalDamage: 5, kaguneDamage: 5 }],
  ["exp-geral-cataclismo-muscular", "Cataclismo Muscular", 13, 18, { physicalSteps: 14, kaguneSteps: 14, physicalDamage: 8, kaguneDamage: 8 }],
  ["exp-geral-corpo-de-cidadela", "Corpo de Cidadela", 13, 18, { rd: 8, block: 10, dodge: 6 }],
  ["exp-geral-espirito-expansivo", "Espírito Expansivo", 13, 17, { sanity: 22, life: 18, checks: { presenca: 5, controle: 5 } }],

  ["exp-geral-apice-do-instinto", "Ápice do Instinto", 14, 22, { physicalHit: 14, kaguneHit: 14, initiative: 5, checks: { percepcao: 5 } }],
  ["exp-geral-carga-de-colosso", "Carga de Colosso", 14, 22, { physicalSteps: 16, kaguneSteps: 16, physicalDamage: 10, kaguneDamage: 10 }],
  ["exp-geral-guarda-inexpugnavel", "Guarda Inexpugnável", 14, 22, { block: 12, dodge: 10, rd: 8 }],
  ["exp-geral-vitalidade-inabalavel", "Vitalidade Inabalável", 14, 20, { life: 35, sanity: 16, rd: 4 }],

  ["exp-geral-sentenca-inevitavel", "Sentença Inevitável", 15, 28, { physicalHit: 16, kaguneHit: 16, physicalDamage: 8, kaguneDamage: 8 }],
  ["exp-geral-furia-titanica", "Fúria Titânica", 15, 30, { physicalSteps: 19, kaguneSteps: 19, physicalDamage: 12, kaguneDamage: 12 }],
  ["exp-geral-soberania-defensiva", "Soberania Defensiva", 15, 28, { block: 14, dodge: 12, rd: 10 }],
  ["exp-geral-alma-acesa", "Alma Acesa", 15, 26, { sanity: 26, life: 24, physicalHit: 5, kaguneHit: 5 }],

  ["exp-geral-geometria-da-morte", "Geometria da Morte", 16, 34, { physicalHit: 18, kaguneHit: 18, initiative: 6, movement: 4 }],
  ["exp-geral-ruina-encarnada", "Ruína Encarnada", 16, 36, { physicalSteps: 22, kaguneSteps: 22, physicalDamage: 14, kaguneDamage: 14 }],
  ["exp-geral-pele-de-fortaleza", "Pele de Fortaleza", 16, 34, { rd: 13, block: 15, life: 20 }],
  ["exp-geral-existencia-tenaz", "Existência Tenaz", 16, 32, { life: 45, sanity: 22, dodge: 6 }],

  ["exp-geral-olhar-do-abismo", "Olhar do Abismo", 17, 42, { physicalHit: 21, kaguneHit: 21, checks: { precisao: 7, percepcao: 7 } }],
  ["exp-geral-violencia-soberana", "Violência Soberana", 17, 44, { physicalSteps: 26, kaguneSteps: 26, physicalDamage: 16, kaguneDamage: 16 }],
  ["exp-geral-limite-intransponivel", "Limite Intransponível", 17, 42, { block: 18, dodge: 16, rd: 15 }],
  ["exp-geral-nucleo-inextinguivel", "Núcleo Inextinguível", 17, 40, { sanity: 30, life: 35, initiative: 5, checks: { controle: 7 } }],

  ["exp-geral-maestria-predadora", "Maestria Predadora", 18, 52, { physicalHit: 24, kaguneHit: 24, physicalSteps: 8, kaguneSteps: 8 }],
  ["exp-geral-queda-de-imperios", "Queda de Impérios", 18, 55, { physicalSteps: 30, kaguneSteps: 30, physicalDamage: 18, kaguneDamage: 18 }],
  ["exp-geral-egide-do-desastre", "Égide do Desastre", 18, 52, { rd: 18, block: 20, dodge: 18 }],
  ["exp-geral-pulso-primordial", "Pulso Primordial", 18, 48, { life: 60, sanity: 26, rd: 6 }],

  ["exp-geral-presenca-imperial", "Presença Imperial", 19, 68, { physicalHit: 27, kaguneHit: 27, initiative: 8, checks: { presenca: 8 } }],
  ["exp-geral-extincao-em-movimento", "Extinção em Movimento", 19, 72, { physicalSteps: 35, kaguneSteps: 35, physicalDamage: 20, kaguneDamage: 20 }],
  ["exp-geral-fortaleza-do-fim", "Fortaleza do Fim", 19, 68, { block: 23, dodge: 21, rd: 21 }],
  ["exp-geral-vontade-alem-da-carne", "Vontade Além da Carne", 19, 64, { sanity: 36, life: 50, physicalHit: 8, kaguneHit: 8 }],

  ["exp-geral-perfeicao-inumana", "Perfeição Inumana", 20, 240, { physicalHit:20,kaguneHit:20,physicalSteps:35 }],
  ["exp-geral-coroa-da-devastacao", "Coroa da Devastação", 20, 380, { physicalDamage:30,kaguneDamage:30 }],
  ["exp-geral-egide-absoluta", "Égide Absoluta", 20, 320, { rd:50,block:20,life:100 }],
  ["exp-geral-eternidade-viva", "Eternidade Viva", 20, 300, { life:80,sanity:80,rc:80 }],

  // Two more choices at every level: pursuit and initiative, or mental resilience.
  ["exp-geral-avanco-destemido", "Avanço Destemido", 1, 3, { movement: 2, physicalHit: 2, kaguneHit: 2 }],
  ["exp-geral-senso-de-perigo", "Senso de Perigo", 1, 3, { initiative: 2, dodge: 2, checks: { percepcao: 2 } }],
  ["exp-geral-primeiro-estrondo", "Primeiro Estrondo", 2, 4, { initiative: 3, physicalSteps: 2, kaguneSteps: 2 }],
  ["exp-geral-raciocinio-de-combate", "Raciocínio de Combate", 2, 4, { block: 2, sanity: 3, checks: { raciocinio: 2, precisao: 2 } }],
  ["exp-geral-arranque-feroz", "Arranque Feroz", 3, 5, { movement: 2, physicalDamage: 3, kaguneDamage: 3, checks: { agilidade: 2 } }],
  ["exp-geral-serenidade-armada", "Serenidade Armada", 3, 5, { sanity: 5, block: 2, dodge: 2 }],
  ["exp-geral-cacada-aberta", "Caçada Aberta", 4, 5, { initiative: 4, movement: 2, physicalHit: 2, kaguneHit: 2 }],
  ["exp-geral-autoconfianca-de-aco", "Autoconfiança de Aço", 4, 5, { life: 5, rd: 2, checks: { presenca: 3, controle: 2 } }],
  ["exp-geral-perseguicao-implacavel", "Perseguição Implacável", 5, 6, { movement: 3, physicalSteps: 3, kaguneSteps: 3, initiative: 2 }],
  ["exp-geral-disciplina-sensorial", "Disciplina Sensorial", 5, 6, { sanity: 5, dodge: 3, checks: { percepcao: 3, raciocinio: 3 } }],
  ["exp-geral-impulso-de-ataque", "Impulso de Ataque", 6, 7, { initiative: 5, movement: 2, physicalDamage: 4, kaguneDamage: 4 }],
  ["exp-geral-determinacao-encarnada", "Determinação Encarnada", 6, 7, { life: 10, sanity: 7, checks: { forca: 3, controle: 3 } }],
  ["exp-geral-velocidade-de-assalto", "Velocidade de Assalto", 7, 8, { movement: 3, physicalHit: 4, kaguneHit: 4, initiative: 3 }],
  ["exp-geral-fortaleza-interior", "Fortaleza Interior", 7, 8, { sanity: 12, rd: 2, block: 3 }],
  ["exp-geral-passada-destrutiva", "Passada Destrutiva", 8, 9, { movement: 3, physicalSteps: 5, kaguneSteps: 5, checks: { agilidade: 3 } }],
  ["exp-geral-consciencia-ampliada", "Consciência Ampliada", 8, 9, { initiative: 4, dodge: 4, sanity: 8, checks: { percepcao: 4, precisao: 3 } }],
  ["exp-geral-ritmo-de-invasao", "Ritmo de Invasão", 9, 10, { initiative: 6, physicalHit: 5, kaguneHit: 5, physicalDamage: 3, kaguneDamage: 3 }],
  ["exp-geral-promessa-de-sobrevivencia", "Promessa de Sobrevivência", 9, 10, { life: 18, sanity: 8, block: 4, checks: { vigor: 4 } }],
  ["exp-geral-velocidade-cruel", "Velocidade Cruel", 10, 12, { movement: 4, physicalSteps: 7, kaguneSteps: 7, initiative: 3 }],
  ["exp-geral-firmeza-do-comandante", "Firmeza do Comandante", 10, 12, { sanity: 16, block: 5, checks: { presenca: 5, raciocinio: 4 } }],
  ["exp-geral-horizonte-de-caca", "Horizonte de Caça", 11, 14, { initiative: 7, movement: 3, physicalHit: 6, kaguneHit: 6 }],
  ["exp-geral-sangue-frio-absoluto", "Sangue Frio Absoluto", 11, 14, { sanity: 18, rd: 4, checks: { precisao: 5, controle: 4 } }],
  ["exp-geral-arrancada-suprema", "Arrancada Suprema", 12, 16, { movement: 4, physicalDamage: 9, kaguneDamage: 9, initiative: 4 }],
  ["exp-geral-mente-de-sentinela", "Mente de Sentinela", 12, 16, { sanity: 20, dodge: 6, block: 5, checks: { percepcao: 5 } }],
  ["exp-geral-impeto-de-conquista", "Ímpeto de Conquista", 13, 18, { initiative: 8, physicalSteps: 9, kaguneSteps: 9, movement: 3 }],
  ["exp-geral-voto-inquebravel", "Voto Inquebrável", 13, 18, { life: 24, sanity: 16, block: 6, checks: { presenca: 5, vigor: 4 } }],
  ["exp-geral-avanco-imperioso", "Avanço Imperioso", 14, 22, { movement: 5, physicalHit: 9, kaguneHit: 9, initiative: 5 }],
  ["exp-geral-clareza-ascendente", "Clareza Ascendente", 14, 22, { sanity: 24, rd: 5, dodge: 7, checks: { raciocinio: 6, controle: 5 } }],
  ["exp-geral-tempestade-itinerante", "Tempestade Itinerante", 15, 28, { movement: 5, physicalSteps: 12, kaguneSteps: 12, initiative: 7 }],
  ["exp-geral-autoridade-interior", "Autoridade Interior", 15, 28, { sanity: 28, block: 9, dodge: 7, checks: { presenca: 6, forca: 5 } }],
  ["exp-geral-vanguarda-predatoria", "Vanguarda Predatória", 16, 34, { initiative: 10, physicalHit: 12, kaguneHit: 12, movement: 4 }],
  ["exp-geral-vigilia-infinita", "Vigília Infinita", 16, 34, { sanity: 30, dodge: 10, rd: 6, checks: { percepcao: 7, agilidade: 6 } }],
  ["exp-geral-passos-de-calamidade", "Passos de Calamidade", 17, 42, { movement: 6, physicalSteps: 17, kaguneSteps: 17, initiative: 6 }],
  ["exp-geral-dominio-emocional", "Domínio Emocional", 17, 42, { sanity: 36, block: 12, rd: 8, checks: { controle: 8, raciocinio: 6 } }],
  ["exp-geral-trovao-incessante", "Trovão Incessante", 18, 52, { initiative: 12, movement: 6, physicalDamage: 16, kaguneDamage: 16 }],
  ["exp-geral-memoria-de-todas-as-guerras", "Memória de Todas as Guerras", 18, 52, { sanity: 40, life: 30, dodge: 10, checks: { raciocinio: 8, precisao: 7 } }],
  ["exp-geral-velocidade-apocaliptica", "Velocidade Apocalíptica", 19, 68, { movement: 7, initiative: 14, physicalHit: 15, kaguneHit: 15 }],
  ["exp-geral-conviccao-soberana", "Convicção Soberana", 19, 68, { sanity: 46, block: 15, rd: 10, checks: { presenca: 9, vigor: 8 } }],
  ["exp-geral-onipresenca-no-campo", "Onipresença no Campo", 20, 260, { movement:12,initiative:20,dodge:20,range:10 }],
  ["exp-geral-consciencia-transcendente", "Consciência Transcendente", 20, 280, { sanity:60,checks:{ raciocinio:20,percepcao:20,controle:20 } }],
];
