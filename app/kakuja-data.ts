import rawModules from "./kakuja-modules.json";

export type KakujaModule = {
  id: string;
  section: string;
  name: string;
  grade: number;
  cb: number;
  ck: number;
  cm: number;
  effect: string;
  category: string;
};

export type KakujaCustomModule = {
  id: string;
  name: string;
  category: string;
  grade: number;
  cb: number;
  cm: number;
  effect: string;
};

export type KakujaProfile = {
  id: string;
  name: string;
  moduleIds: string[];
  customModuleIds: string[];
};

export type KakujaState = {
  name: string;
  description: string;
  cannibalPE: number;
  extraKakujaPE: number;
  complete: boolean;
  active: boolean;
  overload: boolean;
  activationsSinceRest: number;
  currentReserve: number;
  selectedModules: string[];
  selectedInstabilities: string[];
  selectedElements: string[];
  activeElement: string;
  activeTechniques: string[];
  profiles: KakujaProfile[];
  activeProfileId: string;
  customModules: KakujaCustomModule[];
  advantageSteps: number;
  advantageDice: number;
  advantageModifier: number;
  advantageRD: number;
};

export const kakujaModules = rawModules as KakujaModule[];

export const kakujaCaps = {
  6: { cm: 6, passiveSteps: 3, burstSteps: 6, passiveDice: 3, burstDice: 6, rd: 6 },
  8: { cm: 8, passiveSteps: 4, burstSteps: 8, passiveDice: 4, burstDice: 8, rd: 8 },
  10: { cm: 10, passiveSteps: 5, burstSteps: 10, passiveDice: 5, burstDice: 10, rd: 10 },
  12: { cm: 12, passiveSteps: 6, burstSteps: 12, passiveDice: 6, burstDice: 12, rd: 12 },
  14: { cm: 14, passiveSteps: 8, burstSteps: 14, passiveDice: 7, burstDice: 14, rd: 14 },
} as const;

export const kakujaInstabilities = [
  { id: "fome-anormal", name: "Fome Anormal", credit: 2, effect: "Cada ativação de Kakuja concede +1 Fome além de qualquer outra fonte." },
  { id: "mente-rachada", name: "Mente Rachada", credit: 2, effect: "+1 MD em todos os testes de Controle da Kakuja. Completa ainda testa esta Instabilidade uma vez por turno." },
  { id: "nucleo-exposto", name: "Núcleo Exposto", credit: 2, effect: "Ataques ao Kakuhou sofrem apenas -1 dado, e não -2." },
  { id: "hemorragia-rc", name: "Hemorragia de RC", credit: 2, effect: "Na primeira vez que sofrer dano em cada turno, perca 1 RC." },
  { id: "carapaca-fragil", name: "Carapaça Frágil", credit: 2, effect: "Dureza total da Kakuja é reduzida em 25%, arredondando para baixo." },
  { id: "corpo-pesado", name: "Corpo Pesado", credit: 1, effect: "Deslocamento Base não recebe Deslocamento Superior e Esquivas sofrem -1 dado." },
  { id: "frenesi-entrada", name: "Frenesi de Entrada", credit: 1, effect: "No primeiro turno após ativar, deve atacar uma ameaça percebida e não pode usar ação puramente defensiva." },
  { id: "rigidez-anatomica", name: "Rigidez Anatômica", credit: 1, effect: "Não pode trocar Perfis durante a cena, mesmo com Metamorfose; apenas módulos reativos temporários funcionam." },
  { id: "dor-crescimento", name: "Dor de Crescimento", credit: 1, effect: "Ativar causa dano igual ao Grau, ignorando RD. Não ativa efeitos de sofrer dano." },
  { id: "ponto-cego", name: "Ponto Cego", credit: 1, effect: "Escolha uma direção anatômica. Ataques vindos dela recebem +1 dado de acerto até você reposicionar-se." },
  { id: "instinto-territorial", name: "Instinto Territorial", credit: 1, effect: "Depois de escolher um inimigo como presa, trocar de alvo antes de derrubá-lo exige Controle MD 3." },
  { id: "rejeicao-elemental", name: "Rejeição Elemental", credit: 1, effect: "Cada turno mantendo Infusão Elemental custa +1 RC adicional." },
] as const;

