export const archetypeDefinitions = [
  { name: 'O Protetor', ability: 'Por protegido legítimo (até 6), +5% Vida máxima e RD. Ao defender diretamente um protegido, +15 apenas ao Bloqueio ou Desvio escolhido. Compromissos genuínos e pessoas importantes precisam da validação do mestre.' },
  { name: 'O Justiceiro', ability: 'Peso da Justiça 0–6: +5 Acerto e Desvio por ponto. Esquiva e Desvio são a mesma defesa. Contra alvo da causa, +15 Acerto adicional. Não conte a organização e seus integrantes pelo mesmo conflito. Abandonar a convicção suspende os benefícios.' },
  { name: 'O Hedonista', ability: 'Agindo sozinho e exclusivamente por si, pode repetir cada teste uma única vez e conservar o melhor resultado. Vale para testes ofensivos, defensivos, físicos e mentais; não vale em colaboração direta ou para beneficiar terceiros.' },
  { name: 'O Idealista', ability: 'Grau I: +10 Vida/+5 dano; II: +30/+10; III: +60/+15; IV: +100/+25; V: +150/+35. Somente o grau validado pelo mestre se aplica. Agindo diretamente pelo ideal, +15 Acerto. Abandoná-lo suspende os benefícios.' },
  { name: 'O Mártir', ability: '+35 Sanidade máxima. Cada quebra legítima e distinta de Sanidade (até 6) concede permanentemente +5 Acerto, Desvio e Bloqueio, enquanto mantiver a convicção. Aceitando consequências para proteger alguém, +15 Bloqueio correspondente. Recuperar Sanidade não apaga o progresso.' },
  { name: 'O Sobrevivente', ability: '+15 em testes de resistência a ameaças fisiológicas. Sob risco mortal real, regeneração +100% e +30 nos testes elegíveis, substituindo +15. Esses bônus não afetam ataques.' },
  { name: 'O Niilista', ability: '+20 Acerto, Desvio e Bloqueio, menos 5 por vínculo emocional importante (0–4), sem valores negativos. Quatro vínculos exigem uma transformação de arquétipo aprovada pelo mestre.' },
  { name: 'O Obsessivo', ability: 'Agindo pela obsessão específica e autêntica, +15 Acerto, Desvio e Bloqueio. Pode concluir uma última ação relacionada à obsessão após ferimento fatal, uma vez por cena, sem impedir a morte nem garantir acerto.' },
  { name: 'O Insaciável', ability: '+5 Acerto, Desvio e Bloqueio por ponto de Fome real da ficha, até +30. Consequências normais da Fome permanecem; não gere Fome artificial para acumular bônus.' },
  { name: 'O Palhaço', ability: 'Brincadeira validada: I +15 Acerto; II +30; III +45, uma vez por cena. Em uma defesa, use Bloqueio ou Desvio com teto de +30. O bônus vale só para a ação reservada; repetir a mesma brincadeira reduz sua eficácia.' },
  { name: 'O Objeto', ability: 'Cumprindo ordem autêntica: submissão I +5 Acerto, II +15, III +30; benefício regular máximo +30. Grau IV: +50 em uma ação de sacrifício significativo por cena; V: +100 em renúncia extrema por arco. Graus substituem-se. Punições por rejeitar a condição exigem justificativa e registro.' },
  { name: 'O Caótico', ability: 'Ruptura real validada: I +5 Acerto, II +15, III +30. IV +50 em uma ação excepcional por cena; V +100 por arco; VI +200 em clímax decisivo por arco. O grau superior substitui os inferiores, só na ação correspondente; atacar uma autoridade ou repetir trivialidades não basta.' },
  { name: 'O Indomável', ability: 'Contra adversário superior, +5 Acerto por nível de diferença, até +30. Contra Boss validado pelo mestre, adicionalmente +15 Acerto, +20% Passos de dano e +20% RD. Condições terminam junto do confronto.' },
] as const;

