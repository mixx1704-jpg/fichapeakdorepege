import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const rules=await vite.ssrLoadModule('/app/rework-rules.ts');
const character=await vite.ssrLoadModule('/app/character.ts');
const custom=await vite.ssrLoadModule('/app/CustomSkillsPanel.tsx');

test('life and reactions round the final result down',()=>{
 assert.equal(rules.maximumLife('ghoul-artificial',14,5,7),217);
 assert.equal(rules.maximumLife('humano',1,0,0),27);
 assert.equal(character.reactionsPerRound(3,6),6);
 assert.equal(character.reactionsPerRound(0,2),4);
 assert.equal(character.reactionsPerRound(3,6,true),9);
});
test('accuracy and damage modifiers floor positive and negative fractions',()=>{
 assert.equal(character.formatTest(4.9,2.8),'1d20+4+2');
 assert.equal(character.formatTest(-0.1,-1.2),'1d20-1-2');
 assert.equal(character.formatDamage(1.9,2.9),'1d4+2');
 assert.equal(character.formatDamage(1.9,-0.1),'1d4-1');
});
test('fractional healing floors instead of giving the next point',()=>{
 assert.equal(character.calculateRegeneration(35,3,0,1).superior,8);
 assert.equal(character.calculateRegeneration(35,3,0,2).superior,11);
 assert.equal(character.calculateRegeneration(35,3,0,3).superior,20);
});
test('wound movement keeps its multiplier until the final distance',()=>{
 const sheet=character.normalizeCharacter({rulesVersion:8,species:'humano',grade:3,perks:{velocista:{rank:1}},customBonuses:{distance:0.8,rc:0.8,sanity:0.8,hp:0.8,attributes:{}},customSkills:[{id:'m',name:'Bônus',cost:1.8,activation:'passive',enabled:true,effects:[{id:'m1',type:'movement',value:1.8,scope:'both',attribute:'agilidade'}]}]},8);
 sheet.vats.body.legL.effects=['Perna Quebrada'];
 const result=character.calculateCharacter(sheet);
 assert.equal(result.wounds.movement,0.5);
 assert.equal(result.movement,1); // floor(0.5 × (2 + 1.8)), not floor(0.5) × 3.8.
 for(const key of ['maxLife','maxSanity','carrying','movement','determination','maxRC','rd','customSkillsPE','peAvailable','peSpent','peRemaining'])assert.ok(Number.isInteger(result[key]),key);
 assert.equal(sheet.customSkills[0].effects[0].value,1.8); // Imported input remains recoverable.
});
test('authorial costs aggregate before the final floor',()=>{
 assert.equal(custom.customSkillsCost([{cost:0.8},{cost:0.8}]),1);
});