export const kakujaElements = [
  { id: "fogo", name: "Fogo / Calor", basic: "O alvo sofre +3 dano no início do próximo turno; não acumula.", elevated: "O dano passa a +5 ou o fogo ocupa 1 espaço até o próximo turno." },
  { id: "gelo", name: "Gelo / Criogenia", basic: "Reduza o próximo deslocamento do alvo em 1 espaço.", elevated: "Além disso, -1 dado na primeira defesa física antes do próximo turno." },
  { id: "eletricidade", name: "Eletricidade", basic: "O alvo não pode fazer ataque de oportunidade até o próximo turno.", elevated: "Teste de Vigor; em falha, perde a Reação até o próximo turno." },
  { id: "acido", name: "Ácido / Corrosão", basic: "Reduza a RD do alvo em 2 contra o próximo ataque recebido.", elevated: "A redução passa a 4; não acumula com outra corrosão." },
  { id: "veneno", name: "Veneno", basic: "1d4 de dano no início dos próximos 2 turnos; novo acerto reinicia.", elevated: "1d6 por 2 turnos ou -1 dado de Vigor enquanto durar." },
  { id: "anestesico", name: "Anestésico", basic: "O próximo ataque do alvo sofre -1 dado de dano.", elevated: "Teste de Vigor; em falha, -2 dados de dano no próximo ataque." },
  { id: "resina", name: "Resina / Adesivo", basic: "O alvo perde 1 espaço do próximo movimento.", elevated: "Segundo acerto antes do fim do turno exige Vigor; falha imobiliza até gastar Movimento." },
  { id: "fumaca", name: "Fumaça / Cinza", basic: "O alvo sofre -1 dado para atacar além de Toque até o próximo turno.", elevated: "Crie ocultação em 1 espaço até seu próximo turno." },
  { id: "nevoa", name: "Névoa", basic: "Você recebe +1 dado na próxima Esquiva contra o alvo.", elevated: "Aliado adjacente também pode receber o bônus." },
  { id: "pressao", name: "Pressão / Vento", basic: "Empurre o alvo 1 espaço se ele falhar em Vigor.", elevated: "Empurre 2 ou derrube; criaturas maiores recebem +2 dados." },
  { id: "vibracao", name: "Vibração / Som", basic: "+2 dados contra objetos, barreiras ou couraças rígidas.", elevated: "Ignore 2 RD de estruturas e revele alvos ocultos atingidos." },
  { id: "cristal", name: "Cristal", basic: "+2 dados de dano em ataque à distância.", elevated: "Em crítico, estilhaços atingem um segundo alvo adjacente com metade dos dados." },
  { id: "metal", name: "Metal / Densidade", basic: "+1 RD até seu próximo turno, mas -1 dado de Esquiva.", elevated: "+2 RD no lugar; a penalidade permanece." },
  { id: "fibra", name: "Fibra / Fios", basic: "+2 dados para agarrar ou impedir fuga com a Kakuja.", elevated: "Ao vencer, puxe 1 espaço ou imponha -2 dados para sair." },
  { id: "luz", name: "Luz / Flash", basic: "O alvo sofre -1 dado na próxima defesa baseada em visão.", elevated: "Teste de Percepção; em falha, -2 dados na próxima ação visual." },
  { id: "sombra", name: "Sombra / Tinta", basic: "O alvo sofre -1 dado de Percepção contra você até o próximo turno.", elevated: "Você pode ocultar sua posição ao mover 1 espaço depois do acerto." },
  { id: "magnetismo", name: "Magnetismo", basic: "+2 dados para Desarmar objeto metálico ou puxá-lo.", elevated: "Ao vencer teste resistido, mova objeto ou alvo metálico 1 espaço." },
  { id: "sifao", name: "Sifão de RC", basic: "Grau 10+. Em falha de Vigor, o alvo perde 1 RC; você não recupera.", elevated: "O alvo perde 2 RC e você recupera 1; uma vez por turno." },
] as const;

export const authorialBases = [
  { id: "dado-condicional", label: "+1 dado condicional", cb: 4, cm: 1, rule: "Condição clara: mover, bloquear, alvo ferido ou mesma presa." },
  { id: "dados-passivos", label: "+2 dados passivos", cb: 6, cm: 1, rule: "Conta no teto passivo." },
  { id: "acerto", label: "+1 Modificador de Acerto", cb: 10, cm: 1, rule: "Máximo +2 vindo da Kakuja." },
  { id: "passo-passivo", label: "+1 Passo passivo", cb: 4, cm: 1, rule: "Use a progressão de Potência e os mesmos requisitos de Grau." },
  { id: "passos-ataque-2", label: "+2 Passos por ataque", cb: 8, cm: 1, rule: "Exige 3 a 5 RC ou condição relevante." },
  { id: "passos-ataque-4", label: "+4 Passos por ataque", cb: 12, cm: 2, rule: "Exige 8 RC e consequência no turno seguinte." },
  { id: "rd", label: "+2 RD", cb: 6, cm: 1, rule: "Conta no teto de RD." },
  { id: "reduzir-grau", label: "Reduzir dano em metade do Grau", cb: 6, cm: 1, rule: "Reação ou uma vez por rodada; 2 a 3 RC." },
  { id: "dividir-dano", label: "Dividir dano restante por 2", cb: 12, cm: 2, rule: "Depois da RD; 6 RC; uma vez por rodada." },
  { id: "alcance", label: "+1 espaço de alcance ou movimento", cb: 6, cm: 1, rule: "Não cria ataque nem atravessa barreira." },
  { id: "ignorar-rd-2", label: "Ignorar 2 RD", cb: 8, cm: 1, rule: "4 RC, uma vez por turno." },
  { id: "ignorar-meia-rd", label: "Ignorar metade da RD", cb: 12, cm: 2, rule: "7 RC, Grau 8+, uma vez por turno." },
  { id: "ataque-adicional", label: "Ataque adicional com metade dos dados", cb: 12, cm: 2, rule: "5 RC, Grau 8+, máximo universal de um." },
  { id: "segundo-alvo", label: "Segundo alvo com metade dos dados", cb: 8, cm: 1, rule: "Um teste; -2 Passos no dano compartilhado." },
  { id: "condicao-leve", label: "Condição leve", cb: 6, cm: 1, rule: "Teste ou gatilho; -1 dado, puxar, empurrar ou reduzir movimento." },
  { id: "condicao-forte", label: "Condição forte", cb: 12, cm: 2, rule: "Teste, 5 a 8 RC e imunidade na rodada seguinte." },
  { id: "cura-fixa", label: "Cura fixa 2 a 4", cb: 8, cm: 1, rule: "No início do turno e com limiar de RC/Fome." },
  { id: "cura-percentual", label: "Cura percentual ou prevenção de morte", cb: 16, cm: 3, rule: "Grau 10+, uso por sessão e custo alto." },
] as const;