export type ArchetypeName = typeof archetypeDefinitions[number]['name'];
export type ArchetypePsychology = 'normal' | 'contradiction' | 'rupture' | 'transformation';
export type ArchetypeActionScope = 'offense' | 'block' | 'dodge' | 'last-action';
export type ArchetypeCounter = 'protectedPeople' | 'justiceWeight' | 'sanityBreaks' | 'emotionalBonds';
export type ArchetypeAction = { id: string; archetype: string; scope: ArchetypeActionScope; bonus: number; degree: number; scene: number; arc: number; narrative: string };
export type ArchetypeState = {
  masterApproved: boolean; convictionActive: boolean;
  protectedPeople: number; justiceWeight: number; sanityBreaks: number; emotionalBonds: number;
  idealDegree: number; clownDegree: number; submissionDegree: number; chaosDegree: number;
  protecting: boolean; protectionDefense: 'block' | 'dodge'; justiceTarget: boolean;
  alone: boolean; selfInterest: boolean; idealAction: boolean; acceptingSacrifice: boolean;
  mortalRisk: boolean; obsessionAction: boolean; obeyingOrders: boolean; ruptureAction: boolean;
  enemyActive: boolean; enemyLevel: number; enemyBoss: boolean; bossApproved: boolean; enemyName: string;
  psychology: ArchetypePsychology; suspended: boolean; suspendThisAction: boolean; justification: string; transformationApproved: boolean; targetArchetype: string;
  scene: number; arc: number; sceneUsed: Record<string, boolean>; arcUsed: Record<string, boolean>;
  pendingAction: ArchetypeAction | null;
  circumstances: Array<{ key: string; counter: ArchetypeCounter; reference: string; points: number; at: number }>;
  actionHistory: Array<ArchetypeAction & { status: 'reserved' | 'consumed' | 'cancelled'; at: number }>;
  history: Array<{ from: string; to: string; reason: string; at: number }>;
  punishments: Array<{ id: string; resource: 'life' | 'sanity' | 'note'; amount: number; reason: string; at: number }>;
};

const bounded = (value: unknown, max: number, fallback = 0) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(0, Math.floor(Number(value)))) : fallback;
const bools = (value: unknown): Record<string, boolean> => value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, enabled]) => enabled === true)) : {};
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const keyOf = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g, ' ');
export const isArchetypeName = (value: string): value is ArchetypeName => archetypeDefinitions.some(item => item.name === value);

export function normalizeArchetypeState(value?: Partial<ArchetypeState> | null): ArchetypeState {
  const s = value && typeof value === 'object' ? value : {};
  const scene = Math.max(1, bounded(s.scene, 1_000_000, 1)), arc = Math.max(1, bounded(s.arc, 1_000_000, 1));
  const action = s.pendingAction;
  let pendingAction: ArchetypeAction | null = null;
  const sceneUsed = bools(s.sceneUsed), arcUsed = bools(s.arcUsed);
  if (action && typeof action === 'object' && typeof action.id === 'string' && action.id && action.scene === scene && action.arc === arc) {
    const degree = bounded(action.degree, 6), scope = action.scope;
    let bonus: number | null = null, sceneKey = '', arcKey = '';
    if (action.archetype === 'O Palhaço' && degree >= 1 && degree <= 3 && ['offense', 'block', 'dodge'].includes(scope)) { bonus = Math.min(degree * 15, scope === 'offense' ? 45 : 30); if (degree === 3) sceneKey = 'clown-iii'; }
    if (action.archetype === 'O Objeto' && scope === 'offense' && degree >= 4 && degree <= 5) { bonus = degree === 4 ? 50 : 100; if (degree === 4) sceneKey = 'object-iv'; else arcKey = 'object-v'; }
    if (action.archetype === 'O Caótico' && scope === 'offense' && degree >= 4) { bonus = [0, 0, 0, 0, 50, 100, 200][degree]; if (degree === 4) sceneKey = 'chaotic-iv'; else arcKey = degree === 5 ? 'chaotic-v' : 'chaotic-vi'; }
    if (action.archetype === 'O Obsessivo' && scope === 'last-action') { bonus = 0; sceneKey = 'obsessive-last'; }
    if (bonus !== null) { pendingAction = { ...action, bonus, degree, narrative: String(action.narrative || '') }; if (sceneKey) sceneUsed[sceneKey] = true; if (arcKey) arcUsed[arcKey] = true; }
  }
  return {
    masterApproved: s.masterApproved === true, convictionActive: s.convictionActive !== false,
    protectedPeople: bounded(s.protectedPeople, 6), justiceWeight: bounded(s.justiceWeight, 6), sanityBreaks: bounded(s.sanityBreaks, 6), emotionalBonds: bounded(s.emotionalBonds, 4),
    idealDegree: Math.max(1, bounded(s.idealDegree, 5, 1)), clownDegree: Math.max(1, bounded(s.clownDegree, 3, 1)), submissionDegree: Math.max(1, bounded(s.submissionDegree, 5, 1)), chaosDegree: Math.max(1, bounded(s.chaosDegree, 6, 1)),
    protecting: s.protecting === true, protectionDefense: s.protectionDefense === 'dodge' ? 'dodge' : 'block', justiceTarget: s.justiceTarget === true,
    alone: s.alone === true, selfInterest: s.selfInterest === true, idealAction: s.idealAction === true, acceptingSacrifice: s.acceptingSacrifice === true,
    mortalRisk: s.mortalRisk === true, obsessionAction: s.obsessionAction === true, obeyingOrders: s.obeyingOrders === true, ruptureAction: s.ruptureAction === true,
    enemyActive: s.enemyActive === true, enemyLevel: bounded(s.enemyLevel, 1_000_000), enemyBoss: s.enemyBoss === true, bossApproved: s.bossApproved === true, enemyName: String(s.enemyName || ''),
    psychology: ['normal', 'contradiction', 'rupture', 'transformation'].includes(String(s.psychology)) ? s.psychology as ArchetypePsychology : 'normal',
    suspended: s.suspended === true, suspendThisAction: s.suspendThisAction === true, justification: String(s.justification || ''), transformationApproved: s.transformationApproved === true, targetArchetype: isArchetypeName(String(s.targetArchetype)) ? String(s.targetArchetype) : 'O Protetor',
    scene, arc, sceneUsed, arcUsed, pendingAction,
    circumstances: Array.isArray(s.circumstances) ? s.circumstances.filter(x => x && typeof x.key === 'string' && ['protectedPeople', 'justiceWeight', 'sanityBreaks', 'emotionalBonds'].includes(x.counter)).map(x => ({ key: x.key, counter: x.counter, reference: String(x.reference || ''), points: bounded(x.points, 6), at: bounded(x.at, Number.MAX_SAFE_INTEGER) })) : [],
    actionHistory: Array.isArray(s.actionHistory) ? s.actionHistory.filter(x => x && typeof x.id === 'string').map(x => ({ ...x })) : [],
    history: Array.isArray(s.history) ? s.history.filter(x => x && typeof x.from === 'string' && typeof x.to === 'string').map(x => ({ from: x.from, to: x.to, reason: String(x.reason || ''), at: bounded(x.at, Number.MAX_SAFE_INTEGER) })) : [],
    punishments: Array.isArray(s.punishments) ? s.punishments.filter(x => x && ['life', 'sanity', 'note'].includes(x.resource)).map(x => ({ id: String(x.id || ''), resource: x.resource, amount: bounded(x.amount, 1_000_000_000), reason: String(x.reason || ''), at: bounded(x.at, Number.MAX_SAFE_INTEGER) })) : [],
  };
}

