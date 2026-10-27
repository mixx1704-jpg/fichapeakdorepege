import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const images=await vite.ssrLoadModule('/app/custom-skill-images.ts');
const skills=await vite.ssrLoadModule('/app/CustomSkillsPanel.tsx');
const character=await vite.ssrLoadModule('/app/character.ts');
const inline='data:image/webp;base64,UklGRg==';
const authored=(id,image)=>({id,name:id,description:'Teste',cost:15,activation:'passive',enabled:true,image,effects:[{id:`${id}-hit`,type:'hit-dice',value:3,scope:'kagune',attribute:'forca'}]});

test('imagens autorais persistem separadamente em Kagune, Kakuja e cada Quinque após exportar/importar',()=>{
 const source=character.normalizeCharacter({customSkills:[authored('kagune',inline)],kakuja:{customSkills:[authored('kakuja','https://example.com/kakuja.webp')]},quinques:[{id:'q-a',customSkills:[authored('a','https://example.com/a.png')]},{id:'q-b',customSkills:[authored('b','https://example.com/b.jpg')]}]});
 const restored=character.normalizeCharacter(JSON.parse(JSON.stringify(source)));
 assert.equal(restored.customSkills[0].image,inline);
 assert.equal(restored.kakuja.customSkills[0].image,'https://example.com/kakuja.webp');
 assert.equal(restored.quinques[0].customSkills[0].image,'https://example.com/a.png');
 assert.equal(restored.quinques[1].customSkills[0].image,'https://example.com/b.jpg');
 const removed=skills.normalizeCustomSkills(restored.customSkills.map(skill=>({...skill,image:undefined})));
 assert.equal(removed[0].image,undefined);
 assert.equal(restored.kakuja.customSkills[0].image,'https://example.com/kakuja.webp');
 assert.deepEqual(removed[0].effects,restored.customSkills[0].effects);
});

test('habilidades antigas sem imagem mantêm formato, preço e efeitos; imagem não modifica bônus',()=>{
 const legacy=authored('sem-imagem',undefined);delete legacy.image;
 assert.deepEqual(skills.normalizeCustomSkills([legacy]),[legacy]);
 const withImage=skills.normalizeCustomSkills([{...legacy,image:inline}]);
 assert.equal(skills.customSkillsCost(withImage),15);
 assert.deepEqual(skills.calculateCustomSkillBonuses(withImage),skills.calculateCustomSkillBonuses([legacy]));
});

test('normalização aceita imagens raster e links web; rejeita conteúdo executável, objetos e dados excessivos',()=>{
 assert.equal(images.normalizeCustomSkillImage(` ${inline} `),inline);
 assert.equal(images.normalizeCustomSkillImage('https://example.com/pic?id=1'),'https://example.com/pic?id=1');
 assert.equal(images.normalizeCustomSkillImage('http://localhost/pic.png'),'http://localhost/pic.png');
 for(const bad of ['javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=','file:///C:/x.png','blob:abc',{},null,'https://' ,`data:image/png;base64,${'A'.repeat(images.CUSTOM_SKILL_IMAGE_LIMIT)}`]) {
  assert.equal(images.normalizeCustomSkillImage(bad),undefined);
  assert.equal(skills.normalizeCustomSkills([authored('bad',bad)])[0].image,undefined);
 }
 assert.match(images.customSkillImageFileError({type:'image/svg+xml',size:100}),/JPG/);
 assert.match(images.customSkillImageFileError({type:'image/png',size:21*1024*1024}),/20 MB/);
 assert.equal(images.customSkillImageFileError({type:'image/gif',size:1024}),'');
});

test('upload reduz imagens grandes, tenta comprimir novamente e libera o arquivo temporário',async()=>{
 const original={Image:globalThis.Image,document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 const dimensions=[],revoked=[];let attempts=0;
 const canvas={width:0,height:0,getContext:()=>({drawImage:()=>dimensions.push([canvas.width,canvas.height])}),toDataURL:(format)=>{assert.equal(format,'image/webp');return attempts++===0?`data:image/webp;base64,${'A'.repeat(images.CUSTOM_SKILL_IMAGE_LIMIT)}`:inline;}};
 try {
  globalThis.Image=class{naturalWidth=1280;naturalHeight=640;set src(value){assert.equal(value,'blob:skill');queueMicrotask(()=>this.onload());}};
  globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return canvas;}};
  URL.createObjectURL=()=> 'blob:skill';URL.revokeObjectURL=url=>revoked.push(url);
  assert.equal(await images.prepareCustomSkillImage({type:'image/png',size:1000}),inline);
  assert.deepEqual(dimensions,[[640,320],[480,240]]);
  assert.deepEqual(revoked,['blob:skill']);
 } finally {
  globalThis.Image=original.Image;globalThis.document=original.document;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke;
 }
});

test('upload inválido não é salvo e erros de leitura liberam o arquivo temporário',async()=>{
 const original={Image:globalThis.Image,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 const revoked=[];let created=0;
 try {
  globalThis.Image=class{set src(value){queueMicrotask(()=>this.onerror());}};
  URL.createObjectURL=()=> {created++;return 'blob:bad';};URL.revokeObjectURL=url=>revoked.push(url);
  await assert.rejects(images.prepareCustomSkillImage({type:'image/png',size:1000}),/ler essa imagem/);
  assert.deepEqual(revoked,['blob:bad']);
  await assert.rejects(images.prepareCustomSkillImage({type:'image/svg+xml',size:1000}),/JPG/);
  assert.equal(created,1);
 } finally {
  globalThis.Image=original.Image;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke;
 }
});
