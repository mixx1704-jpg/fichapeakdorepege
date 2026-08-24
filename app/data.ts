import { combatManeuvers, expansionEvolutions, expansionKaguneEffects, expansionPerks } from "./expansion-data";

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

export const archetypes = [
  { name: "O Protetor", ability: "Como Reação, intercepte um golpe contra um aliado: receba metade do dano, anule a outra metade e armazene o dano recebido para fortalecer um ataque futuro. Um golpe armazenado por vez." },
  { name: "O Justiceiro", ability: "Contra alguém que feriu você ou cometeu uma injustiça, receba +1 dado de acerto e +2 Passos de Dano." },
  { name: "O Hedonista", ability: "Quando a ação estiver diretamente ligada ao seu prazer, receba +2 dados ou +3 Passos de Dano." },
  { name: "O Idealista", ability: "Ao agir movido por sua convicção, adicione metade do Controle em uma rolagem." },
  { name: "O Mártir", ability: "Receba no lugar de um aliado uma penalidade, dano, perda de item, Mácula ou efeito negativo." },
  { name: "O Sobrevivente", ability: "Guarde o resultado de um dado, rerrole-o e use o resultado guardado para substituir uma rolagem futura. Um resultado armazenado por vez." },
  { name: "O Niilista", ability: "Ignore completamente o dano mental de uma fonte." },
  { name: "O Obsessivo", ability: "Ignore uma penalidade momentânea ou uma situação ruim que impediria seu objetivo." },
  { name: "O Insaciável", ability: "Repita uma rolagem comum ou de dano e some metade dos acertos da rolagem anterior ao novo resultado." },
  { name: "O Palhaço", ability: "Inverta uma rolagem visível: sucesso vira falha ou falha vira sucesso; o Narrador cria uma nova complicação." },
] as const;

export const speciesOptions = [
  { id: "humano", label: "Humano", lifeBase: 2, cap: 6, creationGrant: 6, subCost: 0, hasKagune: false, hasHunger: false, summary: "+2 Vida Base, +6 PE de criação, +1 Atributo Mental e uma rerrolagem por sessão." },
  { id: "ghoul", label: "Ghoul", lifeBase: 5, cap: 8, creationGrant: 0, subCost: 0, hasKagune: true, hasHunger: true, summary: "+5 Vida Base, Kakuhou, Kagune, RC e Fome." },
  { id: "humano-dominante", label: "Híbrido — Humano Dominante", lifeBase: 4, cap: 8, creationGrant: 6, subCost: 6, hasKagune: false, hasHunger: false, summary: "Base humana, +2 em um Atributo Físico e 6 PE para efeitos passivos de Kakuhou." },
  { id: "ghoul-dominante", label: "Híbrido — Ghoul Dominante", lifeBase: 4, cap: 8, creationGrant: 0, subCost: 8, hasKagune: true, hasHunger: true, summary: "+1 em dois Atributos Físicos diferentes e efeitos de Kagune custam -3 PE (mínimo 1)." },
  { id: "ghoul-artificial", label: "Ghoul Artificial", lifeBase: 3, cap: 8, creationGrant: 6, subCost: 6, hasKagune: true, hasHunger: true, summary: "Base humana e Ghoul, +1 Mental, +1 Físico, +3 Vida Base, Kakuhou, Kagune, RC e Fome. Pode usar a variação Humano-Dominante sem herdar suas fraquezas." },
  { id: "quinx", label: "Quinx", lifeBase: 4, cap: 8, creationGrant: 6, subCost: 6, hasKagune: true, hasHunger: false, summary: "+4 Vida Base, Frame, Carga Instintiva e Kagune implantada." },
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
}

const perk = (
  id: string,
  name: string,
  category: CatalogCategory,
  cost: number | number[],
  description: string,
  options: Partial<Perk> = {},
): Perk => ({ id, name, category, cost, description, ...options });

const ghoulSpecies: SpeciesId[] = ["ghoul", "ghoul-dominante", "ghoul-artificial"];