export type ArchetypeBonuses = { hit: number; block: number; dodge: number; lifeFlat: number; sanityFlat: number; damageFlat: number; lifePercent: number; rdPercent: number; stepsPercent: number; regenPercent: number; reroll: boolean; survivalBonus: number; needsTransformation: boolean; suspended: boolean; lastActionAvailable: boolean; pendingAction: ArchetypeAction | null; details: string[] };

export function calculateArchetype(name: string, input: Partial<ArchetypeState> | undefined, context: { level: number; hunger: number }): ArchetypeBonuses {
  const s = normalizeArchetypeState(input);
  const suspended = s.suspended || s.psychology === 'rupture' || s.psychology === 'transformation' || s.psychology === 'contradiction' && s.suspendThisAction;
  const pendingAction = s.pendingAction?.archetype === name ? s.pendingAction : null;
  const b: ArchetypeBonuses = { hit: 0, block: 0, dodge: 0, lifeFlat: 0, sanityFlat: 0, damageFlat: 0, lifePercent: 0, rdPercent: 0, stepsPercent: 0, regenPercent: 0, reroll: false, survivalBonus: 0, needsTransformation: name === 'O Niilista' && s.emotionalBonds >= 4, suspended, lastActionAvailable: false, pendingAction, details: [] };
  if (suspended || !isArchetypeName(name)) return b;
  const valid = s.masterApproved && s.convictionActive;
  const three = (amount: number) => { b.hit += amount; b.block += amount; b.dodge += amount; };
  switch (name) {
    case 'O Protetor': if (valid) { b.lifePercent = b.rdPercent = s.protectedPeople / 20; if (s.protecting) b[s.protectionDefense] += 15; } break;
    case 'O Justiceiro': if (valid) { b.hit = 5 * s.justiceWeight + (s.justiceTarget ? 15 : 0); b.dodge = 5 * s.justiceWeight; } break;
    case 'O Hedonista': b.reroll = valid && s.alone && s.selfInterest; break;
    case 'O Idealista': if (valid) { b.lifeFlat = [0, 10, 30, 60, 100, 150][s.idealDegree]; b.damageFlat = [0, 5, 10, 15, 25, 35][s.idealDegree]; b.hit = s.idealAction ? 15 : 0; } break;
    case 'O Mártir': b.sanityFlat = 35; if (valid) { three(5 * s.sanityBreaks); if (s.acceptingSacrifice) b.block += 15; } break;
    case 'O Sobrevivente': b.survivalBonus = valid && s.mortalRisk ? 30 : 15; b.regenPercent = valid && s.mortalRisk ? 1 : 0; break;
    case 'O Niilista': three(Math.max(0, 20 - 5 * s.emotionalBonds)); break;
    case 'O Obsessivo': if (valid && s.obsessionAction) { three(15); b.lastActionAvailable = !s.sceneUsed['obsessive-last']; } break;
    case 'O Insaciável': three(5 * Math.min(6, bounded(context.hunger, 1_000_000))); break;
    case 'O Palhaço': if (valid && pendingAction) { if (pendingAction.scope === 'offense') b.hit = pendingAction.bonus; else if (pendingAction.scope === 'block' || pendingAction.scope === 'dodge') b[pendingAction.scope] = pendingAction.bonus; } break;
    case 'O Objeto': if (valid && s.obeyingOrders) b.hit = pendingAction?.scope === 'offense' ? pendingAction.bonus : [0, 5, 15, 30, 30, 30][s.submissionDegree]; break;
    case 'O Caótico': if (valid && s.ruptureAction) b.hit = pendingAction?.scope === 'offense' ? pendingAction.bonus : [0, 5, 15, 30, 0, 0, 0][s.chaosDegree]; break;
    case 'O Indomável': if (valid && s.enemyActive) { b.hit = 5 * Math.max(0, Math.min(6, s.enemyLevel - context.level)); if (s.enemyBoss && s.bossApproved) { b.hit += 15; b.stepsPercent = b.rdPercent = .2; } } break;
  }
  for (const [field, label] of [['hit', 'Acerto'], ['block', 'Bloqueio'], ['dodge', 'Desvio / Esquiva'], ['lifeFlat', 'Vida máxima'], ['sanityFlat', 'Sanidade máxima'], ['damageFlat', 'Dano fixo'], ['survivalBonus', 'Teste de sobrevivência elegível']] as const) if (b[field]) b.details.push(`${label}: +${b[field]}`);
  for (const [field, label] of [['lifePercent', 'Vida máxima'], ['rdPercent', 'RD'], ['stepsPercent', 'Passos de dano'], ['regenPercent', 'Regeneração']] as const) if (b[field]) b.details.push(`${label}: +${Math.round(100 * b[field])}%`);
  if (b.reroll) b.details.push('Hedonista: uma repetição por teste, usando o melhor resultado.');
  return b;
}

