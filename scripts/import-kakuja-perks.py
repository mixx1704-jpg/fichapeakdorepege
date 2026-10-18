"""Extract the 300 Kakuja Parte 1 entries without altering their effects."""
import json, re, sys, unicodedata
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parent.parent
reader=PdfReader(sys.argv[1])
modules=json.loads((root/'app/kakuja-modules.json').read_text(encoding='utf8'))
module_names={m['name']:m['id'] for m in modules}
elements={'Fogo':'fogo','Gelo':'gelo','Eletricidade':'eletricidade','Magnetismo':'magnetismo','Ácido':'acido','Veneno':'veneno','Resina':'resina','Metal':'metal','Cristal':'cristal','Luz':'luz','Sombra':'sombra','Vento':'pressao','Som':'vibracao','Cinzas':'fumaca'}
entries=[]
for page_number,page in enumerate(reader.pages,1):
 text=page.extract_text().strip()
 text=re.sub(r'\n\d+\s*$','',text)
 matches=list(re.finditer(r'^(\d{3}) · (.+)\n(\d+) PE · Grau (\d+)\+ · (\d+) CM · (.+)\nUso: (.+)\nRequisitos: (.+)\n',text,re.M))
 assert len(matches)==4,(page_number,len(matches))
 for i,m in enumerate(matches):
  req=m[8]
  description=' '.join(text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)].split())
  required_elements=[id for name,id in elements.items() if re.search(r'\b'+name+r'\b',req)]
  dependencies=[id for name,id in module_names.items() if name in req]
  if 'Reserva Kakuja' in req:dependencies.append('vesicula-de-rc-i')
  if required_elements or 'Infusões Elementais' in req:dependencies.append('infusao-elemental')
  entries.append(dict(id='kakuja-p1-'+m[1],sourceId=m[1],name=m[2],cost=int(m[3]),grade=(int(m[4])+1)//2*2,cm=int(m[5]),category=m[6],usage=m[7],requirement=req,effect=description,sourcePage=page_number,requiresModules=list(dict.fromkeys(dependencies)),requiresElements=required_elements,minElements=3 if 'Três Infusões' in req else 2 if 'Duas Infusões' in req else len(required_elements)))
assert len(entries)==300
assert [e['sourceId'] for e in entries]==[f'{i:03}' for i in range(1,301)]
# The one cross-perk prerequisite is not a structural module.
for e in entries:
 if 'Cravo de Polaridade' in e['requirement']:
  e['requiresPerks']=[next(p['id'] for p in entries if p['name']=='Cravo de Polaridade')]
(root/'app/kakuja-perks.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(len(entries),'perks;',len(set(e['category'] for e in entries)),'categorias')