export const perks: Perk[] = [
  perk("terapeuta", "Terapeuta", "Genérica", 5, "A terapia pode recuperar Sanidade."),
  perk("atante-medicina", "Atante de medicina", "Genérica", 6, "+1 dado em Medicina; toda cura executada recebe +Grau."),
  perk("determinado-salvar", "Determinado a Salvar!", "Genérica", 3, "Permite gastar Determinação para beneficiar outra pessoa."),
  perk("apostador", "Apostador", "Genérica", 6, "Três vezes por Descanso Longo, trate uma Ação Especial como se tivesse gasto 2 RC."),
  perk("arma-favorita", "Arma favorita", "Genérica", 5, "+1 dado de acerto e Passos de Dano extras conforme o Atributo Principal. Não vale para Kagune.", { requirement: "Após uso recorrente" }),
  perk("sommelier-rebanho", "Sommelier de Rebanho", "Genérica", 3, "Um humano com a característica escolhida conta como Ghoul para PE e Fome; não conta para o mínimo da Kakuja.", { species: ghoulSpecies }),
  perk("identidade-falsa", "Identidade Falsa", "Genérica", 5, "Crie documentação e uma identidade secundária funcional."),
  perk("caminhante-vidro", "Caminhante de Vidro", "Genérica", 3, "+1 dado de Raciocínio sobre uma cidade escolhida e vantagens narrativas de familiaridade."),
  perk("apreciador-comida", "Apreciador de comida humana", "Genérica", 5, "Você consegue fingir o consumo de comida humana; ainda há risco de intoxicação se não vomitar.", { species: ghoulSpecies }),
  perk("paciente", "Paciente", "Genérica", 3, "Uma vez por sessão, refaça uma falha do Atributo escolhido e use o melhor resultado.", { targetAttribute: "any" }),
  perk("estomago-acougueiro", "Estômago de Açougueiro", "Genérica", 3, "Carne congelada reduz Fome como carne fresca; o PE obtido continua 1.", { species: ghoulSpecies }),
  perk("contatos", "Contatos", "Genérica", [3, 4, 5], "Escolha um grupo social. Investimento maior amplia o acesso a informações e recursos.", { costMode: "choice", maxRank: 3 }),
  perk("nunca-prostra", "Aquele que nunca se prostra", "Genérica", 6, "Determinação passa a ser Controle +4 e recupera 3 em Descanso Longo."),
  perk("jejuante", "O Jejuante", "Genérica", 6, "+2 dados contra Fome e ignore os efeitos dos estágios 1 a 3.", { species: ghoulSpecies }),
  perk("aliado", "Aliado", "Genérica", 3, "Receba um aliado humano de Grau 2 e libere melhorias próprias."),
  perk("barao", "Barão", "Genérica", [3, 4, 5, 6], "Cada ponto investido representa um nível adicional de riqueza.", { costMode: "choice", maxRank: 4 }),
  perk("refugio", "Refúgio", "Genérica", 3, "Tenha um local simples e permanente e libere melhorias de segurança, recursos e função."),
  ...attributeKeys.map((key) => perk(`acurado-${key}`, `Acurado — ${attributeLabels[key]}`, "Genérica", 5, `+1 em ${attributeLabels[key]}, podendo superar o limite de Grau.`, {})),
  perk("corpo-pesado", "Corpo Pesado", "Genérica", 3, "+1 dado em Vigor para Bloqueio."),
  perk("corpo-leve", "Corpo Leve", "Genérica", 3, "+1 dado em Agilidade para Esquiva."),
  perk("frio-calculista", "Frio e Calculista", "Genérica", 3, "+1 dado nos testes de Sanidade ou Fome, conforme a escolha."),
  perk("psicopatia", "Psicopatia", "Genérica", 5, "Você não possui Alicerces; hábitos definidos passam a recuperar sua Sanidade."),
  perk("observador-frio", "Observador Frio", "Genérica", 3, "+1 dado de Raciocínio para perceber intenções, manipulações e blefes."),
  perk("furioso", "Furioso", "Genérica", [3, 5, 7, 9], "Cada compra concede +1 Passo de Dano em todos os ataques do personagem.", { costMode: "sum", maxRank: 4 }),
  perk("aliado-grau", "Grau Superior — Aliado", "Genérica", 3, "Aumente o Grau do Aliado em 2.", { requirement: "Aliado", maxRank: 6 }),
  perk("aliado-prioritario", "Prioritário — Aliado", "Genérica", 3, "Pedidos feitos ao Aliado recebem alta prioridade.", { requirement: "Aliado" }),
  perk("aliado-ghoul", "Ghoul — Aliado", "Genérica", 5, "Transforme o Aliado em Ghoul.", { requirement: "Aliado" }),
  perk("aliado-influente", "Influente — Aliado", "Genérica", 6, "O Aliado se torna muito influente em uma esfera social.", { requirement: "Aliado" }),
  perk("refugio-seguro", "Seguro — Refúgio", "Genérica", [3, 4, 5, 6], "Aumente o nível de segurança do Refúgio.", { requirement: "Refúgio", costMode: "choice", maxRank: 4 }),
  perk("refugio-rebanho", "Rebanho — Refúgio", "Genérica", [3, 4, 5, 6], "Crie um fluxo confiável de carne ou humanos para alimentação.", { requirement: "Refúgio", costMode: "choice", maxRank: 4 }),
  perk("refugio-neutro", "Área Neutra — Refúgio", "Genérica", [3, 5], "O local passa a ser reconhecido como área sem conflito.", { requirement: "Refúgio", costMode: "choice", maxRank: 2 }),
  perk("refugio-mercado", "Mercado Alternativo — Refúgio", "Genérica", 6, "O local mantém uma função pública e outra voltada à espécie oculta.", { requirement: "Refúgio" }),
  perk("refugio-biblioteca", "Biblioteca — Refúgio", "Genérica", 3, "Acervo relevante em uma área de conhecimento.", { requirement: "Refúgio" }),
  perk("refugio-laboratorio", "Laboratório — Refúgio", "Genérica", 5, "Equipamentos para testes, cirurgias, autópsias e criação de Quinques.", { requirement: "Refúgio" }),

  perk("pugilista", "Pugilista", "Força", 5, "Ataques de mãos nuas e armas semelhantes a soco inglês recebem +2 Passos de Dano.", { attribute: "forca", min: 1 }),
  perk("impacto-brutal", "Impacto Brutal", "Força", 3, "Um golpe corpo a corpo pode empurrar o alvo 1 espaço e causar dano por colisão.", { attribute: "forca", min: 2 }),
  perk("golpe-preciso", "Golpe Preciso", "Força", 3, "Duas vezes por descanso, antes de rolar, converta dados de acerto em +1 Passo de Dano por dado, até o limite da regra.", { attribute: "forca", min: 3 }),
  perk("pegada-ferro", "Pegada de Ferro", "Força", 4, "+2 dados para agarrar, imobilizar ou impedir uma fuga.", { attribute: "forca", min: 4 }),
  perk("quebra-portas", "Quebra-Portas", "Força", 4, "Contra estruturas, cobertura e objetos, +2 dados de Força e +2 Passos de Dano.", { attribute: "forca", min: 4 }),
  perk("pancada-seca", "Pancada Seca", "Força", 5, "Duas vezes por descanso, o alvo perde a próxima Ação se falhar em Vigor.", { attribute: "forca", min: 5 }),
  perk("mestres-espadas", "Mestres das Espadas", "Força", 6, "Use uma Reação para um segundo golpe com metade dos Passos; se ambos acertarem, o alvo perde a Reação.", { attribute: "forca", min: 6 }),
  perk("brutamontes", "Brutamontes", "Força", 6, "Ao superar a MD em 2 acertos num golpe físico, empurre o alvo 1 espaço sem outra Ação.", { attribute: "forca", min: 6 }),
  perk("arremessador", "Arremessador", "Força", 6, "Armas arremessadas e objetos improvisados usam Força e recebem +2 Passos de Dano.", { attribute: "forca", min: 6 }),
  perk("soco-atordoante", "Soco Atordoante", "Força", 6, "Duas vezes por descanso, imponha teste de Controle MD 5; em falha, -2 dados e -3 Passos no próximo dano.", { attribute: "forca", min: 7 }),
  perk("forca-minotauro", "Força de Minotauro", "Força", 8, "Duas vezes por descanso, realize um Ato Colossal; os Passos extras são iguais aos acertos.", { attribute: "forca", min: 8 }),
  perk("lenda-dragao", "Lenda do Dragão", "Força", 8, "Uma vez por turno, um ataque físico direto recebe +1d12 de dano fixo.", { attribute: "forca", min: 9 }),
  perk("skadoosh", "Skadoosh", "Força", 15, "Uma vez por sessão, em condição dramática, dobre os dados básicos de dano e receba +3 Passos.", { attribute: "forca", min: 10 }),

  perk("imunidade-natural", "Imunidade Natural", "Vigor", 3, "Imune a doenças e +1 dado contra venenos e toxinas.", { attribute: "vigor", min: 1 }),
  perk("pele-dura", "Pele Dura", "Vigor", 3, "Receba RD igual à metade do Vigor.", { attribute: "vigor", min: 2 }),
  perk("resistente", "Resistente", "Vigor", 5, "Receba Vida adicional igual ao Grau, até +10 PV.", { attribute: "vigor", min: 3 }),
  perk("respirar-fundo", "Respirar Fundo", "Vigor", 6, "Duas vezes por descanso, use uma Ação para recuperar Vigor +4 de Vida.", { attribute: "vigor", min: 4 }),
  perk("dentes-cerrados", "Dentes Cerrados", "Vigor", 4, "Reduza em 1 dado penalidades causadas por dor, ferimentos ou condições físicas.", { attribute: "vigor", min: 4 }),
  perk("estomago-ferro", "Estômago de Ferro", "Vigor", 4, "+2 dados de Vigor contra venenos, doenças, drogas e substâncias nocivas.", { attribute: "vigor", min: 4 }),
  perk("inquebrantavel", "Inquebrantável", "Vigor", 5, "Uma vez por combate, ao chegar a 0 PV, teste Vigor MD 3 para permanecer com 1 PV.", { attribute: "vigor", min: 5 }),
  perk("celulas-ageis", "Células Ágeis", "Vigor", 6, "No início do turno, recupere passivamente 1/6 dos PV totais.", { attribute: "vigor", min: 6 }),
  perk("segundo-folego", "Segundo Fôlego", "Vigor", 6, "Uma vez por descanso, com metade ou menos da Vida, recupere Vigor/2 de Vida.", { attribute: "vigor", min: 6 }),
  perk("nao-foi-nada", "Não Foi Nada", "Vigor", 6, "Uma vez por rodada, teste Vigor MD 3 para ignorar uma condição física causada por ataque.", { attribute: "vigor", min: 6 }),
  perk("guarda-real", "Guarda Real", "Vigor", 6, "Após Bloquear, armazene metade do dano evitado e libere a carga em um soco.", { attribute: "vigor", min: 7 }),
  perk("lenda-viva", "Lenda Viva", "Vigor", 8, "Uma vez por descanso, ao cair a 0 PV, ignore a inconsciência por 3 turnos ou até ser curado.", { attribute: "vigor", min: 8 }),
  perk("vivo-kami", "Vivo como um Kami", "Vigor", 10, "Regeneração normal de Vida recebida por efeitos biológicos é multiplicada por x2.", { attribute: "vigor", min: 9 }),
  perk("rastejando-centopeia", "Rastejando como uma Centopeia", "Vigor", 15, "Quando o personagem realmente morrer, o Narrador ativa um evento especial; não é ressurreição automática.", { attribute: "vigor", min: 10, requirement: "???" }),

  perk("equilibrio-mestre", "Equilíbrio de Mestre", "Precisão", 3, "Atravesse superfícies estreitas sem teste e receba +1 dado em Furtividade e Acrobacia.", { attribute: "precisao", min: 1 }),
  perk("respiracao-contida", "Respiração Contida", "Precisão", 3, "Após focar 1 turno, o próximo ataque à distância recebe +1 dado de acerto e +2 Passos.", { attribute: "precisao", min: 2 }),
  perk("disparo-reflexivo", "Disparo Reflexivo", "Precisão", 6, "Uma vez por combate, ataque à distância como Reação, com -2 Passos de Dano.", { attribute: "precisao", min: 3 }),
  perk("golpe-direcionado", "Golpe Direcionado", "Precisão", 5, "Duas vezes por descanso, mire uma parte: -1 dado de acerto, +2 Passos e efeito narrativo coerente.", { attribute: "precisao", min: 4 }),
  perk("maos-cirurgiao", "Mãos de Cirurgião", "Precisão", 4, "+2 dados em manipulação delicada, medicina manual e mecanismos.", { attribute: "precisao", min: 4 }),
  perk("mira-paciente", "Mira Paciente", "Precisão", 4, "Use uma Ação observando um alvo; o próximo ataque contra ele recebe +2 dados de acerto.", { attribute: "precisao", min: 4 }),
  perk("mira-cirurgica", "Mira Cirúrgica", "Precisão", 6, "Duas vezes por descanso, um ataque longo em ponto vital ignora RD.", { attribute: "precisao", min: 5 }),
  perk("olho-cacador", "Olho do Caçador", "Precisão", 6, "Duas vezes por descanso, marque um alvo: +1 dado e +2 Passos contra ele pela cena.", { attribute: "precisao", min: 6 }),
  perk("entre-costelas", "Entre as Costelas", "Precisão", 6, "Uma vez por rodada, remova 2 dados de dano para receber +1 dado de acerto.", { attribute: "precisao", min: 6 }),
  perk("ricochete", "Ricochete", "Precisão", 6, "Reduza em 2 dados penalidades por cobertura e permita ataques indiretos quando a geometria comportar.", { attribute: "precisao", min: 6 }),
  perk("pistoleiro", "O Pistoleiro", "Precisão", 6, "Uma vez por turno, escolha Ricochete, Disparo Abrangente ou Ataque Duplo.", { attribute: "precisao", min: 7 }),
  perk("disparo-alma", "Disparo da Alma", "Precisão", 8, "Após 2 turnos sem errar, os próximos 2 ataques recebem +2 dados, +3 Passos e ignoram RD.", { attribute: "precisao", min: 8 }),
  perk("protocolo-coelhos", "Protocolo dos Coelhos", "Precisão", 10, "Sacrifique os demais ataques normais e concentre o dano em um golpe com +1 Modificador de Acerto.", { attribute: "precisao", min: 9 }),
  perk("apenas-atiro", "“Apenas atiro, para qualquer inimigo que vejo.”", "Precisão", 15, "Sacrifique até 2 ataques normais; para cada um, um ataque restante acerta automaticamente e causa metade dos Passos.", { attribute: "precisao", min: 10 }),

  perk("passo-silencioso", "Passo Silencioso", "Agilidade", 3, "Ignore obstáculos leves e superfícies barulhentas em Furtividade.", { attribute: "agilidade", min: 1 }),
  perk("velocista", "Velocista", "Agilidade", 3, "Deslocamento Base passa de 1 para 2 espaços.", { attribute: "agilidade", min: 2 }),
  perk("passo-gato", "Passo do Gato", "Agilidade", 3, "Em uma Esquiva, um dado de Agilidade conta como acerto garantido.", { attribute: "agilidade", min: 3 }),
  perk("movimento-fantasma", "Movimento Fantasma", "Agilidade", 3, "Uma vez por turno, depois de atacar, mova 1 espaço gratuitamente.", { attribute: "agilidade", min: 4 }),
  perk("parkour", "Parkour", "Agilidade", 4, "Acrobacias simples não reduzem movimento; testes extremos recebem +1 dado.", { attribute: "agilidade", min: 4 }),
  perk("passo-lateral", "Passo Lateral", "Agilidade", 4, "Depois de uma Esquiva bem-sucedida, mova 1 espaço, uma vez por rodada.", { attribute: "agilidade", min: 4 }),
  perk("malandro", "O Malandro", "Agilidade", 6, "Uma vez por rodada, mova 1 espaço e anule um ataque que acertaria você.", { attribute: "agilidade", min: 5 }),
  perk("danca-guerra", "Dança da Guerra", "Agilidade", 6, "Duas vezes por descanso, Esquivas bem-sucedidas acumulam até +3 dados no próximo acerto.", { attribute: "agilidade", min: 6 }),
  perk("momentum", "Momentum", "Agilidade", 6, "Ao percorrer metade do Deslocamento antes de atacar corpo a corpo, receba +2 Passos de Dano.", { attribute: "agilidade", min: 6 }),
  perk("intocavel", "Intocável", "Agilidade", 6, "A primeira Esquiva de cada rodada recebe +2 dados.", { attribute: "agilidade", min: 6 }),
  perk("evasao-suprema", "Evasão Suprema", "Agilidade", 6, "Com 3 ou mais sucessos na Esquiva, negue completamente o dano físico.", { attribute: "agilidade", min: 7 }),
  perk("corpo-lamina", "Corpo de Lâmina", "Agilidade", 8, "Após 3 turnos consecutivos em ritmo, receba +2 dados de acerto e +3 Passos.", { attribute: "agilidade", min: 8 }),
  perk("wally-like", "Wally Like", "Agilidade", 10, "No dano de Kagune ou Quinque, some metade dos dados base de Agilidade e metade dos de Precisão; limite igual à Agilidade base.", { attribute: "agilidade", min: 9 }),
  perk("ceifador", "Ceifador", "Agilidade", 15, "Ataques furtivos ou de oportunidade recebem +8 dados de dano uma vez por turno; +2 dados permanentes de Esquiva.", { attribute: "agilidade", min: 10 }),

  perk("memoria-fotografica", "Memória Fotográfica", "Raciocínio", 3, "Uma vez por sessão, o Narrador relembra informação que o personagem já possuía.", { attribute: "raciocinio", min: 1 }),
  perk("observador-frio-rac", "Observador Frio", "Raciocínio", 3, "+1 dado para entender intenções, manipulações e blefes.", { attribute: "raciocinio", min: 2 }),
  perk("enfraquecedor", "Enfraquecedor", "Raciocínio", 5, "Duas vezes por Descanso Longo, após acertar, reduza o dano do alvo em -2 Passos por 3 turnos.", { attribute: "raciocinio", min: 3 }),
  perk("fluxo", "Fluxo", "Raciocínio", 5, "Converta Erros Críticos acumulados em dados adicionais por 3 rolagens, até o Grau.", { attribute: "raciocinio", min: 4 }),
  perk("plano-b", "Plano B", "Raciocínio", 4, "Uma vez por descanso, após falhar em Raciocínio, rerrole até 2 dados.", { attribute: "raciocinio", min: 4 }),
  perk("memoria-tecnica", "Memória Fotográfica — Técnica", "Raciocínio", 4, "Recorde informações importantes sem teste; detalhes obscuros recebem +2 dados.", { attribute: "raciocinio", min: 4 }),
  perk("calculista-impecavel", "Calculista Impecável", "Raciocínio", 5, "Duas vezes por Descanso Longo, pergunte a consequência mais lógica de uma ação com base no que sabe.", { attribute: "raciocinio", min: 5 }),
  perk("genio-combate", "Gênio de Combate", "Raciocínio", 5, "Duas vezes por descanso, analise um alvo para receber +2 dados contra ele pela cena.", { attribute: "raciocinio", min: 6 }),
  perk("eu-sabia", "“Eu sabia que você faria isso.”", "Raciocínio", 6, "Após observar um inimigo por uma rodada, receba +1 dado contra Ataque ou Defesa dele pelo resto da cena.", { attribute: "raciocinio", min: 6 }),
  perk("improviso-calculado", "Improviso Calculado", "Raciocínio", 6, "Uma vez por descanso, justifique uma solução plausível com recursos da cena e receba +3 dados.", { attribute: "raciocinio", min: 6 }),
  perk("erudicao-tatica", "Erudição Tática", "Raciocínio", 5, "Duas vezes por descanso, dê +2 dados na próxima rolagem ofensiva ou defensiva de um aliado.", { attribute: "raciocinio", min: 7 }),
  perk("adaptabilidade", "Adaptabilidade", "Raciocínio", 8, "Analise ataques com Raciocínio para ganhar defesa e, após 3 análises, Passos contra o alvo.", { attribute: "raciocinio", min: 8 }),
  perk("cem-por-cento", "100%", "Raciocínio", 8, "+2 dados permanentes em Raciocínio e +1 dado de Esquiva.", { attribute: "raciocinio", min: 9 }),
  perk("duzentos-por-cento", "200%", "Raciocínio", 10, "Uma vez por sessão, tenha sucesso automático em até 2 testes de Raciocínio de MD 5 ou menor se possuir as informações.", { attribute: "raciocinio", min: 10 }),

  perk("decodificador", "Decodificador", "Percepção", 3, "+1 dado para mensagens cifradas, códigos visuais e linguagem corporal.", { attribute: "percepcao", min: 1 }),
  perk("sentido-expandido", "Sentido Expandido", "Percepção", 5, "+2 dados contra Furtividade de alvos ao redor.", { attribute: "percepcao", min: 2 }),
  perk("instinto-predador", "Instinto de Predador", "Percepção", 5, "Use uma Ação e teste Percepção para localizar um humano em alcance Longe.", { attribute: "percepcao", min: 3 }),
  perk("observador-silencioso", "Observador Silencioso", "Percepção", 6, "Detecte quando está sendo observado e receba +1 dado contra emboscadas e espionagem.", { attribute: "percepcao", min: 4 }),
  perk("leitura-combate", "Leitura de Combate", "Percepção", 4, "Após ver um ataque, identifique o estilo predominante da criatura.", { attribute: "percepcao", min: 4 }),
  perk("olhos-escuro", "Olhos no Escuro", "Percepção", 4, "Reduza em 2 dados penalidades por baixa iluminação.", { attribute: "percepcao", min: 4 }),
  perk("detetive-nato", "Detetive Nato", "Percepção", 5, "Duas vezes por descanso, extraia informações extras da cena; mesmo em falha, receba o essencial.", { attribute: "percepcao", min: 5 }),
  perk("reflexo-sobrevivente", "Reflexo de Sobrevivente", "Percepção", 5, "Aja primeiro no combate e receba +1 dado no primeiro teste de acerto.", { attribute: "percepcao", min: 6 }),
  perk("movimento-canto", "Movimento no Canto do Olho", "Percepção", 6, "Na primeira tentativa furtiva contra você, teste Percepção contra Furtividade para remover o ataque furtivo.", { attribute: "percepcao", min: 6 }),
  perk("ponto-fraco", "Ponto Fraco", "Percepção", 6, "Use uma Ação e Percepção MD 3; o próximo ataque contra o alvo recebe +2 dados de acerto.", { attribute: "percepcao", min: 6 }),
  perk("leitor-almas", "Leitor de Almas", "Percepção", 6, "Após observar por 1 turno, um teste pode revelar intenção real ou verdade oculta.", { attribute: "percepcao", min: 7 }),
  perk("verdade-despida", "Verdade Despida", "Percepção", 8, "Uma vez por descanso, pergunte qual é a mentira mais relevante ou emoção dominante da cena.", { attribute: "percepcao", min: 8 }),
  perk("olho-deus", "Olho de Deus", "Percepção", 8, "+1 dado permanente de Percepção e detecção automática de ameaças sensíveis em até 9 m.", { attribute: "percepcao", min: 9 }),
  perk("vejo-tudo", "Daqui Eu Vejo Tudo", "Percepção", 15, "Enxergue concentrações de RC através de até 1 metro de material comum num raio de 30 metros.", { attribute: "percepcao", min: 10, species: ghoulSpecies }),

  perk("magnetismo-hostil", "Magnetismo Hostil", "Presença", 3, "Uma vez por combate, force inimigos a focarem em você por 3 turnos.", { attribute: "presenca", min: 1 }),
  perk("manipulador-elegante", "Manipulador Elegante", "Presença", 3, "Duas vezes por descanso, role Presença para alterar a atitude geral de um grupo.", { attribute: "presenca", min: 2 }),
  perk("presenca-intimidadora", "Presença Intimidadora", "Presença", 5, "Um inimigo que ainda não atacou testa Controle para não hesitar por 1 turno.", { attribute: "presenca", min: 3 }),
  perk("belissimo", "Belíssimo", "Presença", [3, 4, 5], "Beleza, confiança ou impacto social crescem conforme o investimento.", { attribute: "presenca", min: 4, costMode: "choice", maxRank: 3 }),
  perk("primeira-impressao", "Primeira Impressão", "Presença", 4, "Na primeira rolagem social contra alguém novo, receba +2 dados.", { attribute: "presenca", min: 4 }),
  perk("mentiroso-convincente", "Mentiroso Convincente", "Presença", 4, "+2 dados quando a mentira possuir alguma base verdadeira.", { attribute: "presenca", min: 4 }),
  perk("labia-oposta", "Lábia Oposta", "Presença", 6, "Duas vezes por descanso, dê uma ordem simples a um inimigo hesitante; ele testa Controle.", { attribute: "presenca", min: 6 }),
  perk("olhe-mim", "“Olhe para mim.”", "Presença", 6, "Use uma Ação para chamar atenção; até o próximo turno, aliados discretos recebem +2 dados.", { attribute: "presenca", min: 6 }),
  perk("palavra-certa", "Palavra Certa", "Presença", 6, "Duas vezes por descanso, use Reação para um aliado rerrolar 1 dado que falhou.", { attribute: "presenca", min: 6 }),
  perk("inspiracao-contagiante", "Inspiração Contagiante", "Presença", 6, "Duas vezes por descanso, um aliado que veja você agir pode repetir uma falha.", { attribute: "presenca", min: 7 }),
  perk("voz-anfitriao", "Voz de Anfitrião", "Presença", 8, "Uma vez por cena social, conduza o tópico e o volume de informações da conversa.", { attribute: "presenca", min: 8 }),
  perk("elegante", "Elegante", "Presença", 8, "+2 dados permanentes em testes de Presença.", { attribute: "presenca", min: 9 }),
  perk("presenca-aconchegante", "Presença Aconchegante", "Presença", 8, "+2 dados em interações sociais positivas; não se aplica a intimidação ou hostilidade.", { attribute: "presenca", min: 10 }),

  perk("centro-gravidade", "Centro de Gravidade", "Controle", 3, "A primeira rolagem contra efeito mental ou dano de Sanidade na cena recebe +1 dado.", { attribute: "controle", min: 1 }),
  perk("bastiao-interior", "Bastião Interior", "Controle", 3, "Só adquira Mácula ao sofrer 4 ou mais de dano de Sanidade de uma vez.", { attribute: "controle", min: 2 }),
  perk("fortificador", "Fortificador", "Controle", 5, "Duas vezes por descanso, use uma Ação para conceder +2 Passos de Dano por 3 turnos.", { attribute: "controle", min: 3 }),
  perk("determinacao-obsessiva", "Determinação Obsessiva", "Controle", 5, "Uma vez por descanso, por um objetivo pessoal, receba +1 dado pela cena e não sofra dano de Sanidade durante a ação.", { attribute: "controle", min: 4 }),
  perk("dor-informacao", "Dor é Informação", "Controle", 4, "Ao sofrer dano, ignore até o próximo turno penalidades circunstanciais causadas pela dor.", { attribute: "controle", min: 4 }),
  perk("cara-pedra", "Cara de Pedra", "Controle", 4, "Ler suas emoções sofre -2 dados; +2 dados de Controle para blefar com o corpo.", { attribute: "controle", min: 4 }),
  perk("meditacao-ferro", "Meditação de Ferro", "Controle", 5, "Durante o descanso, recupere +2 Sanidade adicional se passar no teste de Sanidade.", { attribute: "controle", min: 5 }),
  perk("autocontrole-absoluto", "Autocontrole Absoluto", "Controle", 6, "Uma vez por Descanso Longo, negue o impulso da Fome por uma cena ou evite uma Mácula.", { attribute: "controle", min: 6 }),
  perk("respira", "Respira.", "Controle", 6, "Uma vez por descanso, use uma Ação para remover até 2 dados de penalidade mental durante a cena.", { attribute: "controle", min: 6 }),
  perk("instinto-acorrentado", "Instinto Acorrentado", "Controle", 6, "Ao falhar contra um impulso, você ainda escolhe como executá-lo, sem negar a consequência principal.", { attribute: "controle", min: 6 }),
  perk("foco-letal", "Foco Letal", "Controle", 6, "Duas vezes por descanso, converta até 3 dados de dano em +2 Passos cada antes do acerto.", { attribute: "controle", min: 7 }),
  perk("alma-estavel", "Alma Estável", "Controle", 8, "Só sofra Quebra depois de a Sanidade ficar negativa em duas ocasiões.", { attribute: "controle", min: 8 }),
  perk("inabalavel", "Inabalável", "Controle", 15, "Uma vez por sessão, reduza pela metade uma perda de Sanidade; uma vez a cada duas sessões, impeça uma nova Mácula.", { attribute: "controle", min: 9 }),
  perk("frio-neve", "Frio como a Neve", "Controle", 8, "+2 dados permanentes em testes de Controle.", { attribute: "controle", min: 10 }),
  ...expansionPerks,
];

