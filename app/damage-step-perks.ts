import type { AttributeKey, CatalogCategory, Perk } from "./data";

type Scale = { attribute: AttributeKey; divisor?: number; multiplier?: number };
export type DamageStepModifiers = Partial<Record<
  "physicalHit" | "kaguneHit" | "block" | "dodge" | "physicalSteps" | "kaguneSteps" |
  "physicalDamage" | "kaguneDamage" | "rd" | "weaponRD" | "life" | "sanity" | "rc" |
  "movement" | "initiative" | "range", number | Scale
>>;
export type DamageStepRow = [id: string, name: string, level: number, cost: number, category: CatalogCategory, modifiers: DamageStepModifiers, options?: Partial<Perk>];
const steps = (amount: number): DamageStepModifiers => ({ physicalSteps: amount, kaguneSteps: amount });
const hit = (amount: number): DamageStepModifiers => ({ physicalHit: amount, kaguneHit: amount });

/** Explicit, automatic damage steps; no conditional placeholders or additional accuracy dice. */
export const damageStepRows: DamageStepRow[] = [
  ["passos-carga-impactante", "Carga Impactante", 4, 8, "Genérica", steps(4)],
  ["passos-golpe-ruptura", "Golpe de Ruptura", 8, 14, "Genérica", { ...steps(8), ...hit(2) }],
  ["passos-pressao-irrestrita", "Pressão Irrestrita", 12, 25, "Genérica", { ...steps(12), ...hit(4) }],
  ["passos-escalada-combate", "Escalada de Combate", 16, 40, "Genérica", { ...steps(25), ...hit(8) }],

  ["passos-forca-quebra-mundo", "Quebra-Mundo", 20, 380, "Força", { physicalSteps: 80, physicalDamage: { attribute: "forca", multiplier: 2 } }, { attribute: "forca", min: 15 }],
  ["passos-vigor-cerco-vivo", "Cerco Vivo", 20, 340, "Vigor", { rd: 40, block: 20, life: 150 }, { attribute: "vigor", min: 15 }],
  ["passos-precisao-ponto-final", "Ponto Final", 20, 400, "Precisão", { kaguneSteps: 80, kaguneHit: 20 }, { attribute: "precisao", min: 15 }],
  ["passos-agilidade-impacto-luz", "Impacto à Velocidade da Luz", 20, 300, "Agilidade", { physicalSteps: 50, dodge: 20, movement: 8 }, { attribute: "agilidade", min: 15 }],
  ["passos-raciocinio-demolicao-exata", "Demolição Exata", 20, 360, "Raciocínio", { ...steps(40), physicalDamage: { attribute: "raciocinio", multiplier: 2 }, kaguneDamage: { attribute: "raciocinio", multiplier: 2 } }, { attribute: "raciocinio", min: 15 }],
  ["passos-percepcao-presa-terminal", "Presa Terminal", 20, 320, "Percepção", { kaguneSteps: 50, initiative: 20, range: 8 }, { attribute: "percepcao", min: 15 }],
  ["passos-presenca-peso-imperio", "Peso de um Império", 20, 300, "Presença", { ...steps(30), sanity: 100 }, { attribute: "presenca", min: 15 }],
  ["passos-controle-comando-catastrofe", "Comando de Catástrofe", 20, 150, "Controle", { ...steps(80), ...hit(20), block: 20, dodge: 20, rc: 100, sanity: 100, weaponRD: 50 }, { attribute: "controle", min: 15 }],

  ["passos-ukaku-penas-perfurantes", "Penas Perfurantes", 5, 10, "Combate", { kaguneSteps: 6, kaguneHit: 2 }, { location: "kakuhou", organGroup: "Ukaku", kaguneTypes: ["Ukaku"], attribute: "controle", min: 3 }],
  ["passos-ukaku-balistica-viva", "Balística Viva", 10, 25, "Combate", { kaguneSteps: 14, kaguneHit: 6, range: 3 }, { location: "kakuhou", organGroup: "Ukaku", kaguneTypes: ["Ukaku"], attribute: "controle", min: 6 }],
  ["passos-ukaku-arsenal-tempestade", "Arsenal de Tempestade", 16, 50, "Combate", { kaguneSteps: 35, kaguneHit: 15, dodge: 10, range: 5 }, { location: "kakuhou", organGroup: "Ukaku", kaguneTypes: ["Ukaku"], attribute: "controle", min: 8 }],
  ["passos-koukaku-massa-cortante", "Massa Cortante", 5, 10, "Combate", { kaguneSteps: 6, rd: 3 }, { location: "kakuhou", organGroup: "Koukaku", kaguneTypes: ["Koukaku"], attribute: "controle", min: 3 }],
  ["passos-koukaku-gume-fortaleza", "Gume de Fortaleza", 10, 25, "Combate", { kaguneSteps: 14, rd: 8, block: 6 }, { location: "kakuhou", organGroup: "Koukaku", kaguneTypes: ["Koukaku"], attribute: "controle", min: 6 }],
  ["passos-koukaku-bastiao-demolidor", "Bastião Demolidor", 16, 50, "Combate", { kaguneSteps: 35, rd: 20, block: 15 }, { location: "kakuhou", organGroup: "Koukaku", kaguneTypes: ["Koukaku"], attribute: "controle", min: 8 }],
  ["passos-rinkaku-tendao-ruptura", "Tendão de Ruptura", 5, 10, "Combate", { kaguneSteps: 6, kaguneDamage: 4 }, { location: "kakuhou", organGroup: "Rinkaku", kaguneTypes: ["Rinkaku"], attribute: "controle", min: 3 }],
  ["passos-rinkaku-ligamentos-carrasco", "Ligamentos de Carrasco", 10, 25, "Combate", { kaguneSteps: 14, kaguneDamage: 10, kaguneHit: 4 }, { location: "kakuhou", organGroup: "Rinkaku", kaguneTypes: ["Rinkaku"], attribute: "controle", min: 6 }],
  ["passos-rinkaku-hidra-dilacerante", "Hidra Dilacerante", 16, 50, "Combate", { kaguneSteps: 40, kaguneDamage: 25, kaguneHit: 10 }, { location: "kakuhou", organGroup: "Rinkaku", kaguneTypes: ["Rinkaku"], attribute: "controle", min: 8 }],
  ["passos-bikaku-cauda-martelo", "Cauda-Martelo", 5, 10, "Combate", { kaguneSteps: 6, block: 2, dodge: 2 }, { location: "kakuhou", organGroup: "Bikaku", kaguneTypes: ["Bikaku"], attribute: "controle", min: 3 }],
  ["passos-bikaku-equilibrio-impacto", "Equilíbrio de Impacto", 10, 25, "Combate", { kaguneSteps: 14, kaguneHit: 6, block: 5, dodge: 5 }, { location: "kakuhou", organGroup: "Bikaku", kaguneTypes: ["Bikaku"], attribute: "controle", min: 6 }],
  ["passos-bikaku-coluna-predador", "Coluna do Predador", 16, 50, "Combate", { kaguneSteps: 35, kaguneHit: 12, block: 12, dodge: 12 }, { location: "kakuhou", organGroup: "Bikaku", kaguneTypes: ["Bikaku"], attribute: "controle", min: 8 }],
];
