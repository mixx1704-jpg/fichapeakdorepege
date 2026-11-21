import { perkCatalog, catalogGroup } from './perk-catalog';
import type { AttributeKey, Evolution, KaguneEffect, KaguneFamily, Perk } from "./data";

export const combatManeuvers = [
  { name: "Investida", description: "Antes de um ataque corpo a corpo, percorra ao menos metade do Deslocamento: +1 Passo de Dano, mas -2 acertos na primeira defesa antes do próximo turno. Não combina com outra Investida." },
  { name: "Ataque de Ruptura", description: "Antes de atacar, sofra -2 Passos de Dano. Se ainda causar dano após a RD, reduza a RD do alvo em 2 contra o próximo ataque até o início do turno dele. Não acumula." },
  { name: "Derrubar", description: "Ataque corpo a corpo com -2 acertos extras. Ao acertar, cause dano ou derrube. Alvo caído perde a Reação até se levantar e gasta parte do movimento." },
  { name: "Desarmar", description: "Ataque a arma ou objeto com -2 acertos extras. Ao superar a defesa, não cause dano e force o alvo a largá-lo. Não funciona em armas integradas ou impossíveis de soltar." },
  { name: "Proteger", description: "Como Reação, mova até 1 espaço e torne-se o alvo de um ataque contra aliado adjacente, se fisicamente possível. Não concede uma segunda defesa contra o mesmo ataque." },
  { name: "Preparar Ação", description: "Gaste a Ação e defina um gatilho perceptível. Se ocorrer antes do próximo turno, execute imediatamente a ação preparada; caso contrário, ela é perdida." },
  { name: "Finta", description: "Sacrifique 2 Passos de Dano antes de um ataque corpo a corpo. Se o alvo usar Bloqueio ou Esquiva, ele sofre -1 acerto nessa defesa. Não multiplica por ataques adicionais." },
  { name: "Ataque de Cobertura", description: "Em ataque à distância, sacrifique o dano. Ao acertar, o alvo interrompe a movimentação ou continua e sofre -2 acertos na próxima defesa." },
  { name: "Pressionar", description: "Ao acertar o mesmo alvo por dois turnos seguidos, ganhe +1 acerto para impedir sua fuga ou reposicionamento até errar ou trocar de alvo." },
  { name: "Recuperar Guarda", description: "Gaste a Ação sem atacar. Até o começo do próximo turno, receba +2 acertos na primeira defesa." },
] as const;

export const expansionKaguneEffects: KaguneEffect[] = perkCatalog.kaguneEffects.filter(p=>p.catalogGroups?.includes('expansion'));
export const expansionPerks: Perk[] = catalogGroup('expansion');
export const expansionEvolutions: Evolution[] = perkCatalog.evolutions.filter(p=>p.catalogGroups?.includes('expansion'));
