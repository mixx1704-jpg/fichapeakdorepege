/** Linked to existing purchases, so their PE cost and saved ID remain unique. */
export const endgameProperties:Record<string,{percentages:Partial<Record<'physicalSteps'|'kaguneSteps'|'life'|'sanity'|'rc',number>>;description:string}>={
  'r26-exp-geral-coroa-da-devastacao':{percentages:{physicalSteps:35,kaguneSteps:35},description:'+35% aos Passos físicos e da Kagune/Quinque, sobre o subtotal. Soma com outras porcentagens até 75%; aplica uma única vez.'},
  'r26-exp-geral-eternidade-viva':{percentages:{life:40},description:'+40% de Vida máxima sobre o subtotal final da fórmula de Vida, uma única vez. Soma com outras porcentagens de Vida até 75%.'},
  'r26-exp-geral-consciencia-transcendente':{percentages:{sanity:30,rc:30},description:'+30% de Sanidade máxima e capacidade de RC. Cada percentual usa seu próprio subtotal uma vez e soma com outras fontes até 75%; não recupera recursos atuais.'},
};
