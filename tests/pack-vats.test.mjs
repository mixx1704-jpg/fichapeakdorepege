import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile:false, server:{ middlewareMode:true, hmr:false } });
after(() => vite.close());
const { blankVats, normalizeVats, vatsAction, vatsRCCost, passivePreview } = await vite.ssrLoadModule('/app/vats-engine.ts');
const { normalizeHealingResult, healingSummary, healingTechniques } = await vite.ssrLoadModule('/app/healing.ts');
const cfg = { currentLife:10,species:'ghoul',maxLife:200,maxRC:100,rc:100,hunger:0,vigor:15,baseVigor:10,grade:20,regeneration:10,regenLevel:1,superior:0,cells:false,kami:false,hasKagune:true,kaguneActive:true,durability:40,tails:2,naturalTails:2,powers:healingTechniques.map(technique=>technique.id),rd:4,movement:2,dodgeTest:'1d20+15',blockTest:'1d20+15' };
const heal = (state=blankVats(), patch={}, config=cfg, roll=()=>1) => vatsAction(state,config,{type:'healing-technique',healingId:'r26-cura-20',healingTarget:'life',...patch},roll);

test('custos são calculados uma vez, arredondados para baixo e efeitos pagos mantêm mínimo 1 RC', () => {
  const modifiers = {rcDiscount:2,regenRCDiscount:3,rcCostIncrease:1,rcCostMultiplier:.75};
  assert.equal(vatsRCCost(15,modifiers),10);
  assert.equal(vatsRCCost(15,modifiers,true),8);
  assert.equal(vatsRCCost(2,{rcDiscount:100,rcCostMultiplier:0}),1);
  assert.equal(vatsRCCost(.5,{rcDiscount:100}),1);
  assert.equal(vatsRCCost(0,{rcCostIncrease:8}),0);
  assert.equal(vatsRCCost(2.9,{}),2);
  assert.equal(vatsRCCost(15,{rcCostMultiplier:NaN}),15);
});

test('sem modificadores os fluxos anteriores ficam iguais aos multiplicadores neutros explícitos', () => {
  const state = blankVats();state.body.head.damage=30;
  const neutral = {...cfg,rcDiscount:0,rcCostIncrease:0,rcCostMultiplier:1,regenRCDiscount:0,healingReceivedMultiplier:1,temporaryLifeCapMultiplier:1,temporaryRCCapMultiplier:1};
  for(const action of [{type:'damage',region:'head',amount:7},{type:'heal',region:'head',amount:3},{type:'passive'},{type:'turn'}]) {
    assert.deepEqual(vatsAction(state,cfg,action,()=>1),vatsAction(state,neutral,action,()=>1));
  }
  assert.deepEqual(heal(state),heal(state,{},neutral));
});

test('a cura pode ser comprada com o custo real descontado e o recibo conserva esse custo em JSON', () => {
  const result = heal(blankVats(),{}, {...cfg,rc:8,rcDiscount:2,regenRCDiscount:3,rcCostIncrease:1,rcCostMultiplier:.75});
  assert.equal(result.currentRC,0);
  assert.equal(result.currentLife,22);
  assert.equal(result.vats.rcSpent,8);
  assert.equal(result.vats.healingResult.rcCost,8);
  assert.equal(normalizeVats(JSON.parse(JSON.stringify(result.vats))).healingResult.rcCost,8);
  assert.match(healingSummary(result.vats.healingResult),/8 RC/u);
  assert.match(result.vats.log[0],/8 RC/u);
});

test('cura recebida aumenta uma vez a cura própria, conserva os dados rolados e respeita a Vida faltante', () => {
  const result = heal(blankVats(),{healingId:'r26-cura-1'}, {...cfg,currentLife:195,healingReceivedMultiplier:1.25},()=>6);
  assert.equal(result.currentLife,200);
  assert.equal(result.vats.healingResult.total,12);
  assert.equal(result.vats.healingResult.applied,5);
  assert.equal(result.vats.healingResult.receivedMultiplier,1.25);
  assert.match(healingSummary(result.vats.healingResult),/×1.25: 15 PV/u);
  assert.equal(normalizeVats(JSON.parse(JSON.stringify(result.vats))).healingResult.receivedMultiplier,1.25);
  const notCapped = heal(blankVats(),{healingId:'r26-cura-1'}, {...cfg,healingReceivedMultiplier:1.25},()=>6);
  assert.equal(notCapped.currentLife,25);
});

test('o bônus de cura recebida do curador não aumenta a cura enviada a um aliado', () => {
  const result = heal(blankVats(),{healingId:'r26-cura-1',ally:true}, {...cfg,healingReceivedMultiplier:2},()=>6);
  assert.equal(result.currentLife,undefined);
  assert.equal(result.vats.healingResult.total,12);
  assert.equal(result.vats.healingResult.receivedMultiplier,undefined);
  assert.match(healingSummary(result.vats.healingResult),/12 PV/u);
  assert.doesNotMatch(healingSummary(result.vats.healingResult),/×2/u);
});

test('cura localizada recebida arredonda antes de aplicar e não reconstrói regiões destruídas', () => {
  const state = blankVats();state.body.armL.damage=7;state.body.armR={damage:200,destroyed:true,effects:['Braço Destruído']};
  const result = vatsAction(state,{...cfg,healingReceivedMultiplier:1.25},{type:'heal',region:'armL',amount:10.9});
  assert.equal(result.vats.body.armL.damage,0);
  assert.match(result.vats.log[0],/12 PV; 7 PV efetivos/u);
  const destroyed = vatsAction(state,{...cfg,healingReceivedMultiplier:2},{type:'heal',region:'armR',amount:100});
  assert.deepEqual(destroyed.vats.body.armR,state.body.armR);
});