export const authorialAdjustments = [
  { id: "sempre-ativo", label: "Sempre ativo e sem condição", cb: 4, cm: 0, rule: "Use quando a referência normalmente seria limitada." },
  { id: "reacao", label: "Reação", cb: 2, cm: 0, rule: "Além do custo normal do efeito." },
  { id: "area-1", label: "Área de 1 espaço", cb: 4, cm: 1, rule: "+1 CM e uma única rolagem." },
  { id: "area-2", label: "Área de 2 ou mais", cb: 8, cm: 2, rule: "+2 CM e Grau 8+." },
  { id: "sem-teste", label: "Sem teste para condição", cb: 6, cm: 0, rule: "Nunca permitido para condição forte recorrente." },
  { id: "custo-rc", label: "Custo 5 RC ou maior", cb: -2, cm: 0, rule: "Redução máxima -4 por custos e riscos." },
  { id: "cena", label: "Uma vez por cena", cb: -2, cm: 0, rule: "Não reduz abaixo de CB 4." },
  { id: "sessao", label: "Uma vez por sessão", cb: -4, cm: 0, rule: "Exige consequência real e não reduz abaixo de CB 8." },
  { id: "sacrificio", label: "Sacrifício de RD, membro ou ataque", cb: -2, cm: 0, rule: "O recurso sacrificado precisa ter valor na build." },
  { id: "fome", label: "+1 Fome após uso", cb: -2, cm: 0, rule: "Máximo -2; não combina com defeito que já torna a Fome inevitável." },
] as const;

export const universalKakujaRules = [
  { title: "Órgãos separados", text: "Kagune e Kakuja têm cálculos independentes. A Kakuja começa com 1/3 dos Passos naturais da Kagune, arredondado para baixo. Efeitos, evoluções e multiplicadores diretos da Kagune não entram; Vantagens podem afetar a Kakuja." },
  { title: "Ataques adicionais", text: "No máximo um por turno; metade da quantidade total de dados, mínimo 1. Não critica, não ativa efeitos ao acertar, não recupera RC, não vira área e não gera outro ataque." },
  { title: "Perfis e CM", text: "Módulos comprados formam o repertório permanente. Cada Perfil manifesta apenas o que cabe na CM do Grau; trocar durante a cena exige uma mutação própria." },
  { title: "Condições fortes", text: "Paralisia, perda de Ação, supressão de Reação ou imobilização total exigem teste contra a MD do Ghoul, custam RC e não travam o mesmo alvo em rodadas consecutivas." },
  { title: "Elementos", text: "Somente um dano elemental e um Condutor afetam o mesmo ataque. Núcleo Duplo permite alternar; Reação Híbrida permite dois Condutores sem duplicar o dano." },
  { title: "Regeneração", text: "Curas fixas podem somar. Multiplicadores não: use apenas o maior. Regeneração de membros, cura total e prevenção de morte não recebem multiplicador." },
  { title: "Área", text: "Faça um único teste e uma única rolagem de dano. Custos, críticos, RC e gatilhos são resolvidos uma vez, não por alvo." },
  { title: "Finalizadores", text: "Usam o teto de explosão e não combinam com condensação, sacrifício de golpes, Ataque Devastador ou finalizador equivalente." },
] as const;

export function blankKakujaState(): KakujaState {
  const profiles = Array.from({ length: 4 }, (_, index) => ({
    id: `perfil-${index + 1}`,
    name: `Perfil ${index + 1}`,
    moduleIds: [],
    customModuleIds: [],
  }));
  return {
    name: "",
    description: "",
    cannibalPE: 0,
    extraKakujaPE: 0,
    complete: false,
    active: false,
    overload: false,
    activationsSinceRest: 0,
    currentReserve: 0,
    selectedModules: [],
    selectedInstabilities: [],
    selectedElements: [],
    activeElement: "",
    activeTechniques: [],
    profiles,
    activeProfileId: profiles[0].id,
    customModules: [],
    advantageSteps: 0,
    advantageDice: 0,
    advantageModifier: 0,
    advantageRD: 0,
  };
}
