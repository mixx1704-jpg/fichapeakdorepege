import type { Evolution } from './data';

export const masteryEvolutions: Evolution[] = [
  {id:'eixo-aco',name:'Eixo de Aço',cost:10,grade:8,family:'Koukaku',description:'Com a Kagune manifestada, +2 dados de acerto em todos os ataques com ela, inclusive ataques extras e contra-ataques já disponíveis.'},
  {id:'arquitetura-cerco',name:'Arquitetura de Cerco',cost:12,grade:10,family:'Koukaku',maxRank:2,rankCosts:[12,16],rankGrades:[10,12],requiresEvolutions:['eixo-aco'],requirement:'Eixo de Aço; N1: Grau 10; N2: Grau 12',description:'Com a Kagune manifestada, N1 concede +2 dados de acerto; N2 substitui esse bônus por +4. Soma com Eixo de Aço: +4/+6 dados no total. Custos adicionais: 12 PE e 16 PE.'},
  {id:'lamina-telescopica',name:'Lâmina Telescópica',cost:8,grade:8,family:'Koukaku',description:'Com a Kagune manifestada, +2 metros de alcance corpo a corpo, além do alcance adquirido. Não reduz dano, RD ou Dureza e não transforma o golpe em ataque à distância.'},
  {id:'guarda-estrutural',name:'Guarda Estrutural',cost:10,grade:10,family:'Koukaku',description:'Com a Kagune manifestada, +2 dados de Bloqueio com ela e +2 dados para resistir a empurrões e derrubadas. Funciona nos modos ofensivo e defensivo; não concede outra defesa.'},
  {id:'nucleo-impacto',name:'Núcleo de Impacto',cost:12,grade:10,family:'Koukaku',description:'Com a Kagune manifestada, some metade do Vigor base, arredondada para baixo, aos Passos de Dano de todos os seus ataques. Vigor base 8 concede +4 Passos. Não aumenta o modificador fixo de dano.'},
  {id:'sinapse-distribuida',name:'Sinapse Distribuída',cost:12,grade:8,family:'Rinkaku',description:'Com a Kagune manifestada, +2 dados de acerto em todos os ataques com ela, incluindo cada cauda. Não exige preparação ou acertos anteriores.'},
  {id:'consciencia-tentacular',name:'Consciência Tentacular',cost:8,grade:10,family:'Rinkaku',maxRank:3,rankCosts:[8,10,12],rankGrades:[10,10,12],requiresEvolutions:['sinapse-distribuida'],requirement:'Sinapse Distribuída; N1/N2: Grau 10; N3: Grau 12',description:'Com a Kagune manifestada, +1/+2/+3 dados de acerto em N1/N2/N3. O maior nível substitui os anteriores. Soma com Sinapse Distribuída, até +5 dados em cada cauda. Custos adicionais: 8, 10 e 12 PE.'},
  {id:'tendoes-longo-alcance',name:'Tendões de Longo Alcance',cost:8,grade:8,family:'Rinkaku',description:'Com a Kagune manifestada, +2 metros de alcance corpo a corpo das caudas. Vale para ataques, agarrões, objetos e técnicas de cauda; não concede ações adicionais.'},
  {id:'circuito-rc-eficiente',name:'Circuito RC Eficiente',cost:12,grade:10,family:'Rinkaku',description:'Com a Kagune manifestada, cada ataque de cauda que já custa RC fica 1 RC mais barato, mínimo 1 RC. Ataques gratuitos continuam gratuitos. Não reduz criação de caudas, regeneração, elementos ou técnicas anexadas ao golpe.'},
  {id:'trama-sustentacao',name:'Trama de Sustentação',cost:10,grade:10,family:'Rinkaku',description:'Com a Kagune manifestada, elimina a penalidade de Dureza por nível de Múltiplas Caudas e acrescenta +5 à Dureza de cada cauda. Não aumenta os PV do personagem nem a RD.'},
  {id:'instinto-exatidao',name:'Instinto de Exatidão',cost:8,grade:8,family:'Bikaku',description:'Com a Kagune manifestada, +2 dados de acerto em todos os ataques com ela. Não exige preparação, alvo marcado ou uma postura específica.'},
  {id:'dominio-centro',name:'Domínio do Centro',cost:12,grade:10,family:'Bikaku',maxRank:2,rankCosts:[12,16],rankGrades:[10,12],requiresEvolutions:['instinto-exatidao'],requirement:'Instinto de Exatidão; N1: Grau 10; N2: Grau 12',description:'Com a Kagune manifestada, N1 concede +3 dados de acerto; N2 substitui esse bônus por +5. Soma com Instinto de Exatidão: +5/+7 dados no total. Custos adicionais: 12 PE e 16 PE.'},
  {id:'equilibrio-absoluto',name:'Equilíbrio Absoluto',cost:14,grade:10,family:'Bikaku',description:'Com a Kagune manifestada, +2 dados de Bloqueio e +2 dados de Esquiva. Ambos os bônus permanecem em qualquer postura, sem conceder uma segunda defesa.'},
  {id:'gume-integral',name:'Gume Integral',cost:10,grade:10,family:'Bikaku',description:'Com a Kagune manifestada, +2 Passos de Dano em todos os ataques com ela. Soma com Predador Perfeito ou Mestre de Nada e permanece nas posturas defensivas.'},
  {id:'continuidade-predatoria',name:'Continuidade Predatória',cost:12,grade:10,family:'Bikaku',description:'Com a Kagune manifestada, +1 espaço de Deslocamento. Divida o Movimento disponível antes, entre e depois dos ataques. Não concede ataques, não renova Movimento e não impede reações inimigas.'},
];

export function masteryBonuses(selected: string[], manifested: boolean, baseVigor: number) {
  const rank = (id: string, max = 1) => manifested ? Math.min(max, selected.filter(x => x === id).length) : 0;
  const architecture = rank('arquitetura-cerco',2), center = rank('dominio-centro',2);
  return {
    hit: 2 * (rank('eixo-aco') + rank('sinapse-distribuida') + rank('instinto-exatidao')) + 2 * architecture + rank('consciencia-tentacular',3) + (center ? 1 + 2 * center : 0),
    steps: (rank('nucleo-impacto') ? Math.floor(Math.max(0,baseVigor)/2) : 0) + 2 * rank('gume-integral'),
    range: 2 * (rank('lamina-telescopica') + rank('tendoes-longo-alcance')),
    block: 2 * (rank('guarda-estrutural') + rank('equilibrio-absoluto')),
    dodge: 2 * rank('equilibrio-absoluto'),
    stability: 2 * rank('guarda-estrutural'),
    movement: rank('continuidade-predatoria'),
    tailDurability: 5 * rank('trama-sustentacao'),
    noTailPenalty: Boolean(rank('trama-sustentacao')),
    efficientTailRC: Boolean(rank('circuito-rc-eficiente')),
  };
}

export function tailAttackCost(baseCost: number, efficient: boolean) {
  return baseCost <= 0 ? 0 : Math.max(1, baseCost - (efficient ? 1 : 0));
}

export function growthBonus(stacks: number, tails: number) {
  return 2 * Math.min(Math.max(0, Math.floor(tails)), Math.max(0, Math.floor(stacks)));
}