export interface Drawback {
  id: string;
  name: string;
  credit: number | number[];
  description: string;
  species?: SpeciesId[];
  targetAttribute?: boolean;
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
  { id: "desabilidade", name: "Desabilidade", credit: 5, description: "Escolha um Atributo: ele não pode passar de 4. Uma vez por Atributo.", targetAttribute: true },
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
}

const effect = (
  id: string,
  name: string,
  family: KaguneEffect["family"],
  cost: number | number[],
  maxRank: number,
  type: string,
  description: string,
  options: Partial<KaguneEffect> = {},
): KaguneEffect => ({ id, name, family, cost, maxRank, type, description, ...options });

export const kaguneEffects: KaguneEffect[] = [
  effect("aumentar-dano", "Aumentar Dano", "Geral", 5, 4, "Passivo", "+1 Modificador de Dano por nível; uma compra por Grau."),
  effect("aumentar-passos", "Aumentar Passos de Dano", "Geral", [3, 5], 2, "Passivo", "+1 Passo de Dano por nível.", { costMode: "choice" }),
  effect("aumentar-distancia", "Aumentar Distância", "Geral", 3, 2, "Passivo", "+1 grau de alcance por nível. Koukaku pode comprar duas vezes."),
  effect("couraca-revestida", "Couraça Revestida", "Geral", 5, 6, "Passivo", "+1 RD por nível."),
  effect("regeneracao-anormal", "Regeneração Anormal", "Geral", 3, 6, "Passivo · Biológico", "Cura passiva; ao atingir o limite da regra, perca 2 RC ou receba 1 Fome."),
  effect("defesa-habil", "Defesa Hábil", "Geral", 3, 1, "Ativo · 2 RC", "Como Reação, reduza dano em metade do Grau."),
  effect("empurrao", "Empurrão", "Geral", 3, 3, "Ativo · 2 RC", "Arremesse o alvo; níveis ampliam distância e dano de colisão."),
  effect("aumentar-acerto", "Aumentar Acerto", "Geral", 5, 6, "Passivo", "Cada compra pode elevar em +1 o resultado de um dado específico. A cada 3 compras, consolide +1 no modificador ++ dos testes com Kagune."),
  effect("efeitos-alternativos", "Efeitos Alternativos", "Geral", 3, 1, "Ativo", "Mantenha dois efeitos passivos alternáveis; trocar custa 1 Ação.", { requirement: "Pré-requisitos dos dois passivos" }),
  effect("aprimoramentos-corporais", "Aprimoramentos Corporais", "Geral", 5, 2, "Passivo · Biológico", "Com a Kagune ativa, +1 no Atributo Físico escolhido por nível; pode superar o limite.", { targetAttribute: true }),
  effect("mudanca-forma", "Mudança de Forma", "Geral", 3, 4, "Ativo · 4 RC", "Remodele a Kagune; conceda dados e, ofensivamente, Passos conforme o nível."),
  effect("cura-rc", "Cura de RC", "Geral", 5, 2, "Ativo · Biológico", "Injete RC em um aliado e acelere recuperação mediante Reação e teste do Atributo Principal."),
  effect("efeito-biologico", "Efeito Biológico", "Geral", [3, 7, 11, 15, 19], 5, "Ativo · Biológico", "Módulos de Paralisar, Enfraquecer, Névoa Protetiva, Confusão Mental ou Envenenamento.", { costMode: "choice" }),

  effect("distancia-superior", "Aumentar Distância Superior", "Ukaku", 3, 2, "Passivo", "+1 grau de distância por nível."),
  effect("cristalizacao", "Cristalização", "Ukaku", 3, 3, "Ativo · Biológico", "Cristais ofensivos; amplie Passos e disparos conforme o nível."),
  effect("cristalizacao-potencializada", "Cristalização Potencializada", "Ukaku", 5, 2, "Passivo", "+2 dano à Cristalização por nível.", { requirement: "Cristalização N1" }),
  effect("criar-arma", "Criar Arma", "Ukaku", 5, 2, "Ativo · 4 RC", "Transforme a Ukaku em arma curta; +1 Passo por nível."),
  effect("arma-cristalizada", "Arma Cristalizada", "Ukaku", 3, 1, "Passivo · 4 RC", "Cristalize a arma no impacto e adicione dano da Cristalização.", { requirement: "Criar Arma + Cristalização" }),
  effect("adicionar-elemento", "Adicionar Elemento", "Ukaku", 6, 2, "Ativo · 2 RC + 1/turno", "Fogo, Raio ou Gelo; +3 dano no N1 e +6 no N2."),
  effect("tiros-explosivos", "Tiros Explosivos", "Ukaku", 3, 2, "Passivo · 2 RC", "Explosão em área: N1 +1 Passo; N2 +2 Passos e área maior.", { requirement: "Cristalização N2" }),
  effect("dispersao-cristais", "Dispersão de Cristais", "Ukaku", 5, 2, "Passivo · 2 RC", "Escolha cortina, nuvem cortante ou estilhaço direcionado."),
  effect("esquiva-pena", "Esquiva de Pena", "Ukaku", 3, 1, "Passivo", "+1 dado em Agilidade para Esquiva quando for alvo."),
  effect("asas-anjo", "Asas de Anjo", "Ukaku", 5, 1, "Ativo · 2 RC", "Voo com velocidade igual ao Deslocamento Base."),

  effect("couraca-superior", "Couraça Revestida Superior", "Koukaku", [5, 8, 11, 14, 17, 20, 23], 7, "Passivo", "No N1, RD igual ao Vigor; níveis seguintes adicionam +1 RD. Máximo metade do Grau.", { costMode: "choice" }),
  effect("forma-versatil", "Forma Versátil", "Koukaku", 5, 3, "Ativo · Biológico · 4 RC", "Escudo: +1 RD por nível e metade dos Passos bônus vira RD. Lâmina: +1 Passo por nível e metade da RD da Kagune é convertida em Passos na proporção de 2 RD para 1 Passo. Quinques podem comprar este efeito."),
  effect("alterar-aparencia", "Alterar Aparência", "Koukaku", [3, 6], 2, "Ativo · Biológico", "Altere voz, face e corpo; o custo de RC cresce com a complexidade.", { costMode: "choice" }),
  effect("koukaku-fragmentavel", "Koukaku Fragmentável", "Koukaku", 3, 3, "Ativo · 1 Ação + 2 RC", "Crie fragmentos-armadilha que atacam e prendem o alvo."),
  effect("clones-aco", "Clones de Aço", "Koukaku", 8, 3, "Ativo · 6 RC/clone", "Cada compra aumenta o máximo de clones até 3.", { requirement: "Koukaku Fragmentável N1" }),
  effect("bloqueio-ferro", "Bloqueio de Ferro", "Koukaku", 3, 1, "Passivo", "+1 dado em Vigor para Bloqueio."),

  effect("regeneracao-superior", "Regeneração Anormal Superior", "Rinkaku", [3, 8, 15, 25], 4, "Passivo · Biológico", "Cure 1/6, 1/4 ou 1/2 dos PV; N4 permite cura total por 6 RC.", { costMode: "choice" }),
  effect("multiplas-caudas", "Múltiplas Caudas", "Rinkaku", 3, 4, "Passivo · Biológico", "Cada nível concede +1 Passo; os três primeiros também concedem +1 dado e uma cauda. Cada cauda causa o dano padrão −2 Passos; no N4, +1 Modificador de Acerto. Dureza −1 por nível."),
  effect("contra-ataque", "Contra Ataque", "Rinkaku", 3, 1, "Ativo · 2 RC", "Uma vez por rodada, contra-golpeie com -2 dados para superar o ataque."),
  effect("construto-dividido", "Construto Dividido", "Rinkaku", 3, 1, "Ativo · 2 RC", "Crie um construto de cena com dureza igual à metade do Grau."),

  effect("quebra-defesa", "Quebra Defesa", "Bikaku", 5, 1, "Ativo · 2 RC", "Ignore metade da RD do alvo."),
  effect("pressao-defensiva", "Pressão Defensiva", "Bikaku", 5, 1, "Ativo · 2 RC", "Após aplicar RD, reduza pela metade o dano restante."),
  effect("lamina-cauda-viva", "Lâmina de Cauda Viva", "Bikaku", 6, 1, "Ativo · 2 RC", "Após errar, ganhe +1 dado e +2 Passos contra o alvo, uma vez por alvo."),
  effect("espinho-carne", "Espinho da Carne", "Bikaku", 3, 2, "Ativo · 2 RC", "Fixe espinho, imponha penalidade de acerto e dano por turno; a segunda aplicação intensifica."),
  ...expansionKaguneEffects,
];

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
}

