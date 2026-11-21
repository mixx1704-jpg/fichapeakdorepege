import { perkCatalog } from './perk-catalog';
export const endgameProperties = Object.fromEntries(perkCatalog.perks.flatMap(p=>p.automation?.endgame?[[p.id,p.automation.endgame]]:[]));