test('prévia e cobrança da regeneração usam o mesmo custo sem aplicar descontos ou cura recebida duas vezes', () => {
  const state = blankVats();state.body.head.damage=20;state.meter=199;
  const config = {...cfg,rc:1,rcDiscount:1,regenRCDiscount:1,healingReceivedMultiplier:2};
  const preview = passivePreview(state,config);
  assert.equal(preview.amount,10);assert.equal(preview.total,10);assert.equal(preview.baseCost,2);assert.equal(preview.cost,1);
  const result = vatsAction(state,config,{type:'passive'});
  assert.equal(result.currentRC,0);assert.equal(result.vats.rcSpent,1);assert.equal(result.vats.body.head.damage,10);
  assert.match(result.vats.log[0],/1 RC/u);
  const repeat = vatsAction(result.vats,{...config,rc:0},{type:'passive'});
  assert.equal(repeat.vats.body.head.damage,10);assert.equal(repeat.vats.rcSpent,1);
});

test('desconto regenerativo vale para reconstruir partes e não para poderes ofensivos ou defensivos comuns', () => {
  const state = blankVats();state.turn=3;state.parts=[{damage:40,ready:3,sacrificedUntil:0}];
  const regen = vatsAction(state,{...cfg,rc:1,regenRCDiscount:5},{type:'part-regen',index:0});
  assert.equal(regen.currentRC,0);assert.equal(regen.vats.parts[0].ready,0);assert.match(regen.vats.log[0],/1 RC/u);
  const fortress = vatsAction(blankVats(),{...cfg,rc:20,regenRCDiscount:5,powers:['fortaleza-carne']},{type:'fortress'});
  assert.equal(fortress.currentRC,15);
  const growthState = blankVats();growthState.growth=2;growthState.parts=[{damage:40,ready:7,sacrificedUntil:0}];
  const growth = vatsAction(growthState,{...cfg,rc:1,regenRCDiscount:5,powers:['continua-crescendo']},{type:'growth'});
  assert.equal(growth.currentRC,0);assert.equal(growth.vats.parts[0].ready,0);
});

test('descontos não ignoram supressão, exaustão, cura ativa já usada ou insuficiência do custo real', () => {
  const suppressed=blankVats();suppressed.rcSuppressedUntil=4;
  const exhausted=blankVats();exhausted.global=['Exaurido de RC'];
  const used=blankVats();used.activeHealTurn=1;
  for(const state of [suppressed,exhausted,used]) {
    const result=heal(state,{}, {...cfg,rc:1,rcDiscount:100});
    assert.equal(result.currentRC,1);assert.equal(result.currentLife,undefined);assert.equal(result.vats.healingResult,null);
  }
  const insufficient=heal(blankVats(),{}, {...cfg,rc:7,rcDiscount:2,regenRCDiscount:3,rcCostIncrease:1,rcCostMultiplier:.75});
  assert.equal(insufficient.currentRC,7);assert.equal(insufficient.vats.healingResult,null);
});

test('tetos temporários só preservam os recursos adicionados manualmente sem encher reservas', () => {
  const config={...cfg,maxLife:100,maxRC:100,currentLife:118,rc:118,temporaryLifeCapMultiplier:1.2,temporaryRCCapMultiplier:1.2,powers:['anjo-morte']};
  const preserve=vatsAction(blankVats(),config,{type:'turn'});
  assert.equal(preserve.currentRC,118);assert.equal(preserve.currentLife,undefined);
  const gain=vatsAction(blankVats(),config,{type:'angel'});
  assert.equal(gain.currentRC,118,'recuperação comum não enche nem remove o excesso manual');
  const ordinary=vatsAction(blankVats(),{...config,currentLife:80,rc:90},{type:'angel'});
  assert.equal(ordinary.currentRC,92);assert.equal(ordinary.currentLife,undefined);
  const activated=vatsAction(blankVats(),{...config,currentLife:80,rc:90},{type:'turn'});
  assert.equal(activated.currentRC,90);assert.equal(activated.currentLife,undefined);
});

test('expirar o teto normaliza somente o excesso na próxima ação e conserva o histórico de cura', () => {
  const saved=heal().vats;
  const result=vatsAction(saved,{...cfg,maxLife:100,maxRC:100,currentLife:118,rc:118,temporaryLifeCapMultiplier:1,temporaryRCCapMultiplier:1},{type:'turn'});
  assert.equal(result.currentRC,100);assert.equal(result.currentLife,100);
  assert.deepEqual(result.vats.healingResult,saved.healingResult);
  const capped=vatsAction(blankVats(),{...cfg,maxRC:100,rc:200,temporaryRCCapMultiplier:1.2},{type:'turn'});
  assert.equal(capped.currentRC,120);
});

test('perdas de RC por lesão não recebem descontos e normalização de recibos limita entradas inválidas', () => {
  const destroyed=vatsAction(blankVats(),{...cfg,rc:20,rcDiscount:100,regenRCDiscount:100},{type:'kakuhou'},()=>6);
  assert.equal(destroyed.currentRC,14);
  const paid=normalizeHealingResult({id:'r26-cura-20',rcCost:999999});
  assert.equal(paid.rcCost,9999);
  assert.equal(normalizeHealingResult({id:'r26-cura-20',rcCost:-2}).rcCost,1);
  assert.equal(normalizeHealingResult({id:'r26-desbloqueio-rc',rcCost:999}).rcCost,0);
  assert.equal(normalizeHealingResult({id:'r26-cura-20'}).rcCost,15);
});