export function recordArchetypeCounter(input: ArchetypeState, counter: ArchetypeCounter, reference: string, points = 1, now = Date.now()) {
  const s = normalizeArchetypeState(input), normalized = keyOf(reference), key = `${counter}:${normalized}`;
  if (!s.masterApproved || !normalized || s.circumstances.some(x => x.key === key)) return { state: s, error: 'Identifique uma circunstância distinta e validada pelo mestre; este registro não pode ser contado duas vezes.' };
  const limit = counter === 'emotionalBonds' ? 4 : 6, amount = Math.min(limit, Math.max(1, bounded(points, limit)));
  if (s[counter] >= limit) return { state: s, error: 'O contador já atingiu o limite.' };
  const applied = Math.min(amount, limit - s[counter]);
  return { state: { ...s, [counter]: s[counter] + applied, circumstances: [...s.circumstances, { key, counter, reference: reference.trim(), points: applied, at: now }] } };
}

export function armArchetypeAction(input: ArchetypeState, name: string, scope: ArchetypeActionScope, narrative: string, now = Date.now()) {
  const s = normalizeArchetypeState(input), active = calculateArchetype(name, s, { level: 0, hunger: 0 });
  if (active.suspended || !s.masterApproved || !s.convictionActive || !narrative.trim() || s.pendingAction) return { state: s, error: 'A ação precisa de validação do mestre, justificativa e nenhum benefício pendente.' };
  let bonus = 0, degree = 0, sceneKey = '', arcKey = '';
  if (name === 'O Palhaço' && scope !== 'last-action') { degree = s.clownDegree; bonus = Math.min(degree * 15, scope === 'offense' ? 45 : 30); if (degree === 3) sceneKey = 'clown-iii'; }
  else if (name === 'O Objeto' && scope === 'offense' && s.obeyingOrders && s.submissionDegree >= 4) { degree = s.submissionDegree; bonus = degree === 4 ? 50 : 100; if (degree === 4) sceneKey = 'object-iv'; else arcKey = 'object-v'; }
  else if (name === 'O Caótico' && scope === 'offense' && s.ruptureAction && s.chaosDegree >= 4) { degree = s.chaosDegree; bonus = [0, 0, 0, 0, 50, 100, 200][degree]; if (degree === 4) sceneKey = 'chaotic-iv'; else arcKey = degree === 5 ? 'chaotic-v' : 'chaotic-vi'; }
  else if (name === 'O Obsessivo' && scope === 'last-action' && s.obsessionAction) sceneKey = 'obsessive-last';
  else return { state: s, error: 'Não há ação especial disponível para este arquétipo, grau ou condição.' };
  if (sceneKey && s.sceneUsed[sceneKey] || arcKey && s.arcUsed[arcKey]) return { state: s, error: 'O benefício já foi reservado ou utilizado nesta cena/arco.' };
  const action: ArchetypeAction = { id: uid(), archetype: name, scope, bonus, degree, scene: s.scene, arc: s.arc, narrative: narrative.trim() };
  return { state: { ...s, pendingAction: action, sceneUsed: { ...s.sceneUsed, ...(sceneKey ? { [sceneKey]: true } : {}) }, arcUsed: { ...s.arcUsed, ...(arcKey ? { [arcKey]: true } : {}) }, actionHistory: [...s.actionHistory, { ...action, status: 'reserved' as const, at: now }] } };
}

