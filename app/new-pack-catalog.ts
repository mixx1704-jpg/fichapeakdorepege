import { catalogGroup } from './perk-catalog';
import type { AttributeKey, CatalogCategory, KaguneFamily, Perk, SpeciesId } from './data';

export type NewPackRequirements = {
  level: number;
  attributes: Partial<Record<AttributeKey, number>>;
  families: KaguneFamily[];
  anyPhysicalMinimum?: number;
  minimumTails?: number;
  minimumFamilies?: number;
};

/** Original source text stays available independently of automatic calculations. */
export type NewPackDefinition = {
  id: string;
  kind: 'perk' | 'property';
  ordinal: number;
  section: string;
  name: string;
  requirement: string | null;
  cost: number;
  usage: string | null;
  rcCost: number | null;
  body: string;
  raw: string;
  sourceLine: number;
  requirements: NewPackRequirements;
  equipmentCompatible: boolean;
  biological?: boolean;
  integrationNotes?: string;
  pendingClarification?: string;
  catalogOverrides?: Partial<Perk>;
};

function definition(p: import('./perk-catalog').CatalogPerk): NewPackDefinition {
 const d=p.automation!.pack!;
 return {...d,id:p.id,name:p.name,cost:Array.isArray(p.cost)?p.cost[0]:p.cost,requirement:p.requirement??null,usage:p.useType??null,requirements:{...d.requirements,level:p.minGrade||0,attributes:{...p.requirements},families:[...(p.kaguneTypes||[])]}};
}
export const NEW_PACK_DEFINITIONS = catalogGroup('pack').map(definition);
export const REVISION_PACK_DEFINITIONS = catalogGroup('revision').map(definition);
export const ALL_PACK_DEFINITIONS = [...NEW_PACK_DEFINITIONS,...REVISION_PACK_DEFINITIONS];
const definitionById=new Map(ALL_PACK_DEFINITIONS.map(d=>[d.id,d]));
export const newPackDefinition=(id:string) => definitionById.get(id);
export const newPackPerks: Perk[] = [...catalogGroup('pack'),...catalogGroup('revision')];
