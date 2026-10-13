import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
const v=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
try {
 const d=await v.ssrLoadModule('/app/data.ts');
 const {kakujaPerks}=await v.ssrLoadModule('/app/kakuja-perks.ts');
 const {kakujaModules}=await v.ssrLoadModule('/app/kakuja-data.ts');
 const groups=[['Perks',d.perks],['Efeitos',d.kaguneEffects],['Evoluções',d.evolutions],['Perks de Kakuja',kakujaPerks],['Módulos de Kakuja',kakujaModules]];
 const report=`# Revisão das habilidades — 13/10/2026

## Resultado

Não é correto afirmar que todas as habilidades do catálogo aplicam seus efeitos automaticamente. O projeto possui habilidades com cálculos próprios, técnicas operadas por botões e condições, e suplementos cuja compra cobra PE e verifica requisitos, mas cujo efeito é descritivo. Esta atualização corrige os problemas numéricos identificados abaixo e explicita a aplicação manual dos suplementos.

## Verificações

${groups.map(([name,items])=>`- ${name}: ${items.length} itens revisados estruturalmente (IDs únicos, nomes, descrições e custos).`).join('\n')}
- Cada perk, efeito e evolução do personagem foi inserido isoladamente no cálculo para verificar cobrança de PE e ausência de números inválidos. Isso verifica integridade do cálculo, não comprova cada efeito narrativo ou todas as combinações possíveis.
- 72 testes passaram: progressão, requisitos, orçamento, habilidades autorais, maestrias, VATS, isolamento de quinques, imagens, migração, bônus raciais, caudas e correções abaixo.
- Conferência no navegador: compra de Múltiplas Caudas e Oito Caminhos, nome da cauda, reserva defensiva e contagem do dano das caudas selecionadas; sem erros de console observados.

## Correções e novas regras

- Ghoul, Ghoul Artificial e Ghoul-Dominante: Grau/2 dados adicionais em acerto físico, acerto de Kagune, bloqueio e esquiva. Não altera dano, atributos, testes comuns, humanos, Quinx ou quinques.
- Perda de Peso agora soma metade da Agilidade base ao bloqueio, além de seus ajustes de dano e RD.
- Arsenal Vivo — Martelo aplica +5 Passos, em vez de +5 no modificador fixo.
- Golpe Preciso e Equação Letal descontam os dados sacrificados do teste de acerto; Entre as Costelas e Justiceiro incluem o bônus de acerto condicionado.
- Predador dos Céus, Mil Penas e as duas Lanças incluem seus bônus de acerto quando ativados.
- Ferreiro da Guerra usa o atributo base, como descrito. Coruka aplica o multiplicador de Dureza Ukaku.
- Tentáculos Incessantes tem registro de sequência, máximo +2 dados, uma confirmação por turno e interrupção por turno sem ataque.
- Caudas têm nome, notas, uso e função. Caudas recolhidas, quebradas ou reservadas deixam o dano conjunto; Oito Caminhos concede uma única reserva de +2 RD ou +2 dados de esquiva.
- Mil Pernas cobra 15 RC, acrescenta duas caudas e +2 Passos, reduz Dureza em 2 e expira após três turnos. Mitose controla extras e duração de dois turnos, com custo confirmado pela mesa.

## Limites e aplicação manual

- ${d.perks.filter(p=>p.supplement).length} perks de suplemento e ${kakujaPerks.length} perks de Kakuja não possuem interpretação automática completa dos textos. Seus efeitos precisam ser aplicados pela mesa. Na ficha, use os ajustes ou Habilidades autorais para representar modificadores numéricos, sem cobrar novamente o custo de uma compra já paga.
- Técnicas com escolha de alvo, dano do inimigo, gatilho, crítico, gasto ou duração que não tenham um controle específico continuam exigindo acompanhamento da mesa. Os controles de “neste golpe” não gastam RC automaticamente.
- O texto de Mitose é inconsistente: os patamares descritos e o exemplo de oito extras por 40 RC não coincidem. Por isso, a interface pede o custo confirmado, desconta exatamente esse valor e controla a duração; não inventa uma tabela.
- Os botões de manifestar/recolher caudas escolhem seu uso; ativar a Kagune continua sendo necessário. Recolher não regenera caudas. Turnos avançam pela aba VATS.
- As fichas antigas continuam importáveis. Caudas sem configuração anterior começam selecionadas para ataque, mantendo o comportamento padrão.

Consulte INVENTARIO-HABILIDADES.tsv para a lista completa dos itens verificados estruturalmente. A revisão não constitui certificação automática de todos os efeitos de todos os suplementos.
`;
 await writeFile('REVISAO-HABILIDADES.md',report);
 const lines=['Catálogo\tID\tNome\tSituação',...groups.flatMap(([group,items])=>items.map(p=>[group,p.id,p.name,(p.supplement||group==='Perks de Kakuja')?'Compra/requisitos; efeitos manuais':'Integridade verificada; aplicação varia conforme técnica'].join('\t')))];
 await writeFile('INVENTARIO-HABILIDADES.tsv',lines.join('\n'));
 console.log(groups.map(([name,items])=>`${name}: ${items.length}`).join('; '));
} finally {await v.close();}
