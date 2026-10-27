import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const data=await vite.ssrLoadModule('/app/data.ts');
const {reworkText}=await vite.ssrLoadModule('/app/rework-rules.ts');
const perk=id=>data.perks.find(item=>item.id===id);

test('Golpe Preciso spends additive accuracy and Passo do Gato grants one fixed success',()=>{
  assert.match(perk('golpe-preciso').description,/converta acertos aditivos em \+1 Passo de Dano por acerto convertido/);
  assert.match(perk('passo-gato').description,/some \+1 acerto aditivo ao teste de Agilidade/);
  assert.doesNotMatch(perk('golpe-preciso').description,/\bdados?\b/);
  assert.doesNotMatch(perk('passo-gato').description,/\bdados?\b/);
});

test('legacy bonus pools and sacrificed accuracy are described as additive successes',()=>{
  for(const id of ['fluxo','mil-p0605','mil-p0627','mil-p0657','mil-p0814','mil-p0840','mil-p0967','mil-p0974'])assert.doesNotMatch(perk(id).description,/dados (?:adicionais|de acerto)|bônus (?:em|de) dados|sacrifício de dados/i,id);
  assert.match(data.kaguneEffects.find(item=>item.id==='mudanca-forma').description,/conceda acertos aditivos/);
  assert.match(data.evolutions.find(item=>item.id==='perda-peso').description,/Bloqueio soma metade da Agilidade base em acertos aditivos/);
});

test('legacy rerolls explicitly use the one test die and retain their repeat allowance',()=>{
  for(const id of ['mil-p0060','mil-p0119','mil-p0267','mil-p0299','mil-p0390','mil-p0408','mil-p0412','mil-p0417','mil-p0441','mil-p0616','mil-p0691','mil-p0761','mil-p0840','mil-p0850','mil-p0895','mil-p0904','mil-p0949','mil-p0987']){
    assert.match(perk(id).description,/rerro(?:le|lar|la) o único dado do teste/i,id);
    assert.doesNotMatch(perk(id).description,/rerro(?:le|lar|la)\s+(?:\w+\s+){0,3}acertos/i,id);
  }
  assert.match(perk('mil-p0299').description,/até três vezes/);
  assert.match(perk('mil-p0850').description,/até duas vezes/);
});

test('damage dice and information records are preserved verbatim',()=>{
  const damageDescriptions={
    'mil-p0028':'Ao acertar um alvo adjacente, pode trocar 1 dado de dano, antes da rolagem, por não ser empurrado por ele até seu próximo turno.',
    'mil-p0042':'Sacrifique um ataque normal disponível. Seu próximo ataque normal neste turno pode rerrolar até 2 dados de dano, mantendo os novos resultados.',
    'mil-p0745':'Ukaku + Bikaku: gaste 3 RC num tiro após apoiar a cauda; rerrole até dois dados de dano, mantendo resultados novos.',
  };
  for(const [id,text]of Object.entries(damageDescriptions))assert.equal(perk(id).description,text,id);
  assert.equal(reworkText('Rerrole um dado de dano; consulte dados indisponíveis.'),'Rerrole um dado de dano; consulte dados indisponíveis.');
  assert.match(perk('mil-p0219').description,/sem acessar dados indisponíveis/);
  assert.match(data.kaguneEffects.find(item=>item.id==='multiplas-caudas').description,/multiplique cada grupo de dados e o Modificador de Dano/);
});

test('legacy text normalization is idempotent and leaves no obsolete accuracy-pool bonuses',()=>{
  for(const item of [...data.perks.filter(item=>!item.id.startsWith('r26-')),...data.kaguneEffects,...data.evolutions]){
    assert.equal(reworkText(item.description),item.description,item.id);
    assert.doesNotMatch(item.description,/\bdados? de acerto\b|\bdados extras\b|\bdados adicionais\b|bônus (?:em|de) dados|\bem dados\b/i,item.id);
  }
});
