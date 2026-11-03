import type { AttributeKey, CatalogCategory, KaguneFamily, Perk, SpeciesId } from './data';
import importedDefinitions from './new-pack-catalog.json';

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
};

export const NEW_PACK_DEFINITIONS = importedDefinitions as NewPackDefinition[];
const definitionById = new Map(NEW_PACK_DEFINITIONS.map(definition => [definition.id, definition]));
export function newPackDefinition(id: string): NewPackDefinition | undefined {
  return definitionById.get(id);
}

const biologicalSpecies: SpeciesId[] = ['ghoul', 'ghoul-dominante', 'ghoul-artificial', 'quinx'];
const categories: Array<[RegExp, CatalogCategory]> = [
  [/FORÇA/, 'Força'], [/VIGOR|VIDA \/ SOBREVIVÊNCIA/, 'Vigor'], [/PRECISÃO/, 'Precisão'],
  [/AGILIDADE/, 'Agilidade'], [/RACIOCÍNIO/, 'Raciocínio'], [/PERCEPÇÃO/, 'Percepção'],
  [/PRESENÇA/, 'Presença'], [/CONTROLE/, 'Controle'],
];

function catalogEntry(definition: NewPackDefinition): Perk {
  const requirements = definition.requirements;
  const families = requirements.families;
  const isProperty = definition.kind === 'property';
  const isQuimera = (requirements.minimumFamilies || families.length) > 1;
  const weaponBound = isProperty || families.length > 0 || isQuimera;
  const isBiological = definition.biological || (isProperty && !definition.equipmentCompatible);
  const category: CatalogCategory = isQuimera ? 'Kagune Quimera'
    : categories.find(([pattern]) => pattern.test(definition.section))?.[1]
      || (weaponBound ? 'Combate' : 'Genérica');
  const attributeEntries = Object.entries(requirements.attributes) as Array<[AttributeKey, number]>;
  const description = [definition.body,
    definition.integrationNotes ? `Aplicação na ficha: ${definition.integrationNotes}` : '',
    definition.pendingClarification ? `Texto incompleto: ${definition.pendingClarification}` : '',
  ].filter(Boolean).join('\n\n');
  return {
    id: definition.id,
    name: definition.name,
    category,
    cost: definition.cost,
    maxRank: 1,
    minGrade: requirements.level,
    description,
    requirement: definition.requirement || undefined,
    requirements: { ...requirements.attributes },
    ...(attributeEntries.length === 1 ? { attribute: attributeEntries[0][0], min: attributeEntries[0][1] } : {}),
    ...(families.length ? { kaguneTypes: [...families] } : {}),
    ...(requirements.minimumFamilies ? { minKaguneTypes: requirements.minimumFamilies } : {}),
    ...(weaponBound ? { location: 'kakuhou' as const, requiredWeapon: 'kagune' as const } : {}),
    ...(isBiological ? { species: [...biologicalSpecies] } : {}),
    equipmentCompatible: definition.equipmentCompatible,
    ...(definition.section === 'RC / CONTROLE' || isProperty ? { requiresRC: true } : {}),
    ...(isProperty ? { organGroup: 'Propriedades' } : isQuimera ? { organGroup: 'Quimera' } : families.length === 1 ? { organGroup: families[0] } : {}),
    supplement: true,
    sourceId: 'perks_e_propriedades_tokyo_ghoul.txt',
    useType: definition.usage || (definition.rcCost ? `Ativa · ${definition.rcCost} RC` : 'Conforme o efeito'),
  };
}

export const newPackPerks: Perk[] = NEW_PACK_DEFINITIONS.map(catalogEntry);
