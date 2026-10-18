"""Import the supplied supplement; retain source IDs and pages for auditing."""
import json, re, sys
from pathlib import Path
from collections import Counter
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
reader = PdfReader(sys.argv[1])
labels = dict(forca='Força', vigor='Vigor', precisao='Precisão', agilidade='Agilidade', raciocinio='Raciocínio', percepcao='Percepção', presenca='Presença', controle='Controle')
defaults = {1:'forca',2:'vigor',3:'agilidade',4:'precisao',5:'percepcao',6:'agilidade',7:'presenca',8:'raciocinio',9:'controle',10:'controle',19:'raciocinio',20:'controle'}
patterns = {
 'forca':r'agarr|empurr|derrub|arromba|força|corpo a corpo',
 'vigor':r'bloqueio|resist|fôlego|sangra|veneno|\bdor\b|metaboli',
 'precisao':r'precisão|mira|disparo|projéte|pontaria|arremess|desarm|direcionad|finta',
 'agilidade':r'esquiva|escalad|salto|saltar|furtiv|esconder|corrid|persegui|movimento',
 'raciocinio':r'raciocínio|planej|plano|ferrament|consert|repar|medicin|diagnóst|anális|analis|dedu|document|prepar',
 'percepcao':r'percepção|perceb|rastro|vestígio|observ|ouvir|escut|farej|detec|pista|identific',
 'presenca':r'presença|negocia|conversa|intimida|convenc|lider|inspir|comando|sinal|mentira|disfarce|identidade',
 'controle':r'controle|sanidade|fome|alicerce|determinação|mácula|medo|pânico|impulso|emoç|promessa|juramento',
}
items=[]
for page_no,page in enumerate(reader.pages,1):
 text=page.extract_text()
 theme=re.search(r'TEMA (\d+)\s*/',text)
 if not theme: continue
 chapter=int(theme[1]); requirement=re.search(r'REQUISITO: (.*?)(?=\nP\d{4}\n)',text,re.S)[1]
 requirement=' '.join(requirement.split())
 text=text.split('P: passiva')[0]
 matches=list(re.finditer(r'^P(\d{4})\n(PASSIVA|ATIVA|REAÇÃO)\s*/\s*(\d+) PE\s*/\s*GRAU (\d+)\+\n([^\n]+)\n',text,re.M))
 assert len(matches)==10,(page_no,len(matches))
 for i,m in enumerate(matches):
  number=int(m[1]); desc=' '.join(text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)].split())
  grade=(int(m[4])+1)//2*2
  req=re.sub(r'Grau mínimo (\d+)',lambda m:f'Grau mínimo {(int(m[1])+1)//2*2}',requirement)
  item=dict(id=f'mil-p{number:04}',name=m[5],cost=int(m[3]),minGrade=grade,maxRank=1,description=desc,requirement=f'Grau {grade}+; {req}',sourceId=f'P{number:04}',sourcePage=page_no,chapter=chapter,useType=m[2].title(),supplement=True)
  if 11<=chapter<=18:
   group={11:'Ukaku',12:'Koukaku',13:'Rinkaku',14:'Bikaku',15:'Quimera',16:'Kakuja',17:'Quinque',18:'Quinx / Arata'}[chapter]
   item.update(category='Genérica',location='kakuhou',organGroup=group)
   if chapter<=15:
    item['requiredWeapon']='kagune'
    item['kaguneTypes']=[group] if chapter<15 else list(dict.fromkeys(re.findall(r'Ukaku|Koukaku|Rinkaku|Bikaku',desc)))
    if chapter==15:item['minKaguneTypes']=2
   if chapter==16:item['requiresKakuja']=True
   if chapter==17:item['requiredWeapon']='quinque'
   if chapter==18:
    if re.search(r'\bQuinx\b',desc):item['species']=['quinx'];item['requiredWeapon']='kagune'
    elif re.search(r'\bArata\b',desc):item['requiredWeapon']='arata'
    else:raise ValueError((number,desc))
  else:
   content=(m[5]+' '+desc).lower()
   scores={key:len(re.findall(pattern,content)) for key,pattern in patterns.items()}
   scores[defaults[chapter]]+=1
   # Explicit tested attributes take priority over narrative vocabulary.
   explicit=re.search(r'(?:teste|testes? de) (Força|Vigor|Precisão|Agilidade|Raciocínio|Percepção|Presença|Controle)|(Força|Vigor|Precisão|Agilidade|Raciocínio|Percepção|Presença|Controle) MD',m[5]+' '+desc,re.I)
   attr=next((k for k,v in labels.items() if explicit and v.lower()==(explicit[1] or explicit[2]).lower()),max(scores,key=scores.get))
   overrides={203:'raciocinio',210:'raciocinio',212:'raciocinio',213:'raciocinio',214:'raciocinio',222:'raciocinio',228:'raciocinio',231:'raciocinio',232:'raciocinio',233:'raciocinio',236:'raciocinio',239:'raciocinio',241:'raciocinio',245:'raciocinio',246:'raciocinio',247:'raciocinio',250:'raciocinio',351:'presenca',353:'forca',355:'percepcao',356:'raciocinio',358:'percepcao',359:'presenca',364:'presenca',365:'forca',368:'percepcao',951:'percepcao',953:'vigor',954:'raciocinio',955:'raciocinio',956:'presenca',957:'forca',958:'vigor',960:'percepcao',962:'precisao',963:'vigor',965:'agilidade',966:'presenca',967:'raciocinio',968:'percepcao',969:'agilidade',970:'agilidade',971:'raciocinio',972:'precisao',974:'vigor',975:'forca',976:'raciocinio',977:'precisao',978:'percepcao',980:'forca',981:'percepcao',982:'raciocinio',983:'agilidade',984:'presenca',985:'precisao',987:'raciocinio',988:'raciocinio',989:'presenca',991:'presenca',993:'agilidade',994:'precisao',996:'raciocinio',997:'percepcao',998:'agilidade'}
   overrides.update({3:'presenca',4:'precisao',7:'precisao',9:'precisao',13:'precisao',16:'precisao',17:'agilidade',20:'agilidade',21:'percepcao',26:'precisao',27:'vigor',32:'raciocinio',33:'precisao',40:'controle',46:'agilidade',107:'agilidade',112:'agilidade',127:'agilidade',128:'agilidade',135:'agilidade',179:'precisao',190:'precisao',254:'presenca',260:'presenca',263:'agilidade',264:'percepcao',266:'presenca',269:'agilidade',270:'precisao',272:'presenca',275:'percepcao',276:'percepcao',281:'presenca',283:'presenca',284:'precisao',292:'precisao',296:'presenca',298:'percepcao',300:'presenca',302:'presenca',317:'presenca',340:'presenca',343:'presenca',350:'presenca',455:'controle',470:'vigor',483:'raciocinio'})
   attr=overrides.get(number,attr)
   item.update(category=labels[attr],attribute=attr,location='vantagens')
   if chapter==10:item['requiresRC']=True
  items.append(item)
assert len(items)==1000
assert [x['sourceId'] for x in items]==[f'P{i:04}' for i in range(1,1001)]
(root/'app/thousand-perks.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(Counter(x.get('organGroup',x['category']) for x in items))
