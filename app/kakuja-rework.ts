import {kakujaBiologyPerks,type KakujaBiologicalProperties} from './kakuja-biology-perks';

/** Kakuja rework: permanent purchases, explicit effects, and additive d20 accuracy. */
export type KakujaBonuses = {
  accuracy: number; block: number; dodge: number; steps: number; modifier: number;
  rd: number; durability: number; reserve: number; regeneration: number; extraAttacks: number;
};
export type KakujaReworkPerk = {
  id: string; sourceId: string; name: string; cost: number; grade: number; cm: number;
  category: string; usage: string; requirement: string; effect: string; sourcePage: number;
  requiresModules: string[]; requiresElements: string[]; minElements: number;
  currency: "PE-K"; activation: "passive" | "active"; bonuses: Partial<KakujaBonuses>;
  requiresFamily?: string; requiresComplete?: boolean;
  requiresAttribute?: {attribute:string;min:number}; biology?:KakujaBiologicalProperties;
};

const perk = (slug: string, name: string, grade: number, cost: number, category: string,
  bonuses: Partial<KakujaBonuses>, effect: string, options: { family?: string; complete?: boolean; rc?: number } = {}): KakujaReworkPerk => ({
  id: `k20-${slug}`, sourceId: "REWORK", name, grade, cost, cm: 0, category: category === "Apex" ? "Ápice" : category,
  currency: "PE-K", activation: options.rc ? "active" : "passive", bonuses,
  usage: options.rc ? `Técnica · ${options.rc} RC por turno ativo` : "Passiva · Kakuja manifestada",
  requirement: `Level ${grade}+, Kakuja desbloqueada${options.family ? ` e ${options.family}` : ""}${options.complete ? ", forma completa" : ""}.`,
  effect, sourcePage: 0, requiresModules: [], requiresElements: [], minElements: 0,
  requiresFamily: options.family, requiresComplete: options.complete,
});

