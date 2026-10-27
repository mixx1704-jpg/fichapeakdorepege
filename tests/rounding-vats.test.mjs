import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {blankVats,normalizeVats,passivePreview,vatsAction,adjustTest}=await vite.ssrLoadModule('/app/vats-engine.ts');
const config={maxLife:20.9,maxRC:40.9,rc:10.9,hunger:1.8,vigor:4.9,baseVigor:4.9,grade:4,regeneration:5.5,regenLevel:1.8,superior:0,cells:false,kami:false,hasKagune:true,kaguneActive:true,durability:10.9,tails:2,powers:[],rd:1.9,movement:1,dodgeTest:'1d20+4+2',blockTest:'1d20+4+2'};

test('VATS floors net damage after RD and keeps imported fractional input recoverable',()=>{
  const initial=blankVats();initial.body.head.damage=1.8;
  assert.equal(normalizeVats(initial).body.head.damage,1.8);
  const result=vatsAction(initial,config,{type:'damage',region:'head',amount:6.8,reduceRD:true});
  assert.equal(result.vats.body.head.damage,5); // floor(1.8 + floor(6.8 - 1.9)).
  assert.equal(result.currentRC,10);assert.equal(result.hunger,1);
  assert.equal(initial.body.head.damage,1.8);
});

test('fractional healing meters bill only whole effective PV and preserve one heal per turn',()=>{
  const initial=blankVats();initial.passiveMultiplier=0.5;initial.meter=20.9;
  initial.body.head.damage=2.9;initial.body.armL.damage=3.8;
  const preview=passivePreview(initial,config);
  assert.deepEqual([preview.amount,preview.total,preview.threshold,preview.cost],[2,4,22,2]);
  const result=vatsAction(initial,config,{type:'passive'});
  assert.equal(result.currentRC,8);assert.equal(result.vats.meter,2);
  assert.equal(result.vats.body.head.damage,0);assert.equal(result.vats.body.armL.damage,1);
  assert.equal(vatsAction(result.vats,{...config,rc:8},{type:'passive'}).vats.body.armL.damage,1);
});

test('fractional confirmed costs floor once when charging RC',()=>{
  const initial=blankVats();
  const result=vatsAction(initial,{...config,powers:['mitose-tentacruel'],naturalTails:2},{type:'mitosis',amount:1,cost:2.9});
  assert.equal(result.currentRC,8);assert.equal(result.vats.rcSpent,2);
  assert.equal(result.vats.mitosisCount,1);
});

test('temporary fractional accuracy changes floor signed values without changing the die',()=>{
  assert.equal(adjustTest('1d30+8+2',1.9),'1d30+8+2+1');
  assert.equal(adjustTest('1d10+8+2',-0.1),'1d10+8+2-1');
});