export function consumeArchetypeAction(input: ArchetypeState, scope?: ArchetypeActionScope, now = Date.now()): ArchetypeState {
  const s = normalizeArchetypeState(input), action = s.pendingAction;
  if (!action || scope && action.scope !== scope && action.scope !== 'last-action') return s;
  return { ...s, pendingAction: null, actionHistory: [...s.actionHistory, { ...action, status: 'consumed', at: now }] };
}

export function resetArchetypePeriod(input: ArchetypeState, period: 'scene' | 'arc'): ArchetypeState {
  const s = normalizeArchetypeState(input), now = Date.now();
  return { ...s, scene: s.scene + 1, arc: s.arc + (period === 'arc' ? 1 : 0), sceneUsed: {}, arcUsed: period === 'arc' ? {} : s.arcUsed, pendingAction: null,
    protecting: false, justiceTarget: false, alone: false, selfInterest: false, idealAction: false, acceptingSacrifice: false, mortalRisk: false, obsessionAction: false, obeyingOrders: false, ruptureAction: false, enemyActive: false, enemyBoss: false, bossApproved: false,
    actionHistory: s.pendingAction ? [...s.actionHistory, { ...s.pendingAction, status: 'cancelled', at: now }] : s.actionHistory };
}

export function transformArchetype(current: string, input: ArchetypeState, next: string, now = Date.now()) {
  const s = normalizeArchetypeState(input);
  if (!s.transformationApproved || !s.justification.trim() || !isArchetypeName(next) || next === current) return { archetype: current, state: s, error: 'A transformação exige novo arquétipo, justificativa e aprovação do mestre.' };
  const clean = resetArchetypePeriod(s, 'scene');
  return { archetype: next, state: { ...clean, masterApproved: false, psychology: 'normal' as const, suspended: false, suspendThisAction: false, transformationApproved: false, history: [...s.history, { from: current, to: next, reason: s.justification.trim(), at: now }] } };
}

export function recordArchetypePunishment(input: ArchetypeState, resource: 'life' | 'sanity' | 'note', amount: number, reason: string, now = Date.now()) {
  const s = normalizeArchetypeState(input);
  if (!s.masterApproved || !reason.trim()) return { state: s, error: 'Punições exigem justificativa narrativa e aprovação do mestre.' };
  return { state: { ...s, punishments: [...s.punishments, { id: uid(), resource, amount: resource === 'note' ? 0 : bounded(amount, 1_000_000_000), reason: reason.trim(), at: now }] } };
}

export function hedonistReroll(first: number, second: number | null, available: boolean, used: boolean) {
  return available && !used && second !== null ? { die: Math.max(first, second), used: true } : { die: first, used };
}