const coreKakujaPerks: KakujaReworkPerk[] = [
  perk("instinto-soberano", "Instinto Soberano", 6, 5, "Domínio e Controle", { accuracy: 5, block: 5, dodge: 5 }, "Seu corpo monstruoso responde sem hesitar: +5 acerto, +5 bloqueio e +5 desvio enquanto a Kakuja estiver manifestada."),
  perk("musculatura-abissal", "Musculatura Abissal", 6, 5, "Potência", { steps: 8, modifier: 6 }, "+8 Passos de Dano e +6 dano fixo em todos os ataques da Kakuja."),
  perk("bastiao-vivo", "Bastião Vivo", 6, 5, "Defesa", { rd: 6, durability: 20 }, "+6 RD própria e +20 Dureza da Kakuja. Funciona em toda defesa, sem gastar reação."),
  perk("sangue-inextinguivel", "Sangue Inextinguível", 6, 5, "Regeneração", { regeneration: 5, reserve: 12 }, "+5 regeneração por turno e +12 RC na reserva própria da Kakuja."),
  perk("mira-predatoria", "Mira Predatória", 7, 6, "Domínio e Controle", { accuracy: 8 }, "+8 acerto em todos os ataques da Kakuja; soma normalmente aos demais modificadores."),
  perk("carapaca-de-guerra", "Carapaça de Guerra", 7, 6, "Defesa", { rd: 8, block: 4 }, "+8 RD própria e +4 bloqueio. Placas móveis mantêm a força defensiva em movimento."),
  perk("motor-carniceiro", "Motor Carniceiro", 8, 7, "Potência", { steps: 12, modifier: 8 }, "+12 Passos de Dano e +8 dano fixo em todos os ataques da Kakuja."),
  perk("nucleo-duplo-rc", "Núcleo Duplo de RC", 8, 6, "Regeneração", { reserve: 24, regeneration: 4 }, "+24 RC de reserva própria e +4 regeneração por turno enquanto manifestada."),
  perk("cerebro-colmeia", "Cérebro Colmeia", 9, 7, "Domínio e Controle", { accuracy: 6, block: 6, dodge: 6 }, "+6 acerto, bloqueio e desvio. A percepção da Kakuja acompanha todos os membros como um só corpo."),
  perk("blindagem-imperial", "Blindagem Imperial", 9, 7, "Defesa", { rd: 10, durability: 35 }, "+10 RD própria e +35 Dureza da Kakuja, cumulativos com sua carapaça e módulos."),
  perk("arsenal-insaciavel", "Arsenal Insaciável", 10, 8, "Potência", { steps: 16, accuracy: 5 }, "+16 Passos de Dano e +5 acerto. Toda arma orgânica da Kakuja recebe o bônus."),
  perk("metabolismo-rei", "Metabolismo do Rei", 10, 8, "Regeneração", { regeneration: 8, reserve: 20 }, "+8 regeneração por turno e +20 RC de reserva própria. Não exige estar perto da morte."),
  perk("sobrecarga-assassina", "Sobrecarga Assassina", 11, 8, "Técnicas de combate", { steps: 20, accuracy: 8, extraAttacks: 1 }, "Ative por 4 RC por turno: +20 Passos de Dano, +8 acerto e um ataque adicional com metade dos Passos. O ataque adicional respeita a janela universal de um por turno, sem crítico ou novas cadeias.", { rc: 4 }),
  perk("muralha-carnivora", "Muralha Carnívora", 11, 8, "Defesa", { rd: 12, block: 8 }, "+12 RD própria e +8 bloqueio; protege em todos os turnos da manifestação."),
  perk("monarca-completo", "Monarca Completo", 12, 10, "Domínio e Controle", { accuracy: 10, block: 10, dodge: 10 }, "+10 acerto, bloqueio e desvio na forma completa. O domínio mental sustenta força e precisão juntas.", { complete: true }),
  perk("anatomia-catastrofe", "Anatomia da Catástrofe", 12, 10, "Potência", { steps: 20, modifier: 15 }, "+20 Passos de Dano e +15 dano fixo em todos os ataques da Kakuja completa.", { complete: true }),
  perk("coracao-leviata", "Coração de Leviatã", 13, 10, "Regeneração", { regeneration: 12, reserve: 30 }, "+12 regeneração por turno e +30 RC na reserva própria da Kakuja."),
  perk("pele-de-fortaleza", "Pele de Fortaleza", 13, 10, "Defesa", { rd: 16, durability: 60 }, "+16 RD própria e +60 Dureza da Kakuja. Um reforço permanente de defesa da forma."),
  perk("trono-predador", "Trono do Predador", 14, 12, "Domínio e Controle", { accuracy: 15, block: 8, dodge: 8 }, "+15 acerto, +8 bloqueio e +8 desvio, somados a todos os bônus atuais."),
  perk("mandibula-apocalipse", "Mandíbula do Apocalipse", 14, 12, "Potência", { steps: 25, modifier: 20 }, "+25 Passos de Dano e +20 dano fixo. Todo ataque normal da Kakuja recebe os dois bônus."),
  perk("segunda-anatomia", "Segunda Anatomia", 15, 14, "Regeneração", { regeneration: 15, durability: 80 }, "+15 regeneração por turno e +80 Dureza da Kakuja completa.", { complete: true }),
  perk("barreira-soberana", "Barreira Soberana", 15, 14, "Defesa", { rd: 20, block: 12 }, "+20 RD própria e +12 bloqueio na Kakuja completa.", { complete: true }),
  perk("execucao-imperial", "Execução Imperial", 16, 15, "Técnicas de combate", { steps: 40, accuracy: 15, modifier: 20 }, "Ative por 7 RC por turno: +40 Passos de Dano, +15 acerto e +20 dano fixo na forma completa.", { complete: true, rc: 7 }),
  perk("vontade-inabalavel", "Vontade Inabalável", 16, 15, "Domínio e Controle", { accuracy: 15, block: 15, dodge: 15 }, "+15 acerto, bloqueio e desvio. O dado de sanidade continua respeitando sua porcentagem atual."),
  perk("nucleo-imortal", "Núcleo Imortal", 17, 16, "Regeneração", { regeneration: 20, reserve: 50 }, "+20 regeneração por turno e +50 RC na reserva própria da Kakuja completa.", { complete: true }),
  perk("couraça-titã", "Couraça do Titã", 17, 16, "Defesa", { rd: 25, durability: 100 }, "+25 RD própria e +100 Dureza da Kakuja completa.", { complete: true }),
  perk("cataclismo-vivo", "Cataclismo Vivo", 18, 18, "Potência", { steps: 40, modifier: 30 }, "+40 Passos de Dano e +30 dano fixo em cada ataque da Kakuja completa.", { complete: true }),
  perk("olhar-do-rei", "Olhar do Rei", 18, 18, "Domínio e Controle", { accuracy: 20, block: 15, dodge: 15 }, "+20 acerto, +15 bloqueio e +15 desvio. Seu domínio excede os limites de um corpo comum."),
  perk("fortaleza-final", "Fortaleza Final", 19, 20, "Defesa", { rd: 30, block: 20, durability: 120 }, "+30 RD própria, +20 bloqueio e +120 Dureza da Kakuja completa.", { complete: true }),
  perk("fome-sem-fim", "Fome Sem Fim", 19, 20, "Regeneração", { regeneration: 25, reserve: 80 }, "+25 regeneração por turno e +80 RC de reserva própria na forma completa.", { complete: true }),
  perk("deus-devorador", "Deus Devorador", 20, 320, "Apex", { steps: 60, modifier: 40, accuracy: 20 }, "+60 Passos de Dano, +40 dano fixo e +20 acerto em todos os ataques da Kakuja completa. Gula de Guerra: gaste de 1 a 10 RC da reserva própria para amplificar um único dano bruto rolado em até 25%, antes da RD. Use o controlador Técnicas supremas; percentual e bônus são arredondados para baixo. Não reaplique no mesmo golpe.", { complete: true }),
  perk("soberano-eterno", "Soberano Eterno", 20, 300, "Apex", { rd: 40, block: 20, dodge: 20, regeneration: 30, reserve: 100 }, "+40 RD própria, +20 bloqueio e desvio, +30 regeneração por turno e +100 RC de reserva própria na forma completa. Revestimento Adaptativo: gaste de 1 a 10 RC da reserva própria para absorver dano pós-RD, até o menor entre 50% do impacto e 10 PV por RC gasto. O controlador gera a sobra para aplicar uma única vez no VATS.", { complete: true }),
  perk("ukaku-tempestade", "Ukaku: Tempestade Soberana", 6, 6, "Ukaku", { accuracy: 6, steps: 10 }, "+6 acerto e +10 Passos de Dano para a Kakuja Ukaku. Todas as rajadas recebem o bônus.", { family: "Ukaku" }),
  perk("ukaku-canhao", "Ukaku: Canhão Celestial", 10, 9, "Ukaku", { steps: 20, modifier: 12 }, "+20 Passos de Dano e +12 dano fixo em todos os disparos da Kakuja Ukaku.", { family: "Ukaku" }),
  perk("ukaku-anjo", "Ukaku: Anjo da Ruína", 14, 13, "Ukaku", { accuracy: 14, dodge: 14, steps: 18 }, "+14 acerto e desvio e +18 Passos de Dano. Mobilidade e artilharia crescem juntas.", { family: "Ukaku" }),
  perk("ukaku-supernova", "Ukaku: Supernova", 18, 20, "Ukaku", { steps: 45, accuracy: 20 }, "Ative por 6 RC por turno: +45 Passos de Dano e +20 acerto à artilharia da Kakuja completa.", { family: "Ukaku", complete: true, rc: 6 }),
  perk("koukaku-bastiao", "Koukaku: Bastião de Aço", 6, 6, "Koukaku", { rd: 8, block: 6 }, "+8 RD própria e +6 bloqueio para a Kakuja Koukaku.", { family: "Koukaku" }),
  perk("koukaku-carrasco", "Koukaku: Carrasco Blindado", 10, 9, "Koukaku", { steps: 18, rd: 8 }, "+18 Passos de Dano e +8 RD própria: bater mais forte também mantém sua defesa.", { family: "Koukaku" }),
  perk("koukaku-fortaleza", "Koukaku: Fortaleza Imperial", 14, 13, "Koukaku", { rd: 18, durability: 70, block: 10 }, "+18 RD própria, +70 Dureza e +10 bloqueio para a Kakuja Koukaku.", { family: "Koukaku" }),
  perk("koukaku-titã", "Koukaku: Titã de Extermínio", 18, 20, "Koukaku", { steps: 35, rd: 25, block: 15 }, "+35 Passos de Dano, +25 RD própria e +15 bloqueio na forma completa.", { family: "Koukaku", complete: true }),
  perk("rinkaku-hidra", "Rinkaku: Hidra Faminta", 6, 6, "Rinkaku", { steps: 12, regeneration: 5 }, "+12 Passos de Dano e +5 regeneração por turno para a Kakuja Rinkaku.", { family: "Rinkaku" }),
  perk("rinkaku-caudas", "Rinkaku: Cem Caudas", 10, 9, "Rinkaku", { steps: 22, accuracy: 6 }, "+22 Passos de Dano e +6 acerto; toda a anatomia ofensiva recebe o bônus.", { family: "Rinkaku" }),
  perk("rinkaku-renascimento", "Rinkaku: Renascimento Voraz", 14, 13, "Rinkaku", { regeneration: 18, steps: 20 }, "+18 regeneração por turno e +20 Passos de Dano. Feridas não interrompem sua pressão.", { family: "Rinkaku" }),
  perk("rinkaku-orochi", "Rinkaku: Orochi Eterno", 18, 20, "Rinkaku", { steps: 45, regeneration: 25, accuracy: 12 }, "+45 Passos de Dano, +25 regeneração por turno e +12 acerto na Kakuja completa.", { family: "Rinkaku", complete: true }),
  perk("bikaku-predador", "Bikaku: Predador Integral", 6, 6, "Bikaku", { accuracy: 6, block: 4, dodge: 4, steps: 6 }, "+6 acerto e Passos de Dano e +4 bloqueio e desvio para a Kakuja Bikaku.", { family: "Bikaku" }),
  perk("bikaku-equilibrio", "Bikaku: Equilíbrio Imperial", 10, 9, "Bikaku", { accuracy: 10, rd: 8, steps: 12 }, "+10 acerto, +8 RD própria e +12 Passos de Dano em toda a manifestação.", { family: "Bikaku" }),
  perk("bikaku-monarca", "Bikaku: Monarca da Caçada", 14, 13, "Bikaku", { accuracy: 15, block: 12, dodge: 12, steps: 18 }, "+15 acerto, +12 bloqueio e desvio e +18 Passos de Dano.", { family: "Bikaku" }),
  perk("bikaku-perfeito", "Bikaku: Organismo Perfeito", 18, 20, "Bikaku", { accuracy: 20, steps: 30, rd: 18, regeneration: 12 }, "+20 acerto, +30 Passos de Dano, +18 RD própria e +12 regeneração por turno na forma completa.", { family: "Bikaku", complete: true }),
];

export const kakujaReworkPerks:KakujaReworkPerk[]=[...coreKakujaPerks,...kakujaBiologyPerks];

export const emptyKakujaBonuses = (): KakujaBonuses => ({ accuracy: 0, block: 0, dodge: 0, steps: 0, modifier: 0, rd: 0, durability: 0, reserve: 0, regeneration: 0, extraAttacks: 0 });