const evolution = (id: string, name: string, cost: number, grade: number, family: Evolution["family"], description: string, requirement?: string, options: Partial<Evolution> = {}): Evolution => ({ id, name, cost, grade, family, description, requirement, ...options });

export const evolutions: Evolution[] = [
  evolution("forma-especial", "Forma Especial", 8, 6, "Geral", "Defina com o Narrador uma propriedade coerente do Kakuhou. Fragmentos ofensivos: máximo 5, cada adicional sofre -1 Passo e -1 Modificador de Acerto."),
  evolution("imortal", "Imortal", 20, 6, "Geral", "Ao sofrer golpe fatal, gaste 10 RC e fique com 1 Vida, uma vez por rodada; não impede destruição do cérebro ou condições vitais específicas."),
  evolution("monstro", "Monstro", 10, 6, "Geral", "Na Kakuja Incompleta, manifeste uma característica da forma Completa; Sanidade Máxima -5 e Fome fixada em 9.", "Kakuja Incompleta"),
  evolution("washuu-oculto", "???", 8, 6, "Geral", "O efeito permanece oculto até sua revelação narrativa.", "Washuu"),
  evolution("kakuhou-passivo", "Kakuhou Passivo", 5, 6, "Geral", "Mantenha Vantagens passivas da Kagune sem manifestá-la; não concede efeitos que exigem exteriorização física."),
  evolution("anjo", "Anjo", 5, 6, "Ukaku", "Com Ukaku ativa, tenha voo verdadeiro com deslocamento aéreo normal.", "Agilidade 4; Força 2"),
  evolution("fenix", "Assim como uma Fênix", 10, 6, "Ukaku", "Uma vez por sessão, consuma todo o RC (mínimo 10) para sobreviver com 1 Vida; Kagune desativa e Fome +2."),
  evolution("adaptacao", "Adaptação", 15, 6, "Koukaku", "Ao defender, role 1d5; no 5, aplique RD e depois reduza pela metade o dano restante."),
  evolution("perda-peso", "Perda de Peso", 8, 6, "Koukaku", "Enquanto ativa, reduza a RD da Koukaku em 6, mínimo 0; ataques recebem +2 Passos e o Bloqueio soma metade da Agilidade base em dados. Em crítico de Bloqueio, 1d6: com 6, faça um ataque comum adicional, uma vez por rodada."),
  evolution("mestre-armas", "Mestre das Armas", 8, 6, "Koukaku", "Na configuração ofensiva, golpes recebem +2 Passos de Dano."),
  evolution("multiplas-caudas-plus", "Múltiplas Caudas +", 8, 6, "Rinkaku", "Cada compra cria uma cauda permanente e amplia dano; cada cauda adicional pode atacar por 2 RC.", "Máximo 3 compras"),
  evolution("axolote", "Regeneração do Axolote", 10, 6, "Rinkaku", "Uma vez por turno, gaste 6 RC para regenerar todos os membros perdidos; não recupera Vida."),
  evolution("custo-beneficio", "Custo-Benefício", 10, 6, "Bikaku", "Efeitos comuns de outros tipos não custam +2 PE e podem chegar ao nível máximo."),
  evolution("ferreiro-guerra", "Ferreiro da Guerra", 10, 8, "Ukaku", "No corpo a corpo, some metade de Força ou Agilidade base em dados de dano."),
  evolution("anjo-morte", "Anjo da Morte", 15, 8, "Ukaku", "Ao derrotar uma ameaça real, recupere 2 RC; máximo 4 RC por turno."),
  evolution("coruka", "Assim como uma certa Coruka", 15, 8, "Ukaku", "Resistência Ukaku passa de x0,5 para x0,8 e para x1,1 em Kakuja."),
  evolution("metalico", "Metálico", 10, 8, "Koukaku", "Ao receber impacto contundente, o atacante falha em Vigor e sofre metade dos dados básicos de dano Koukaku."),
  evolution("lanca-ceus", "Lança que Devora Céus", 15, 8, "Koukaku", "Sacrifique RD e 10 RC: +10 dados de dano e +2 acerto; depois, Kagune indisponível e RD 0 por 5 turnos."),
  evolution("sabor-kakuja", "Sabor Kakuja", 20, 8, "Koukaku", "Mantenha modos ofensivo e defensivo juntos por 5 RC para ativar e 3 RC por turno."),
  evolution("hidra-faminta", "Hidra Faminta", 10, 8, "Rinkaku", "Quando uma cauda for destruída, gaste 5 RC para regenerá-la e atacar com -1 dado; uma vez por turno."),
  evolution("carne-recusa", "Carne que se Recusa a Morrer", 15, 8, "Rinkaku", "Uma vez por sessão, gaste 20 RC para ficar com 1 HP e dobre a regeneração por 2 turnos."),
  evolution("mil-pernas", "Mil Pernas da Centopeia", 20, 8, "Rinkaku", "Por 15 RC e 3 turnos: +2 caudas, +2 dados de dano, um alvo extra e -2 Resistência."),
  evolution("predador-perfeito", "Predador Perfeito", 10, 8, "Bikaku", "Escolha postura por turno: Ataque +2 dano, Defesa +2 RD ou Mobilidade +2 Esquiva."),
  evolution("cauda-escorpiao", "Cauda do Escorpião", 15, 8, "Bikaku", "Uma vez por turno, ao acertar e gastar 5 RC: ignore metade da RD, ganhe +2 acerto ou mire sem penalidade."),
  evolution("um-contra-cem", "Um Contra Cem", 20, 8, "Bikaku", "Uma vez por sessão, por 3 turnos, acumule Adaptação contra ações ofensivas e converta em acerto, Esquiva ou dano."),
  evolution("asas-horizonte", "Asas que Tocam o Horizonte", 12, 10, "Ukaku", "+2 dados de acerto à distância e +50% alcance máximo; o bônus não vale além do alcance normal."),
  evolution("chuva-carmesim", "Chuva Carmesim", 18, 10, "Ukaku", "A cada 3 turnos, gaste 15 RC para uma área com +4 dados de dano; no turno seguinte, -2 dados de dano."),
  evolution("predador-ceus", "Predador dos Céus", 25, 10, "Ukaku", "Ataques consecutivos em alta velocidade acumulam acerto e dano até +4/+4."),
  evolution("montanha", "Montanha Inamovível", 12, 10, "Koukaku", "Cada turno imóvel concede +2 RD, até +6; mover mais da metade remove tudo."),
  evolution("forca-irresistivel", "Força Irresistível", 18, 10, "Koukaku", "Após dano passar pela RD, gaste 8 RC; falha de Vigor contra Força arremessa e remove Reação."),
  evolution("arsenal-vivo", "Arsenal Vivo", 25, 10, "Koukaku", "Escolha por turno: Espada +3 acerto, Martelo +5 dano, Escudo +4 RD ou Lança +2 acerto e alcance."),
  evolution("oito-caminhos", "Oito Caminhos", 12, 10, "Rinkaku", "Reserve uma cauda não usada para +2 Esquiva ou +2 RD contra um ataque."),
  evolution("canibalismo-celular", "Canibalismo Celular", 18, 10, "Rinkaku", "Destrua até 2 caudas por turno para recuperar Vida e RC; elas não regeneram naturalmente por 2 turnos."),
  evolution("continua-crescendo", "Aquilo que Continua Crescendo", 25, 10, "Rinkaku", "Caudas destruídas por inimigos geram Crescimento; cada ponto dá +1 dado de dano e 5 pontos regeneram todas."),
  evolution("sem-ponto-cego", "Não Existe Ponto Cego", 12, 10, "Bikaku", "Ignore penalidades defensivas por costas e flancos; +2 dados contra ataques de oportunidade."),
  evolution("contra-ataque-perfeito", "Contra-Ataque Perfeito", 18, 10, "Bikaku", "Ao superar completamente ataque corpo a corpo, gaste 5 RC para ataque adicional com +2 acerto."),
  evolution("mestre-nada", "Mestre de Nada, Monstro em Tudo", 25, 10, "Bikaku", "Posturas viram Ataque +4 dano, Defesa +4 RD, Mobilidade +4 Esquiva; 5 RC mantém duas."),
  evolution("serafim-carmesim", "Serafim Carmesim", 20, 12, "Ukaku", "Uma vez por turno, gaste 5 RC para disparo adicional com metade do dano; não gera novos ataques."),
  evolution("mil-penas", "Mil Penas, Uma Morte", 30, 12, "Ukaku", "Uma vez por sessão, condense golpes por 2 turnos; cada sacrifício dá +2 dano e +1 acerto; depois perca 30 RC."),
  evolution("fortaleza-carne", "Fortaleza de Carne", 20, 12, "Koukaku", "Uma vez por turno, gaste 5 RC e aumente a RD do golpe em metade dos dados de Vigor."),
  evolution("lanca-deus", "A Lança que Perfurou Deus", 30, 12, "Koukaku", "Uma vez por sessão, sacrifique RD e 20 RC: +15 dano, +4 acerto e ignore metade da RD; depois RD 0 por 5 turnos.", "Lança que Devora Céus"),
  evolution("nao-consigo-morrer", "Não Consigo Morrer", 20, 12, "Rinkaku", "Uma vez por sessão, ao chegar a 0 HP, permaneça consciente por 2 turnos; se não terminar acima de 0, caia."),
  evolution("centopeia", "Centopeia", 30, 12, "Rinkaku", "Uma vez por sessão, por 3 turnos: +4 dano, +2 acerto, +2 Esquiva, regeneração de cauda e ataque extra por 10 RC.", "Mil Pernas da Centopeia; Sanidade baixa"),
  evolution("ja-vi", "Já Vi Isso Antes", 20, 12, "Bikaku", "Repetições da mesma técnica melhoram a defesa: +2, +4 e depois +6 dados."),
  evolution("evolucao-convergente", "Evolução Convergente", 30, 12, "Bikaku", "Uma vez por sessão, por 3 turnos, escolha duas adaptações por turno e acumule dano quando inimigos errarem.", "Um Contra Cem"),
  ...expansionEvolutions,
];
