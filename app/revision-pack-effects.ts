import type { PackContext, PackEffects, PackControl, PackReceipt } from './pack-effects';

const idFor = (n: number) => `r26-revisao-${String(n).padStart(3, '0')}`;
const whole = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

/** Events involving a target or ally are confirmed by the player, never inferred. */
export function applyRevisionPackEffects(context: PackContext, result: PackEffects): void {
  const b = result.bonuses;
  const weapon = context.weaponActive !== false && context.weaponKind === 'kagune';
  const cortexHistory = (context.conditions || context.genericpackConditions || {})[idFor(49)];
  if (whole(cortexHistory?.value) > 0 || cortexHistory?.mode === 'aftermath') result.lifeMultiplier += .9 - 1;
  const neuroseHistory = (context.conditions || context.genericpackConditions || {})[idFor(9)];
  if (whole(neuroseHistory?.value) > 0 || neuroseHistory?.active) result.baseLifeLossPercent = Math.max(result.baseLifeLossPercent, .2);
  if (result.eligiblePerkIds.some(id => id.startsWith('r26-revisao-'))) result.rules += '\nAs árvores de Raciocínio, Controle e Combate seguem seus percentuais descritos, sem o limite adicional do pacote de propriedades.';
  for (let n = 1; n <= 67; n++) {
    const id = idFor(n);
    if (!result.eligiblePerkIds.includes(id)) continue;
    const state = (context.conditions || context.genericpackConditions || {})[id] || {};
    const before = JSON.stringify([b, result.stepsMultiplier, result.rdMultiplier, result.kaguneDurabilityMultiplier, result.lifeMultiplier, result.offensiveAccuracyMultiplier, result.dodgeMultiplier]);
    const control = (key: PackControl['key'], label: string, type: PackControl['type'], extra: Partial<PackControl> = {}) => result.controls.push({ perkId: id, key, label, type, ...extra });
    const flag = (label: string) => { control('active', label, 'toggle', { defaultValue: false }); return state.active === true; };
    const count = (label: string, max: number, key: 'counter' | 'secondaryCounter' | 'value' = 'counter', fallback = 0) => {
      control(key, label, 'counter', { min: 0, max, defaultValue: fallback });
      return Math.min(max, whole(state[key] ?? fallback));
    };
    const mode = (label: string, options: Array<[string, string]>) => {
      control('mode', label, 'select', { defaultValue: 'none', options: [['none', 'Inativo'], ...options].map(([value, label]) => ({ value, label })) });
      return options.some(([value]) => value === state.mode) ? state.mode : 'none';
    };
    const hit = (amount: number, scope: 'both' | 'physical' | 'kagune' = 'both') => {
      if (scope !== 'kagune') b.physicalHit += amount;
      if (scope !== 'physical' && weapon) b.kaguneHit += amount;
    };
    const steps = (factor: number, scope: 'both' | 'physical' | 'kagune' | 'kakuja' = 'both') => {
      if (scope === 'both' || scope === 'physical') result.stepsMultiplier.physical += (factor) - 1;
      if (weapon && (scope === 'both' || scope === 'kagune')) result.stepsMultiplier.kagune += (factor) - 1;
      if (weapon && (scope === 'both' || scope === 'kagune' || scope === 'kakuja')) result.stepsMultiplier.kakuja += (factor) - 1;
    };
    const receipt = (label: string, values: Omit<PackReceipt, 'label' | 'perkId'> = {}) => result.receipts.push({ perkId: id, label, ...values });
    const rcCost = (percent: number, label: string, ignoreRCModifiers = false) => receipt(label, { costRC: Math.floor(whole(context.maxRC) * percent / 100), ignoreRCModifiers });
    const lifeCost = (percent: number, label: string) => receipt(label, { costLife: Math.floor(whole(context.maxLife) * percent / 100) });
    const rank = Math.min(n === 24 ? 10 : n === 67 ? 5 : 1, whole(context.perks[id]?.rank));
    const weaponFlag = (label: string) => flag(label) && weapon;
    switch (n) {
      case 1: hit(35); b.dodge += 35; if (flag('O ataque atual pode ser percebido')) b.dodge += 20; break;
      case 2: if (flag('Próximo ataque contra o inimigo observado / próxima defesa contra ele (até 2 turnos)')) { hit(20); b.dodge += 20; } break;
      case 3: { const phase = mode('Defesa contra uma das até 3 técnicas memorizadas', [['first', 'Uma defesa anterior: +10 Desvio'], ['repeat', 'Duas defesas anteriores: +20% Desvio']]); if (phase === 'first') b.dodge += 10; if (phase === 'repeat') result.dodgeMultiplier += (1.2) - 1; break; }
      case 4: if (flag('Análise ativa contra os próximos 3 ataques do alvo (1/turno; sacrifica 1 ataque)')) b.dodge += 30; break;
      case 5: if (flag('Defendendo dois ataques simultâneos com a mesma reação (1/turno)')) b.dodge -= 30; break;
      case 6: hit(40 * count('Erros consecutivos contra este alvo antes deste ataque (zera ao acertar)', 2)); break;
      case 7: if (flag('Campo ativo: mesmo alvo observado por 2 turnos, ainda percebido')) { hit(20); b.dodge += 20; } break;
      case 8: if (flag('Repetir esquiva após falha (+1 reação; 1/combate)')) b.dodge += 40; break;
      case 9: {
        const active = flag('Neurose ativa (ação livre; +50% acerto total)');
        // The activation marker remains after the temporary toggle is cleared.
        if (active || count('Primeira ativação já ocorreu: 1 = perda permanente de 20% da Vida base', 1, 'value')) result.baseLifeLossPercent = Math.max(result.baseLifeLossPercent, .2);
        if (active) result.offensiveAccuracyMultiplier += (1.5) - 1;
        receipt('2d100+30 de dano craniano são processados automaticamente uma vez em cada turno próprio de utilização, inclusive o primeiro. Desativar quita somente eventual dano pendente, sem cobrança extra. Morte por esse dano é definitiva.');
        break;
      }
      case 10: if (flag('Determinismo ativo contra o alvo observado (2 turnos; 1/combate)')) { hit(35); b.dodge += 35; if (count('Este ataque é um contra-ataque contra esse alvo? 1 = sim', 1)) hit(30); receipt('Recebe +20% de dano de outras criaturas durante o efeito; confirmar a origem do ataque.'); } break;
      case 11: hit(20, 'kagune'); break;
      case 12: if (weaponFlag('Defendendo este ataque com a Kagune')) b.block += 30; break;
      case 13: if (weaponFlag('Ataque dividido contra dois alvos diferentes; rolar cada um separadamente')) { hit(-25, 'kagune'); steps(.65, 'kagune'); } break;
      case 14: if (weaponFlag('Interceptando este ataque com Coração Blindado (1/turno)')) { result.rdMultiplier += (1.25) - 1; rcCost(5, 'Pagar Coração Blindado: 5% do RC máximo'); } break;
      case 15: if (weapon) { result.kaguneDurabilityMultiplier += (1.5) - 1; result.rdMultiplier += (1.2) - 1; steps(1.1, 'kagune'); } break;
      case 16: if (weapon) { result.kaguneDurabilityMultiplier += (.7) - 1; result.rdMultiplier += (.9) - 1; steps(1.2, 'kagune'); } break;
      case 17: { const form = mode('Configuração escolhida neste turno', [['defense', 'Defensiva: +20% Dureza; −10% Passos'], ['offense', 'Ofensiva: +20% Passos; −15% Dureza']]); if (weapon && form !== 'none') { result.kaguneDurabilityMultiplier += (form === 'defense' ? 1.2 : .85) - 1; steps(form === 'defense' ? .9 : 1.2, 'kagune'); } break; }
      case 18: if (weaponFlag('Terceiro turno ou posterior acertando o mesmo inimigo em todos os turnos')) result.penetrationPercent += 20; break;
      case 19: if (weaponFlag('Sinfonia ativa: 3 turnos; 1/combate')) { hit(35, 'kagune'); b.block += 35; steps(1.2, 'kagune'); rcCost(10, 'Pagar Sinfonia: 10% do RC máximo'); } break;
      case 20: { const form = mode('Arquitetura atual (máximo uma transformação por turno)', [['offense', 'Carnificina: +40% Passos, +25 Acerto, −20% Dureza'], ['defense', 'Fortaleza: +50% Dureza, +20% RD, −20% Passos']]); if (weapon && form !== 'none') { if (form === 'offense') { steps(1.4, 'kagune'); hit(25, 'kagune'); result.kaguneDurabilityMultiplier += (.8) - 1; } else { result.kaguneDurabilityMultiplier += (1.5) - 1; result.rdMultiplier += (1.2) - 1; steps(.8, 'kagune'); } rcCost(5, 'Somente ao ALTERNAR arquitetura: pagar 5% RC; escolha inicial é livre'); } break; }
      case 21: if (flag('Terminou o turno anterior sem ataques: reação extra deste turno')) b.reactions++; break;
      case 22: if (flag('Próximo ataque contra quem você esquivou com sucesso (até fim do próximo turno)')) { hit(25); steps(1.1); } break;
      case 23: if (flag('Após falha em bloqueio: gastar segunda reação (1/turno)')) result.incomingDamageMultiplier += (.85) - 1; break;
      case 24: b.reactions += rank; break;
      case 25: if (flag('Bloqueou completamente: aplicar −20 Acerto ao próximo ataque do adversário')) receipt('Adversário recebe −20 Acerto no próximo ataque, até fim do próximo turno dele; 1/turno.'); break;
      case 26: if (flag('Esquiva bem-sucedida: reposicionar até 3 m (1/turno)')) receipt('Deslocamento imediato de até 3 m, sem ação de movimento; não atravessa obstáculos nem remove agarrões automaticamente.'); break;
      case 27: if (flag('Contra-ataque após esquiva/bloqueio corpo a corpo: gastar 2 reações (1/turno)')) hit(-20); break;
      case 28: if (flag('Interceptação bem-sucedida de ataque contra aliado a até 3 m/alcance defensivo')) b.rd += 30; break;
      case 29: steps(1 + .1 * Math.max(0, count('Posição do próximo ataque consecutivo contra o mesmo alvo (1–4; zera ao errar/trocar)', 4) - 1)); break;
      case 30: if (flag('Última esquiva contra golpe fatal: gastar todas as reações restantes, mínimo 1 (1/combate)')) b.dodge += 50; break;
      case 31: hit(10 * count('Grupos de 3 ataques aliados em que você contribuiu contra este alvo (máx. 3; dura 2 turnos)', 3)); break;
      case 32: if (flag('Você bloqueou um ataque contra aliado com sucesso')) receipt('Aliado protegido recebe +30% Passos no turno seguinte; se anulou completamente o ataque, também +20 Acerto. Não altera o lançador.'); break;
      case 33: if (flag('Seu Ataque Conjunto: gastar 1 reação, uma vez por rodada')) { hit(15); receipt('O ataque do aliado recebe +10 Acerto. Seu ataque não consome ataques normais do próximo turno; não encadear outro Ataque Conjunto.'); } break;
      case 34: if (flag('Ataque de oportunidade após inimigo errar aliado próximo: gastar 1 reação (1/rodada)')) { hit(20); if (count('Aliado esquivou desse ataque? 1 = sim', 1)) steps(1.15); } break;
      case 35: { const benefit = mode('Vantagem transferida ao aliado (escolher UMA; 1/turno)', [['hit', '+40 Acerto no próximo ataque do aliado'], ['steps', '+20% Passos no próximo ataque do aliado']]); if (benefit !== 'none') receipt(benefit === 'hit' ? 'Conceder +40 Acerto ao próximo ataque do aliado.' : 'Conceder +20% Passos ao próximo ataque do aliado.'); if (flag('Aliado usou o bônus para acertar o mesmo alvo: Desvio até seu próximo turno')) b.dodge += 20; break; }
      case 36: { const stage = count('Corrente confirmada para você: 0 inativa, 1 primeira rodada, 2 renovada', 2); if (stage) { hit(stage === 1 ? 20 : 30); steps(stage === 1 ? 1.2 : 1.3); } break; }
      case 37: if (flag('Aliado defendeu com a reação cedida: +20 Desvio até o próximo turno')) b.dodge += 20; receipt('Ceder 1 reação defensiva ao aliado sem reações custa 2 suas; até 2 utilizações/rodada.'); break;
      case 38: if (flag('Vínculo ativo, aliado a até 5 m e inimigo ameaça ambos')) { b.block += 30; b.dodge += 20; result.rdMultiplier += (1.15) - 1; if (count('Seu próximo contra-ataque após parceiro bloquear por você? 1 = sim', 1)) steps(1.2); } break;
      case 39: if (flag('Aliado acertou a Intercalação: seu próximo ataque recebe +25% Passos')) steps(1.25); receipt('Aliado escolhido gasta 1 reação e antecipa um ataque normal com +25 Acerto; descontar do próximo turno. Até 2/rodada, aliados diferentes.'); break;
      case 40: { const stage = mode('Sua participação na Execução em Pinça', [['pincer', 'Um dos dois ataques por direções diferentes'], ['third', 'Terceiro ataque após os dois acertarem']]); if (stage === 'pincer') hit(20); if (stage === 'third') { hit(30); steps(1.35); result.penetrationPercent += 15; } break; }
      case 41: receipt('+2 reações permanentes EXCLUSIVAS para proteger aliados (não entram nas reações livres). Após proteger com sucesso, recuperar 1 reação usada (1/rodada) e conceder +15 Desvio ao aliado.'); break;
      case 42: if (flag('Sincronização ativa sobre até 3 aliados (3 rodadas; 1/combate)')) receipt('Aliados escolhidos: +25 Acerto, +20 Desvio, +1 Reação. Ataque adicional em turno de participante custa 1 reação e recebe +20% Passos; máximo 1 por participante/rodada.'); break;
      case 43: if (flag('Você interceptou com sucesso: +35% RD contra este ataque (custa 2 reações)')) result.rdMultiplier += (1.35) - 1; receipt('Aliado protegido: +50% Passos/+30 Acerto no próximo turno; se impediu golpe fatal: +70%/+40. 1/rodada.'); break;
      case 44: if (flag('Formação com 3+ aliados ativos, conscientes e percebendo-se')) { hit(15); b.dodge += 15; result.rdMultiplier += (1.1) - 1; if (count('Você recebe o próximo ataque após bloqueio de outro integrante? 1 = sim', 1)) steps(1.2); } break;
      case 45: { const phase = mode('Coreografia: você é um dos até 5 participantes', [['active', 'Durante as 3 rodadas'], ['aftermath', 'Rodada após término: −2 reações']]); if (phase === 'active') { hit(30); b.dodge += 20; b.reactions += 2; steps(1.2); if (count('Bônus de defesa bem-sucedida por aliado disponível? 1 = sim', 1)) steps(1.2); if (count('Este é um ataque conjunto? 1 = sim', 1, 'secondaryCounter')) steps(1.3); } if (phase === 'aftermath') b.reactions -= 2; break; }
      case 46: if (flag('Aplicar seu golpe final da Ofensiva de Extermínio (1/combate)')) { const hits = count('Ataques dos quatro aliados que acertaram antes do seu golpe final', 4); hit(20 * hits); steps(1 + .2 * hits); if (hits === 4) result.penetrationPercent += 25; } receipt('Até 4 aliados: 1 reação cada, +35 Acerto/+25% Passos; cada acerto concede +15% Passos ao próximo da sequência.'); break;
      case 47: { const phase = mode('Sobrecarga Sensorial', [['active', 'Ativa por 2 rodadas: alvo acompanhado e ataque percebido'], ['aftermath', 'Rodada após término: −25 Desvio e −2 reações']]); if (phase === 'active') { hit(30); b.dodge += 35; } if (phase === 'aftermath') { b.dodge -= 25; b.reactions -= 2; } break; }
      case 48: if (flag('Reação sacrificada para conceder bônus a um aliado: penalidade até seu turno')) { b.dodge -= 30; b.block -= 20; receipt('Aliado: +40 Acerto e +20% Passos neste único ataque. 1/rodada; exige poder reagir.'); } break;
      case 49: { const phase = mode('Córtex em Combustão (1/combate)', [['active', 'Ativo por 1 rodada: +60 Acerto/+40 Desvio'], ['aftermath', 'Após terminar: −10% Vida máxima até descanso longo']]); if (phase === 'active') { hit(60); b.dodge += 40; } receipt('1d100+50 de dano direto sem RD são processados automaticamente no turno de uso. A habilidade expira no próximo turno; −10% Vida máxima persistem até descanso longo. Uma rerrolagem ofensiva/defensiva mantendo o novo resultado.'); break; }
      case 50: { const target = mode('Vínculo ativo até próxima rodada: contexto deste teste', [['target', 'Contra inimigo escolhido'], ['other', 'Contra outro inimigo']]); if (target === 'target') { hit(25); b.dodge += 20; } if (target === 'other') b.dodge -= 25; break; }
      case 51: { const phase = mode('Hemorragia de RC (1/combate)', [['active', 'Ativa por 2 rodadas'], ['aftermath', 'Rodada após término: −20% Dureza']]); if (weapon && phase === 'active') { hit(25, 'kagune'); steps(1.4, 'kagune'); result.rdMultiplier += (.8) - 1; rcCost(15, 'Pagar ativação: 15% RC máximo, sem descontos', true); } if (weapon && phase === 'aftermath') { result.kaguneDurabilityMultiplier += (.8) - 1; rcCost(10, 'Pagar perda após término: 10% RC máximo, sem descontos', true); } break; }
      case 52: { const sacrificed = count('Sacrifício de Dureza vigente até fim do combate: 1 = sim', 1); if (weapon && sacrificed) result.kaguneDurabilityMultiplier += (.8) - 1; if (weaponFlag('Este é o único ataque beneficiado; sacrifício permanece mesmo errando') && sacrificed) { steps(1.6, 'kagune'); result.penetrationPercent += 20; } break; }
      case 53: if (weaponFlag('Proteger aliado alcançado: gastar reação e pagar 8% RC (até 2/rodada)')) { rcCost(8, 'Pagar Escudo Visceral: 8% RC máximo'); receipt('Aliado recebe +50% de sua própria RD neste ataque. Você sofre 20% do dano bruto do ataque como dano direto sem RD.'); } break;
      case 54: { const phase = mode('Kakuja Frenético (1/combate)', [['active', 'Ativo por 3 rodadas'], ['aftermath', 'Rodada seguinte: sem ataques Kagune/Kakuja; perder reações restantes']]); if (weapon && phase === 'active') { steps(1.5, 'kakuja'); result.kakujaHit += 30; result.kakujaAttacks += 2; result.incomingDamageMultiplier += (1.4) - 1; } if (phase === 'aftermath') receipt('Nesta rodada não pode atacar com Kagune/Kakuja; ao encerrar a forma, perder todas as reações restantes.'); break; }
      case 55: if (flag('Postura ativa por 2 rodadas: ataque atual é corpo a corpo')) { hit(35); steps(1.3); result.dodgeDisabled = true; b.block -= 30; receipt('Não pode usar Desvio nem reações para proteger aliados; penalidades persistem até fim da rodada mesmo se incapacitado.'); } break;
      case 56: if (flag('Aplicar Vida como Munição neste ataque (até 2/combate; paga mesmo errando)')) { hit(30); steps(1.5); lifeCost(10, 'Pagar 10% Vida máxima como dano direto sem RD; não pode chegar a zero'); receipt('Após o ataque, perder 1 reação disponível da rodada.'); } break;
      case 57: if (flag('Você defendeu aliado e ativou o Elo: contra outro inimigo até seu próximo turno')) b.dodge -= 20; receipt('Aliado protegido gasta 1 reação para atacar imediatamente com +25 Acerto/+20% Passos; não encadeia ataques extras.'); break;
      case 58: { const phase = mode('Dois Contra Um: seu ataque normal e reação são gastos', [['attack', 'Ataque sincronizado contra o mesmo alvo'], ['failed', 'Um dos dois errou: −25 Desvio até próximos turnos']]); if (phase === 'attack') { hit(20); steps(1.25); } if (phase === 'failed') b.dodge -= 25; break; }
      case 59: { const pos = count('Sua posição na Tríade (0 sem participação, 1–3)', 3); if (pos) { hit(10 * pos); steps(pos === 1 ? 1 : pos === 2 ? 1.1 : 1.25); result.rdMultiplier += (.85) - 1; receipt('Gastar um ataque normal e uma reação; −15% RD até seu próximo turno, inclusive se interrompida.'); } break; }
      case 60: if (flag('Marcha Forçada sobre até 4 aliados voluntários (1/combate)')) receipt('Cada aliado: pagar 1 reação e 10% Vida máxima sem RD; ataque extra com +30 Acerto/+30% Passos; −25% RD até fim da próxima rodada. Sem custo integral, não participa.'); break;
      case 61: if (flag('Interceptou com sucesso: aplicar +40% RD contra este ataque (2 reações; 1/combate)')) result.rdMultiplier += (1.4) - 1; receipt('Mesmo falhando, não poderá atacar no próximo turno. Aliado protegido recebe +50% Passos/+30 Acerto no próximo turno.'); break;
      case 62: if (flag('Elo Hemorrágico ativo por 2 rodadas: você e até 2 aliados conscientes')) { hit(20); result.rdMultiplier += (1.2) - 1; receipt('Dividir igualmente dano FINAL entre vinculados conscientes e arredondar para cima. Partilhas secundárias ignoram RD e não podem ser redirecionadas. Não encerrar voluntariamente.'); } break;
      case 63: if (flag('Seu ataque do Último Compasso: pagar antes (1/combate)')) { hit(50); steps(1.4); result.penetrationPercent += 20; lifeCost(15, 'Pagar 15% Vida máxima sem RD; não pode chegar a zero'); receipt('Você e até 3 aliados: cada um paga o próprio custo e fica sem reações até próximo turno; não encadear ataques extras.'); } break;
      case 64: if (flag('Comando ativado para até 3 aliados (1/combate)')) receipt('Cada aliado gasta 1 reação para ataque extra com +40 Acerto/+30% Passos e −30 Desvio até próximo turno. Você perde todos os ataques e movimento do próximo turno.'); break;
      case 65: { const phase = mode('Efeito Dominó (uma tentativa/combate)', [['chain', 'Resolver seu ataque da sequência'], ['broken', 'Primeiro erro encerrou a corrente']]); if (phase === 'chain') { const prev = count('Acertos consecutivos de aliados diferentes antes do seu ataque', 3); hit(15 * prev); steps(1 + .15 * prev); } if (phase === 'broken') { b.block -= 20; b.dodge -= 20; } break; }
      case 66: if (flag('Interceptação Suicida bem-sucedida contra golpe fatal de aliado (2 reações; 1/combate)')) result.rdMultiplier += (1.7) - 1; lifeCost(20, 'Custo inevitável mesmo falhando: 20% Vida máxima como dano direto sem RD; resolver se causar morte'); receipt('Se protegeu com sucesso, aliado recebe +80% Passos/+40 Acerto no próximo turno. Não transfira o custo a terceiros.'); break;
      case 67: hit(15 * rank, 'physical'); if (flag('A defesa atual é contra um ataque físico')) { b.dodge += 15 * rank; b.block += 15 * rank; } break;
    }
    const after = JSON.stringify([b, result.stepsMultiplier, result.rdMultiplier, result.kaguneDurabilityMultiplier, result.lifeMultiplier, result.offensiveAccuracyMultiplier, result.dodgeMultiplier]);
    if (after !== before || state.active || state.mode && state.mode !== 'none') result.activePerkIds.push(id);
  }
}
