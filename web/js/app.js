(()=>{
'use strict';
/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const deg=Math.PI/180;
const S=n=>+(+n).toFixed(4);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(v,dec=2)=>(Math.round(v*10**dec)/10**dec).toFixed(dec).replace('.',',');
const fm=v=>fmt(v,2)+' m';
const pnum=v=>{const n=parseFloat(String(v).replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:NaN};
const KEY='floorplan-v1',FILEKEY='floorplan-file';
// the app used to be called Setplan: carry over a drawing saved under the old name
try{if(!localStorage.getItem(KEY)&&localStorage.getItem('setplan-v1'))localStorage.setItem(KEY,localStorage.getItem('setplan-v1'))}catch(e){}
const H=window.Host;

/* ---------- catalog ---------- */
const CATS={cam:'Kamera',light:'Ljus',grip:'Grip & stativ',person:'Personer',prop:'Möbler & props',veh:'Fordon',arch:'Rum & bygg',note:'Markeringar',extra:'Övrigt'};
const CAT_ORDER=['cam','light','grip','person','prop','veh','arch','note'];
const T={};
const def=(key,cat,name,w,d,s,x={})=>{T[key]={key,cat,name,w,d,s,...x}};
const LEGS=c=>[['l',0,0,0,0.5,c],['l',0,0,-0.43,-0.25,c],['l',0,0,0.43,-0.25,c]];
const camX={kind:'camera'};
const litX=(o)=>({kind:'light',front:-0.5,beam:3,head:'Blixthuvud',stand:'Lampstativ',...o});

def('cam','cam','Kamera',0.7,0.7,[...LEGS('l d'),['r',-0.2,-0.12,0.4,0.28,'o',0.1],['r',-0.11,-0.33,0.22,0.22,'o',0.04],['l',-0.11,-0.33,0.11,-0.33,'l t'],['r',-0.07,0.17,0.14,0.06,'f']],{...camX,front:-0.33,support:'Stativ',lens:'24-70 mm',aspect:'3:2'});
def('cine','cam','Filmkamera',0.8,0.9,[...LEGS('l d'),['r',-0.17,-0.2,0.34,0.5,'o',0.05],['r',-0.11,-0.36,0.22,0.17,'o'],['p',[[-0.22,-0.5],[0.22,-0.5],[0.12,-0.36],[-0.12,-0.36]],'o'],['l',-0.22,-0.5,0.22,-0.5,'l t'],['r',0.19,-0.14,0.17,0.2,'o'],['r',-0.06,0.3,0.12,0.1,'f']],{...camX,front:-0.5,support:'Stativ',lens:'24-70 mm',aspect:'16:9'});
def('gimbal','cam','Kamera på gimbal',0.6,0.6,[['e',0,0,0.48,0.48,'l d'],['r',-0.2,-0.15,0.4,0.33,'o',0.1],['r',-0.11,-0.36,0.22,0.21,'o',0.04],['l',-0.11,-0.36,0.11,-0.36,'l t'],['l',-0.42,0.05,-0.2,0.05,'l t'],['l',0.2,0.05,0.42,0.05,'l t']],{...camX,front:-0.36,support:'Gimbal',lens:'24-70 mm',aspect:'16:9'});
def('dolly','cam','Kamera på dolly',0.75,1.0,[['r',-0.5,-0.32,1,0.82,'o',0.06],['e',-0.42,-0.24,0.1,0.06,'f'],['e',0.42,-0.24,0.1,0.06,'f'],['e',-0.42,0.42,0.1,0.06,'f'],['e',0.42,0.42,0.1,0.06,'f'],['r',-0.2,-0.3,0.4,0.24,'w',0.05],['r',-0.11,-0.5,0.22,0.2,'o'],['l',-0.11,-0.5,0.11,-0.5,'l t'],['e',0,0.25,0.18,0.12,'l']],{...camX,front:-0.5,support:'Inget',lens:'24-70 mm',aspect:'16:9'});

def('head','light','Blixthuvud',0.35,0.5,[['r',-0.22,-0.05,0.44,0.55,'o',0.08],['p',[[-0.5,-0.5],[0.5,-0.5],[0.22,-0.05],[-0.22,-0.05]],'o'],['l',-0.5,-0.5,0.5,-0.5,'l t']],litX({spread:55,head:''}));
def('softbox','light','Softbox 90×120',1.2,0.7,[['p',[[-0.5,-0.5],[0.5,-0.5],[0.12,0.15],[-0.12,0.15]],'o'],['l',-0.5,-0.5,0.5,-0.5,'l t'],['r',-0.13,0.15,0.26,0.35,'o',0.05]],litX({spread:90}));
def('strip','light','Stripbox 30×120',0.35,0.65,[['p',[[-0.5,-0.5],[0.5,-0.5],[0.26,0.15],[-0.26,0.15]],'o'],['l',-0.5,-0.5,0.5,-0.5,'l t'],['r',-0.32,0.15,0.64,0.35,'o',0.05]],litX({spread:60}));
def('octa','light','Octabox 150',1.5,0.85,[['p',[[-0.5,-0.5],[0.5,-0.5],[0.44,-0.38],[0.1,0.15],[-0.1,0.15],[-0.44,-0.38]],'o'],['l',-0.5,-0.5,0.5,-0.5,'l t'],['r',-0.1,0.15,0.2,0.35,'o',0.05]],litX({spread:100}));
def('para','light','Parabol 180',1.8,1.1,[['arc',0,-0.5,0.5,0.72,0,180,'o'],['l',-0.5,-0.5,0.5,-0.5,'l t'],['r',-0.08,0.2,0.16,0.3,'o',0.05]],litX({spread:70}));
def('deepumb','light','Djupt paraply 130',1.3,0.85,T.para.s,litX({spread:70}));
def('bdish','light','Beauty dish',0.55,0.45,[['arc',0,-0.5,0.5,0.62,0,180,'o'],['l',-0.5,-0.5,0.5,-0.5,'l t'],['l',-0.16,-0.4,0.16,-0.4,'l t'],['r',-0.16,0.12,0.32,0.38,'o',0.05]],litX({spread:60}));
def('umb','light','Paraply',1.05,0.75,[['arc',0,-0.2,0.5,0.3,180,360,'h'],['l',0,-0.5,0,0.3,'l'],['r',-0.14,0.1,0.28,0.4,'o',0.05]],litX({spread:120,front:-0.2}));
def('led','light','LED-panel',0.6,0.32,[['r',-0.5,-0.5,1,0.4,'o'],['l',-0.5,-0.5,0.5,-0.5,'l t'],['p',[[-0.5,-0.2],[-0.56,0.25],[0.56,0.25],[0.5,-0.2]],'l',true],['e',0,0.35,0.1,0.15,'f']],litX({spread:110,head:''}));
def('fresnel','light','Fresnel / spot',0.45,0.55,[['r',-0.32,-0.25,0.64,0.75,'o',0.05],['l',-0.32,-0.25,0.32,-0.25,'l t'],['l',-0.32,-0.25,-0.5,-0.5,'l'],['l',0.32,-0.25,0.5,-0.5,'l']],litX({spread:30,front:-0.25,faceW:0.64,beam:4,head:''}));
def('tube','light','Rörlampa',1.2,0.08,[['r',-0.5,-0.5,1,1,'o',0.5],['l',-0.45,0,0.45,0,'l x']],litX({spread:160,beam:2,head:'',stand:'Inget'}));

def('cstand','grip','C-stand',0.75,0.75,[...LEGS('l t'),['e',0,0,0.09,0.09,'f'],['l',0,0,-0.5,0,'l']]);
def('stand','grip','Lampstativ',0.8,0.8,[...LEGS('l'),['e',0,0,0.08,0.08,'f']]);
def('boom','grip','Bomarm',0.8,2.0,[['l',0,0.3,0,-0.5,'l t'],['l',0,0.3,0,0.5,'l'],['l',0,0.3,-0.45,0.2,'l'],['l',0,0.3,0.45,0.2,'l'],['r',-0.1,0.4,0.2,0.1,'f'],['e',0,-0.48,0.14,0.04,'o']]);
def('flag','grip','Flagga 60×90',0.6,0.25,[['r',-0.5,-0.5,1,0.3,'f'],['l',0,-0.2,0,0.5,'l']]);
def('diff','grip','Diffusionsram 1,8 m',1.8,0.25,[['r',-0.5,-0.5,1,0.3,'h'],['l',-0.5,-0.35,0.5,-0.35,'l d'],['e',-0.5,0.2,0.04,0.3,'f'],['e',0.5,0.2,0.04,0.3,'f']]);
def('butterfly','grip','Butterfly 2,4×2,4',2.4,2.4,[['r',-0.5,-0.5,1,1,'h'],['l',-0.5,-0.5,0.5,0.5,'l d'],['l',0.5,-0.5,-0.5,0.5,'l d']]);
def('vflat','grip','V-flat',1.2,0.6,[['p',[[-0.5,-0.5],[0,0.5],[0.5,-0.5],[0.43,-0.5],[0,0.33],[-0.43,-0.5]],'o']]);
const POLYFEET=[['l',-0.4,-1.6,-0.4,1.6,'l'],['l',0.4,-1.6,0.4,1.6,'l']];
def('poly','grip','Frigolitskiva vit',1.2,0.1,[['r',-0.5,-0.5,1,1,'w'],...POLYFEET]);
def('polyb','grip','Frigolitskiva svart',1.2,0.1,[['r',-0.5,-0.5,1,1,'f'],...POLYFEET]);
def('refl','grip','Reflexskiva',1.1,0.18,[['e',0,0,0.5,0.5,'h'],['l',-0.45,0,0.45,0,'l x']]);
def('paper','grip','Bakgrundspapper 2,72 m',2.9,2.4,[['r',-0.47,-0.5,0.94,0.88,'pap d'],['r',-0.5,0.38,1,0.07,'o',0.5],['e',-0.5,0.42,0.025,0.06,'f'],['e',0.5,0.42,0.025,0.06,'f']]);
def('sand','grip','Sandsäck',0.45,0.25,[['r',-0.5,-0.5,1,1,'f',0.4]]);
def('apple','grip','Äppellåda',0.5,0.3,[['r',-0.5,-0.5,1,1,'o'],['r',-0.3,-0.25,0.6,0.5,'l']]);
def('tether','grip','Teknikbord',1.2,0.6,[['r',-0.5,-0.5,1,1,'o'],['r',-0.35,-0.3,0.38,0.55,'w'],['l',-0.35,-0.02,0.03,-0.02,'l x'],['r',0.12,-0.42,0.3,0.14,'f']]);
def('monitor','grip','Monitor på stativ',0.6,0.6,[...LEGS('l d'),['r',-0.4,-0.5,0.8,0.18,'f']]);
def('track','grip','Dollyräls 3 m',0.62,3.0,[['l',-0.5,-0.5,-0.5,0.5,'l t'],['l',0.5,-0.5,0.5,0.5,'l t'],...[-0.45,-0.3,-0.15,0,0.15,0.3,0.45].map(y=>['l',-0.6,y,0.6,y,'l'])]);

const PERS=c=>[['e',0,0.05,0.5,0.45,c],['e',0,0,0.2,0.36,'w'],['p',[[-0.07,-0.33],[0.07,-0.33],[0,-0.5]],'f']];
def('model','person','Modell',0.55,0.32,PERS('o'));
def('actor','person','Skådespelare',0.55,0.32,PERS('o'));
def('child','person','Barn',0.4,0.24,PERS('o'));
def('crew','person','Fotograf',0.55,0.32,PERS('h'));
def('assist','person','Assistent',0.55,0.32,PERS('h'));
def('client','person','Kund',0.55,0.32,PERS('h'));
def('sit','person','Person sittande',0.55,0.7,[['r',-0.44,-0.2,0.88,0.68,'l d'],['r',-0.32,-0.5,0.24,0.45,'o',0.3],['r',0.08,-0.5,0.24,0.45,'o',0.3],['e',0,0.2,0.5,0.22,'o'],['e',0,0.16,0.2,0.16,'w'],['p',[[-0.06,0.02],[0.06,0.02],[0,-0.07]],'f']]);
def('dog','person','Hund',0.3,0.8,[['e',0,0.1,0.42,0.32,'o'],['e',0,-0.32,0.32,0.16,'o'],['e',-0.3,-0.36,0.14,0.07,'f'],['e',0.3,-0.36,0.14,0.07,'f'],['l',0,0.42,0,0.5,'l t']]);

def('chair','prop','Stol',0.45,0.45,[['r',-0.45,-0.42,0.9,0.82,'o',0.1],['r',-0.47,0.3,0.94,0.18,'f',0.1]]);
def('armchair','prop','Fåtölj',0.85,0.8,[['r',-0.5,-0.5,1,1,'o',0.12],['r',-0.5,0.25,1,0.25,'f',0.1],['r',-0.5,-0.45,0.17,0.7,'f',0.1],['r',0.33,-0.45,0.17,0.7,'f',0.1]]);
def('sofa','prop','Soffa',2.1,0.9,[['r',-0.5,-0.5,1,1,'o',0.06],['r',-0.5,0.25,1,0.25,'f',0.05],['r',-0.5,-0.45,0.07,0.7,'f'],['r',0.43,-0.45,0.07,0.7,'f'],['l',0,-0.5,0,0.25,'l']]);
def('table','prop','Bord',1.6,0.8,[['r',-0.5,-0.5,1,1,'o',0.02]]);
def('rtable','prop','Runt bord',0.9,0.9,[['e',0,0,0.5,0.5,'o']]);
def('stool','prop','Pall',0.38,0.38,[['e',0,0,0.5,0.5,'o'],['e',0,0,0.3,0.3,'l']]);
def('bed','prop','Säng',1.6,2.05,[['r',-0.5,-0.5,1,1,'o',0.03],['r',-0.45,-0.45,0.42,0.17,'w',0.2],['r',0.03,-0.45,0.42,0.17,'w',0.2],['l',-0.5,-0.2,0.5,-0.2,'l']]);
def('shelf','prop','Hylla',0.8,0.35,[['r',-0.5,-0.5,1,1,'o'],['l',-0.5,-0.5,0.5,0.5,'l x'],['l',0.5,-0.5,-0.5,0.5,'l x']]);
def('counter','prop','Bänk / disk',2.4,0.65,[['r',-0.5,-0.5,1,1,'o'],['l',-0.5,-0.4,0.5,-0.4,'l']]);
def('makeup','prop','Sminkbord',1.2,0.5,[['r',-0.5,-0.5,1,1,'o'],['l',-0.35,0.42,0.35,0.42,'l t'],['e',0,-0.75,0.15,0.35,'l d']]);
def('rack','prop','Klädställning',1.5,0.5,[['r',-0.5,-0.3,1,0.6,'l'],['l',-0.5,0,0.5,0,'l t'],...[-0.35,-0.2,-0.05,0.1,0.25,0.4].map(x=>['l',x,-0.25,x,0.25,'l x'])]);
def('plant','prop','Växt',0.6,0.6,[['e',0,0,0.5,0.5,'h'],...[0,60,120,180,240,300].map(a=>['l',0,0,0.45*Math.cos(a*deg),0.45*Math.sin(a*deg),'l']),['e',0,0,0.16,0.16,'o']]);
def('fan','prop','Fläkt',0.45,0.45,[['e',0,0,0.5,0.5,'o'],...[0,120,240].map(a=>['e',0.24*Math.cos(a*deg),0.24*Math.sin(a*deg),0.15,0.15,'l']),['e',0,0,0.09,0.09,'f']]);
def('flamp','prop','Golvlampa',0.45,0.45,[['e',0,0,0.5,0.5,'o'],['e',0,0,0.12,0.12,'f'],['l',-0.34,0,0.34,0,'l x'],['l',0,-0.34,0,0.34,'l x']]);
def('rug','prop','Matta',2.0,1.4,[['r',-0.5,-0.5,1,1,'h d'],['r',-0.45,-0.43,0.9,0.86,'l x']]);
def('mirror','prop','Spegel',0.8,0.08,[['r',-0.5,-0.5,1,1,'w'],['l',-0.45,-0.5,0.45,-0.5,'l t']]);
def('box','prop','Låda',0.5,0.5,[['r',-0.5,-0.5,1,1,'o'],['l',-0.5,-0.5,0.5,0.5,'l x'],['l',0.5,-0.5,-0.5,0.5,'l x']]);

def('car','veh','Bil',1.85,4.6,[['r',-0.47,-0.5,0.94,1,'o',0.12],['p',[[-0.4,-0.24],[0.4,-0.24],[0.35,-0.12],[-0.35,-0.12]],'w'],['p',[[-0.36,0.3],[0.36,0.3],[0.4,0.4],[-0.4,0.4]],'w'],['r',-0.36,-0.1,0.72,0.38,'l x'],['r',-0.5,-0.38,0.07,0.14,'f'],['r',0.43,-0.38,0.07,0.14,'f'],['r',-0.5,0.22,0.07,0.14,'f'],['r',0.43,0.22,0.07,0.14,'f'],['r',-0.56,-0.22,0.08,0.03,'f'],['r',0.48,-0.22,0.08,0.03,'f']]);
def('van','veh','Skåpbil',2.0,5.3,[['r',-0.48,-0.5,0.96,1,'o',0.06],['p',[[-0.42,-0.32],[0.42,-0.32],[0.4,-0.24],[-0.4,-0.24]],'w'],['l',-0.48,-0.2,0.48,-0.2,'l'],['r',-0.5,-0.38,0.06,0.12,'f'],['r',0.44,-0.38,0.06,0.12,'f'],['r',-0.5,0.24,0.06,0.12,'f'],['r',0.44,0.24,0.06,0.12,'f']]);
def('bike','veh','Cykel',0.6,1.75,[['r',-0.05,-0.5,0.1,0.38,'f',0.5],['r',-0.05,0.12,0.1,0.38,'f',0.5],['l',0,-0.3,0,0.25,'l t'],['l',-0.5,-0.33,0.5,-0.33,'l t'],['r',-0.12,0.08,0.24,0.08,'o',0.3]]);
def('mc','veh','Motorcykel',0.8,2.1,[['r',-0.08,-0.5,0.16,0.3,'f',0.5],['r',-0.09,0.22,0.18,0.28,'f',0.5],['e',0,0,0.32,0.26,'o'],['l',-0.5,-0.3,0.5,-0.3,'l t'],['r',-0.2,0.1,0.4,0.14,'o',0.3]]);

def('door','arch','Dörr',0.9,0.9,[['l',-0.5,0.5,-0.5,-0.5,'l t'],['arc',-0.5,0.5,1,1,-90,0,'l d',true],['l',-0.5,0.5,0.5,0.5,'l x']]);
def('window','arch','Fönster',1.2,0.2,[['r',-0.5,-0.5,1,1,'w'],['l',-0.5,0,0.5,0,'l']]);
def('pillar','arch','Pelare',0.4,0.4,[['r',-0.5,-0.5,1,1,'f']]);
def('wallseg','arch','Vägg',2.0,0.15,[['r',-0.5,-0.5,1,1,'f']]);
def('cyc','arch','Rundfond',4.0,3.0,[['r',-0.5,-0.5,1,1,'pap'],['l',-0.5,-0.5,0.5,-0.5,'l t'],['l',-0.5,-0.42,0.5,-0.42,'l d']]);
def('stairs','arch','Trappa',1.0,2.4,[['r',-0.5,-0.5,1,1,'w'],...[-0.4,-0.3,-0.2,-0.1,0,0.1,0.2,0.3,0.4].map(y=>['l',-0.5,y,0.5,y,'l x']),['l',0,0.45,0,-0.42,'l'],['p',[[-0.12,-0.34],[0,-0.45],[0.12,-0.34]],'l',true]]);
def('outlet','arch','Eluttag',0.2,0.12,[['r',-0.5,-0.5,1,1,'w'],['e',-0.2,0,0.1,0.18,'f'],['e',0.2,0,0.1,0.18,'f']]);

def('arrow','note','Rörelsepil',0.5,2.0,[['p',[[-0.12,0.5],[0.12,0.5],[0.12,-0.25],[0.5,-0.25],[0,-0.5],[-0.5,-0.25],[-0.12,-0.25]],'h']]);
def('mark','note','Markering (X)',0.3,0.3,[['l',-0.5,-0.5,0.5,0.5,'l t'],['l',0.5,-0.5,-0.5,0.5,'l t']]);
def('rect','note','Yta / zon',1.5,1.0,[['r',-0.5,-0.5,1,1,'h d']]);
def('circle','note','Cirkel',1.0,1.0,[['e',0,0,0.5,0.5,'h d']]);
def('text','note','Text',1,0.3,[]);

const LIST_DEFAULT={cam:true,light:true,grip:true,prop:true,veh:true,person:false,arch:false,note:false};
const SENSORS={ff:{n:'Fullformat 36×24 mm',s:'FF',w:36,h:24},s35:{n:'APS-C / Super35',s:'APS-C',w:23.5,h:15.6},mft:{n:'Micro 4/3',s:'MFT',w:17.3,h:13}};
const ASP={'3:2':1.5,'4:3':4/3,'5:4':1.25,'1:1':1,'16:9':16/9,'2,39:1':2.39};
const SUPPORTS=['Stativ','Gimbal','Handhållen','Axelrigg','Slider','Dolly','Kran / jib','Inget'];
const STANDS=['Lampstativ','C-stand','Bomarm','Takskena','Golvstativ','Inget'];
const FOCALS=[16,24,35,50,70,85,135];

/* ---------- document ---------- */
const DEF_SET={grid:0.5,snap:true,cones:true,dims:true,mdims:true,labels:true,gridOn:true,paper:'A4',scale:'auto',target:'auto'};
const DEF_LAYERS=()=>[['arch','Rum & bygg'],['prop','Möbler & props'],['veh','Fordon'],['grip','Grip & stativ'],['cones','Synfält & ljus'],['light','Ljus'],['person','Personer'],['cam','Kamera'],['note','Markeringar']].map(([id,name])=>({id,name,cat:id==='cones'?null:id,vis:true,lock:false}));
const isCones=l=>l&&l.id==='cones';
function mkItem(type,x,y,o={}){
  const t=T[type];
  const it={id:uid(),type,name:t.name,layer:t.cat,x,y,rot:0,w:t.w,d:t.d,show:['cam','light','person'].includes(t.cat),inList:LIST_DEFAULT[t.cat],note:'',p:{}};
  if(t.kind==='camera') it.p={focal:35,sensor:'ff',aspect:t.aspect||'3:2',orient:'land',dist:3,cone:true,lens:t.lens||'',support:t.support||'Stativ'};
  if(t.kind==='light') it.p={spread:t.spread,beam:t.beam,cone:true,head:t.head||'',stand:t.stand||'Lampstativ',setting:''};
  if(type==='text'){it.p={text:'Text',size:0.3};textSize(it)}
  const base=it.p; Object.assign(it,o); it.p={...base,...(o.p||{})};
  return it;
}
function textSize(it){it.w=Math.max(0.2,String(it.p.text||'').length*it.p.size*0.56);it.d=it.p.size*1.25}
function blankDoc(title=''){return{app:'floorplan',v:1,meta:{title,client:'',location:'',date:new Date().toISOString().slice(0,10),author:'',notes:''},room:{pts:[],closed:false,wall:0.2},layers:DEF_LAYERS(),items:[],dims:[],extras:[],set:{...DEF_SET}}}
function rectDoc(title,w,d){const D=blankDoc(title);D.room={pts:[[0,0],[w,0],[w,d],[0,d]],closed:true,wall:0.2};return D}
function exampleDoc(){
  const D=rectDoc('Exempel – porträtt helfigur',9,6.5);
  D.meta.example=true; D.meta.location='Studio'; D.meta.notes='Exempelritning. Key från vänster i 45°, två stripboxar som kantljus, V-flat som fill från höger.';
  D.items=[
    mkItem('paper',4.5,1.35,{rot:180}),
    mkItem('model',4.5,2.3,{rot:180}),
    mkItem('cam',4.5,5.7,{name:'Sony A1',p:{focal:70,orient:'port',dist:3.2,lens:'24-70 mm'}}),
    mkItem('crew',4.5,6.15),
    mkItem('octa',3.0,3.4,{rot:54,p:{head:'Profoto D2',setting:'f/8'}}),
    mkItem('strip',2.55,1.1,{rot:122,p:{head:'Profoto D2'}}),
    mkItem('strip',6.45,1.1,{rot:238,p:{head:'Profoto D2'}}),
    mkItem('vflat',6.2,3.4,{rot:303}),
    mkItem('tether',7.7,5.7),
    mkItem('makeup',1.2,5.9),
    mkItem('chair',1.2,5.35,{rot:180}),
  ];
  D.dims=[{id:uid(),a:[5.4,2.3],b:[5.4,5.48]}];
  D.extras=[{q:4,t:'Sandsäckar'},{q:1,t:'Förlängningskabel 10 m'}];
  return D;
}
function normalize(d){
  if(!d||typeof d!=='object') throw new Error('bad');
  const D=blankDoc();
  D.meta={...D.meta,...(d.meta||{})};
  if(d.room&&Array.isArray(d.room.pts)) D.room={pts:d.room.pts.filter(p=>Array.isArray(p)&&p.length===2).map(p=>[+p[0],+p[1]]),closed:!!d.room.closed,wall:+d.room.wall||0.2};
  if(Array.isArray(d.layers)&&d.layers.length){
    D.layers=d.layers.filter(l=>l&&l.id).map(l=>({id:String(l.id),name:String(l.name||'Lager'),cat:l.cat||null,vis:l.vis!==false,lock:!!l.lock}));
    DEF_LAYERS().forEach(l=>{if(D.layers.some(x=>x.id===l.id))return;
      if(isCones(l)){const gi=D.layers.findIndex(x=>x.id==='grip');l.vis=!(d.set&&d.set.cones===false);D.layers.splice(gi+1,0,l)}else D.layers.push(l)});
  }
  D.items=(d.items||[]).filter(it=>it&&T[it.type]).map(it=>{const b=mkItem(it.type,+it.x||0,+it.y||0);const n={...b,...it,p:{...b.p,...(it.p||{})}};if(!D.layers.some(l=>l.id===n.layer))n.layer=T[n.type].cat;return n});
  D.dims=(d.dims||[]).filter(m=>m&&m.a&&m.b).map(m=>({id:m.id||uid(),a:[+m.a[0],+m.a[1]],b:[+m.b[0],+m.b[1]]}));
  D.extras=(d.extras||[]).map(x=>({q:+x.q||1,t:String(x.t||'')}));
  D.set={...DEF_SET,...(d.set||{})};
  return D;
}

let doc=null;
const HANDLE=H.touch?11:6;
document.documentElement.classList.toggle('touch',!!H.touch);
try{const s=localStorage.getItem(KEY);if(s)doc=normalize(JSON.parse(s))}catch(e){doc=null}
if(!doc) doc=exampleDoc();

let sel=null, tool='select', activeTab='sel';
const view={cx:4.5,cy:3.25,s:60};
let undoS=[],redoS=[],cur=JSON.stringify(doc);

function record(){
  const s=JSON.stringify(doc);
  if(s===cur) return false;
  undoS.push(cur); if(undoS.length>200) undoS.shift();
  cur=s; redoS=[];
  try{localStorage.setItem(KEY,s)}catch(e){}
  docChanged(); updateUndo(); return true;
}
function undo(){if(!undoS.length)return;redoS.push(cur);cur=undoS.pop();doc=JSON.parse(cur);afterHistory()}
function redo(){if(!redoS.length)return;undoS.push(cur);cur=redoS.pop();doc=JSON.parse(cur);afterHistory()}
function afterHistory(){try{localStorage.setItem(KEY,cur)}catch(e){}docChanged();
  if(sel&&sel.t==='item'&&!selItem())sel=null; if(sel&&sel.t==='dim'&&!selDim())sel=null; if(sel&&sel.t==='room'&&!doc.room.pts.length)sel=null;
  updateUndo();syncTitle();render();refreshPanels()}
function updateUndo(){$('#undoB').disabled=!undoS.length;$('#redoB').disabled=!redoS.length}

const byId=id=>doc.items.find(i=>i.id===id);
const selItem=()=>sel&&sel.t==='item'?byId(sel.id):null;
const selDim=()=>sel&&sel.t==='dim'?doc.dims.find(d=>d.id===sel.id):null;
const conesOn=()=>{const l=doc.layers.find(isCones);return l?l.vis:true};
const itemLayers=()=>doc.layers.filter(l=>!isCones(l));
const layerOf=it=>doc.layers.find(l=>l.id===it.layer&&!isCones(l))||doc.layers.find(l=>l.id===T[it.type].cat)||doc.layers[0];
const layerIdx=it=>doc.layers.indexOf(layerOf(it));
function visItems(){return doc.items.map((it,i)=>({it,i,l:layerIdx(it)})).filter(o=>layerOf(o.it).vis).sort((a,b)=>a.l-b.l||a.i-b.i).map(o=>o.it)}
const snap=(v,st=0.05)=>doc.set.snap?Math.round(v/st)*st:v;
const snapPt=p=>({x:snap(p.x),y:snap(p.y)});

/* ---------- geometry ---------- */
function front(it){
  const t=T[it.type],r=it.rot*deg,ly=(t.front??-0.5)*it.d;
  return{ox:it.x-ly*Math.sin(r),oy:it.y+ly*Math.cos(r),fx:Math.sin(r),fy:-Math.cos(r),rx:Math.cos(r),ry:Math.sin(r)};
}
function frameOf(p){
  const s=SENSORS[p.sensor]||SENSORS.ff,a=ASP[p.aspect]||1.5,sa=s.w/s.h;
  let fw,fh; if(a>=sa){fw=s.w;fh=s.w/a}else{fh=s.h;fw=s.h*a}
  if(p.orient==='port')[fw,fh]=[fh,fw];
  const f=Math.max(1,+p.focal||35);
  return{h:2*Math.atan(fw/(2*f)),v:2*Math.atan(fh/(2*f)),W:p.dist*fw/f,H:p.dist*fh/f,fw,fh};
}
function pointIn(x,y,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const[a,b]=P[i],[e,f]=P[j];if((b>y)!==(f>y)&&x<(e-a)*(y-b)/(f-b)+a)c=!c}return c}
function area(P){let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function aabbHalf(it){const r=it.rot*deg;return{hx:(Math.abs(it.w*Math.cos(r))+Math.abs(it.d*Math.sin(r)))/2,hy:(Math.abs(it.w*Math.sin(r))+Math.abs(it.d*Math.cos(r)))/2}}
function contentBounds(){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const add=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)};
  const R=doc.room,m=R.wall/2+0.75;
  R.pts.forEach(p=>{add(p[0]-m,p[1]-m);add(p[0]+m,p[1]+m)});
  visItems().forEach(it=>{const h=aabbHalf(it);add(it.x-h.hx-0.15,it.y-h.hy-0.15);add(it.x+h.hx+0.15,it.y+h.hy+0.5);
    if(T[it.type].kind==='camera'&&it.p.cone&&conesOn()){const g=front(it);add(g.ox+g.fx*it.p.dist,g.oy+g.fy*it.p.dist)}});
  if(doc.set.mdims) doc.dims.forEach(d=>{add(d.a[0],d.a[1]);add(d.b[0],d.b[1])});
  if(!isFinite(x0)) return{x:-1,y:-1,w:8,h:6};
  const pad=0.3; return{x:x0-pad,y:y0-pad,w:x1-x0+2*pad,h:y1-y0+2*pad};
}

/* ---------- SVG rendering ---------- */
const SVG_RULES=`
.floor{fill:var(--floor)}
.gmin{stroke:var(--grid);fill:none}
.gmaj{stroke:var(--grid2);fill:none}
.wallp{fill:none;stroke:var(--wall);stroke-linejoin:miter;stroke-linecap:square}
.dim{stroke:var(--muted);fill:none}
.dimt{fill:var(--muted);font-family:var(--f-mono);paint-order:stroke;stroke:var(--floor);stroke-linejoin:round}
.c-cam{--cs:var(--cam);--cf:var(--cam-f)}
.c-light{--cs:var(--light);--cf:var(--light-f)}
.c-grip{--cs:var(--grip);--cf:var(--grip-f)}
.c-person{--cs:var(--person);--cf:var(--person-f)}
.c-prop{--cs:var(--prop);--cf:var(--prop-f)}
.c-veh{--cs:var(--veh);--cf:var(--veh-f)}
.c-arch{--cs:var(--arch);--cf:var(--floor)}
.c-note{--cs:var(--note);--cf:var(--note-f)}
.o{fill:var(--cf);stroke:var(--cs)}
.f{fill:var(--cs);stroke:none}
.l{fill:none;stroke:var(--cs);stroke-linecap:round}
.w{fill:var(--floor);stroke:var(--cs)}
.h{fill:var(--cs);fill-opacity:.14;stroke:var(--cs)}
.pap{fill:var(--paperroll);stroke:var(--cs)}
.txt{fill:var(--ink);font-family:var(--f-cond);font-weight:600}
.conec{fill:var(--cone-cam);fill-opacity:.11;stroke:var(--cone-cam);stroke-opacity:.55}
.conec2{fill:var(--cone-cam);fill-opacity:.035;stroke:var(--cone-cam);stroke-opacity:.3}
.subj{stroke:var(--cone-cam);fill:none}
.conet{fill:var(--cone-cam);font-family:var(--f-mono);paint-order:stroke;stroke:var(--floor);stroke-linejoin:round}
.conel{fill:var(--cone-light);fill-opacity:.13;stroke:var(--cone-light);stroke-opacity:.45}
.lbl{fill:var(--ink);font-family:var(--f-cond);font-weight:500;paint-order:stroke;stroke:var(--floor);stroke-linejoin:round}
.hit{fill:transparent;stroke:none}
.hitw{fill:none;stroke:transparent}
.sel{fill:none;stroke:var(--sel)}
.hnd{fill:var(--floor);stroke:var(--sel)}
.guide{stroke:var(--sel);stroke-opacity:.55;fill:none}
.wprev{fill:none;stroke:var(--sel)}
.wpt{fill:var(--sel)}
`;
const PRINT_VARS=`svg{--floor:#ffffff;--grid:#EEF1EF;--grid2:#D8DEDB;--wall:#111111;--ink:#111111;--muted:#4A5258;--paperroll:#F2F1EC;
--cam:#2346B5;--cam-f:#E8EDFB;--light:#A85F00;--light-f:#FCF0DC;--grip:#46515B;--grip-f:#ECEEF0;--person:#13705F;--person-f:#DEF1EC;--prop:#65523F;--prop-f:#F3EDE6;
--veh:#7B3551;--veh-f:#F5E5EB;--arch:#111111;--note:#C22B2B;--note-f:#FBE4E4;--cone-cam:#2346B5;--cone-light:#E0951A;
--f-cond:"Arial Narrow",Helvetica,Arial,sans-serif;--f-mono:Menlo,Consolas,"Courier New",monospace}`;
(()=>{const st=document.createElement('style');st.textContent=SVG_RULES;document.head.appendChild(st)})();

function sh(shapes,w,d,sw){
  let o='';
  const mk=c=>{const k=c.split(' ');let a=` class="${k[0]}"`;
    if(k.includes('t'))a+=` stroke-width="${S(sw*2.4)}"`;
    if(k.includes('x'))a+=` stroke-width="${S(sw*0.6)}"`;
    if(k.includes('d'))a+=` stroke-dasharray="${S(sw*5)} ${S(sw*3.5)}"`;
    return a};
  for(const s of shapes){
    const t=s[0];
    if(t==='r'){const[,x,y,ww,hh,c,rx=0]=s;o+=`<rect x="${S(x*w)}" y="${S(y*d)}" width="${S(ww*w)}" height="${S(hh*d)}" rx="${S(rx*Math.min(w,d))}"${mk(c)}/>`}
    else if(t==='e'){const[,cx,cy,rx,ry,c]=s;o+=`<ellipse cx="${S(cx*w)}" cy="${S(cy*d)}" rx="${S(rx*w)}" ry="${S(ry*d)}"${mk(c)}/>`}
    else if(t==='l'){const[,x1,y1,x2,y2,c]=s;o+=`<line x1="${S(x1*w)}" y1="${S(y1*d)}" x2="${S(x2*w)}" y2="${S(y2*d)}"${mk(c)}/>`}
    else if(t==='p'){const[,pts,c,open]=s;o+=`<path d="${pts.map((p,i)=>(i?'L':'M')+S(p[0]*w)+' '+S(p[1]*d)).join('')}${open?'':'Z'}"${mk(c)}/>`}
    else if(t==='arc'){const[,cx,cy,rx,ry,a0,a1,c,open]=s;let p='';for(let i=0;i<=28;i++){const a=(a0+(a1-a0)*i/28)*deg;p+=(i?'L':'M')+S((cx+rx*Math.cos(a))*w)+' '+S((cy+ry*Math.sin(a))*d)}o+=`<path d="${p}${open?'':'Z'}"${mk(c)}/>`}
  }
  return o;
}
function iconSVG(type,px=38){
  const t=T[type];
  if(type==='text')return`<svg viewBox="-1 -1 2 2" aria-hidden="true"><text class="txt" x="0" y="0.05" text-anchor="middle" dominant-baseline="central" font-size="0.95">Aa</text></svg>`;
  const m=Math.max(t.w,t.d)*1.14,sw=m/px*1.15;
  return`<svg viewBox="${S(-m/2)} ${S(-m/2)} ${S(m)} ${S(m)}" aria-hidden="true"><g class="c-${t.cat}" stroke-width="${S(sw)}">${sh(t.s,t.w,t.d,sw)}</g></svg>`;
}
const polyD=(P,closed)=>P.map((p,i)=>(i?'L':'M')+S(p[0])+' '+S(p[1])).join('')+(closed?'Z':'');

function gridSVG(o,sw){
  let g=+doc.set.grid||0.5; while(g*o.px<7) g*=2;
  const maj=g>=1?g*5:1; let a='',b='';
  const isM=v=>Math.abs(v/maj-Math.round(v/maj))<1e-6;
  const x0=Math.floor(o.x0/g)*g,y0=Math.floor(o.y0/g)*g;
  for(let i=0;;i++){const x=x0+i*g;if(x>o.x0+o.w)break;const sg=`M${S(x)} ${S(o.y0)}V${S(o.y0+o.h)}`;isM(x)?b+=sg:a+=sg}
  for(let i=0;;i++){const y=y0+i*g;if(y>o.y0+o.h)break;const sg=`M${S(o.x0)} ${S(y)}H${S(o.x0+o.w)}`;isM(y)?b+=sg:a+=sg}
  return`<path class="gmin" stroke-width="${S(sw*0.8)}" d="${a}"/><path class="gmaj" stroke-width="${S(sw)}" d="${b}"/>`;
}
function dimLine(A,B,sw,fs,o,ext){
  const dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy); if(len<1e-4) return '';
  const ux=dx/len,uy=dy/len,tk=5*o.k/o.px,tx=(ux-uy)*tk*0.7,ty=(uy+ux)*tk*0.7;
  let ang=Math.atan2(dy,dx)/deg; if(ang>90.5||ang<-89.5) ang+=180;
  const mx=(A[0]+B[0])/2,my=(A[1]+B[1])/2;
  return`${ext||''}<path class="dim" stroke-width="${S(sw)}" d="M${S(A[0])} ${S(A[1])}L${S(B[0])} ${S(B[1])}M${S(A[0]-tx)} ${S(A[1]-ty)}L${S(A[0]+tx)} ${S(A[1]+ty)}M${S(B[0]-tx)} ${S(B[1]-ty)}L${S(B[0]+tx)} ${S(B[1]+ty)}"/>`+
    `<text class="dimt" x="${S(mx)}" y="${S(my)}" font-size="${S(fs)}" stroke-width="${S(fs*0.45)}" text-anchor="middle" dominant-baseline="central" transform="rotate(${S(ang)} ${S(mx)} ${S(my)})">${fm(len)}</text>`;
}
function roomDims(o,sw,fs){
  const R=doc.room,P=R.pts,n=P.length; let s='';
  const off=R.wall/2+20*o.k/o.px,gap=R.wall/2+4*o.k/o.px;
  for(let i=0;i<n;i++){
    const a=P[i],b=P[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy); if(len<0.02) continue;
    let nx=dy/len,ny=-dx/len; const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
    if(pointIn(mx+nx*0.05,my+ny*0.05,P)){nx=-nx;ny=-ny}
    const A=[a[0]+nx*off,a[1]+ny*off],B=[b[0]+nx*off,b[1]+ny*off],e=off+4*o.k/o.px;
    const ext=`<path class="dim" stroke-width="${S(sw*0.7)}" d="M${S(a[0]+nx*gap)} ${S(a[1]+ny*gap)}L${S(a[0]+nx*e)} ${S(a[1]+ny*e)}M${S(b[0]+nx*gap)} ${S(b[1]+ny*gap)}L${S(b[0]+nx*e)} ${S(b[1]+ny*e)}"/>`;
    s+=dimLine(A,B,sw,fs,o,ext);
  }
  return s;
}
function coneSVG(it,o,sw,fs){
  const t=T[it.type]; if(!t.kind||!it.p.cone) return '';
  const g=front(it);
  if(t.kind==='camera'){
    const fr=frameOf(it.p),tn=Math.tan(fr.h/2),D=Math.max(0.1,+it.p.dist||3),F=Math.max(D*1.35,D+1);
    const pt=(dd,s)=>[g.ox+g.fx*dd+g.rx*s*dd*tn,g.oy+g.fy*dd+g.ry*s*dd*tn];
    const a1=pt(D,-1),a2=pt(D,1),b1=pt(F,-1),b2=pt(F,1),O=[g.ox,g.oy];
    const P=q=>S(q[0])+' '+S(q[1]);
    let s=`<path class="conec2" stroke-width="${S(sw)}" stroke-dasharray="${S(sw*5)} ${S(sw*4)}" d="M${P(a1)}L${P(b1)}L${P(b2)}L${P(a2)}Z"/>`;
    s+=`<path class="conec" stroke-width="${S(sw)}" d="M${P(O)}L${P(a1)}L${P(a2)}Z"/>`;
    s+=`<path class="subj" stroke-width="${S(sw*1.8)}" d="M${P(a1)}L${P(a2)}"/>`;
    const cx=(a1[0]+a2[0])/2+g.fx*fs*1.1,cy=(a1[1]+a2[1])/2+g.fy*fs*1.1;
    let ang=Math.atan2(g.ry,g.rx)/deg; if(ang>90.5||ang<-89.5) ang+=180;
    s+=`<text class="conet" x="${S(cx)}" y="${S(cy)}" font-size="${S(fs*0.95)}" stroke-width="${S(fs*0.45)}" text-anchor="middle" dominant-baseline="central" transform="rotate(${S(ang)} ${S(cx)} ${S(cy)})">${fmt(fr.W)} × ${fmt(fr.H)} m</text>`;
    return s;
  }
  // The beam starts at the full width of the modifier's front face: its edges run through the
  // face's outer corners, as if from a virtual point behind the light.
  const half=clamp(+it.p.spread||60,2,178)/2*deg,B=Math.max(0.1,+it.p.beam||3),a0=Math.atan2(g.fy,g.fx);
  const hw=it.w/2*(t.faceW||1),back=hw/Math.tan(half),ax=g.ox-g.fx*back,ay=g.oy-g.fy*back,R=back+B;
  let d=`M${S(g.ox-g.rx*hw)} ${S(g.oy-g.ry*hw)}`;
  for(let i=0;i<=24;i++){const a=a0-half+2*half*i/24;d+=`L${S(ax+R*Math.cos(a))} ${S(ay+R*Math.sin(a))}`}
  d+=`L${S(g.ox+g.rx*hw)} ${S(g.oy+g.ry*hw)}`;
  return`<path class="conel" stroke-width="${S(sw)}" stroke-dasharray="${S(sw*4)} ${S(sw*3)}" d="${d}Z"/>`;
}
function itemSVG(it,o,sw){
  const t=T[it.type]; let inner='';
  if(it.type==='text') inner=`<text class="txt" x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="${S(it.p.size)}">${esc(it.p.text)}</text>`;
  else inner=sh(t.s,it.w,it.d,sw);
  let hit='';const locked=o.screen&&layerOf(it).lock;
  if(o.screen&&!locked){const mw=Math.max(it.w,(H.touch?30:14)/o.px),md=Math.max(it.d,(H.touch?30:14)/o.px);hit=`<rect class="hit" x="${S(-mw/2)}" y="${S(-md/2)}" width="${S(mw)}" height="${S(md)}"/>`}
  return`<g class="c-${t.cat}"${locked?' pointer-events="none"':` data-id="${it.id}"`} transform="translate(${S(it.x)} ${S(it.y)}) rotate(${S(it.rot)})" stroke-width="${S(sw*1.15)}">${hit}${inner}</g>`;
}
function labelOf(it){
  const t=T[it.type]; let s=it.name;
  if(t.kind==='camera') s+=` · ${Math.round(it.p.focal)} mm`;
  if(t.kind==='light'&&it.p.setting) s+=` · ${it.p.setting}`;
  return s;
}
function labelsSVG(o,fs){
  if(!doc.set.labels) return '';
  let s='';
  for(const it of visItems()){
    if(!it.show||it.type==='text') continue;
    const h=aabbHalf(it),y=it.y+h.hy+fs*0.95;
    s+=`<text class="lbl" x="${S(it.x)}" y="${S(y)}" font-size="${S(fs)}" stroke-width="${S(fs*0.45)}" text-anchor="middle" dominant-baseline="central">${esc(labelOf(it))}</text>`;
  }
  return s;
}
function selSVG(o,sw){
  if(!sel) return '';
  const hr=HANDLE/o.px; let s='';
  if(sel.t==='item'){
    const it=selItem(); if(!it||!layerOf(it).vis) return '';
    const pad=7/o.px,w=it.w+2*pad,d=it.d+2*pad,rl=26/o.px;
    s+=`<g transform="translate(${S(it.x)} ${S(it.y)}) rotate(${S(it.rot)})" stroke-width="${S(sw*1.4)}">
<rect class="sel" x="${S(-w/2)}" y="${S(-d/2)}" width="${S(w)}" height="${S(d)}" stroke-dasharray="${S(sw*4)} ${S(sw*3)}"/>
<line class="sel" x1="0" y1="${S(-d/2)}" x2="0" y2="${S(-d/2-rl)}"/>
<circle class="hnd" data-h="rot" cx="0" cy="${S(-d/2-rl)}" r="${S(hr*1.1)}"/>
${it.type!=='text'?`<rect class="hnd" data-h="size" x="${S(w/2-hr)}" y="${S(d/2-hr)}" width="${S(2*hr)}" height="${S(2*hr)}"/>`:''}</g>`;
    const t=T[it.type];
    if(t.kind&&it.p.cone){
      const g=front(it),L=t.kind==='camera'?+it.p.dist:+it.p.beam,cx=g.ox+g.fx*L,cy=g.oy+g.fy*L,r=hr*1.35;
      s+=`<path class="hnd" data-h="${t.kind==='camera'?'dist':'beam'}" stroke-width="${S(sw*1.4)}" d="M${S(cx)} ${S(cy-r)}L${S(cx+r)} ${S(cy)}L${S(cx)} ${S(cy+r)}L${S(cx-r)} ${S(cy)}Z"/>`;
    }
  }else if(sel.t==='room'){
    const P=doc.room.pts; if(!P.length) return '';
    s+=`<path class="sel" stroke-width="${S(sw*1.4)}" d="${polyD(P,doc.room.closed)}" stroke-dasharray="${S(sw*4)} ${S(sw*3)}"/>`;
    const n=P.length,m=doc.room.closed?n:n-1;
    for(let i=0;i<m;i++){const a=P[i],b=P[(i+1)%n],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,r=hr*0.7;
      s+=`<rect class="hnd" data-h="mid" data-i="${i}" x="${S(mx-r)}" y="${S(my-r)}" width="${S(2*r)}" height="${S(2*r)}" stroke-width="${S(sw*1.2)}" opacity=".8"/>`}
    P.forEach((p,i)=>{s+=`<circle class="hnd" data-h="v" data-i="${i}" cx="${S(p[0])}" cy="${S(p[1])}" r="${S(hr)}" stroke-width="${S(sw*1.5)}"/>`});
  }else if(sel.t==='dim'){
    const d=selDim(); if(!d) return '';
    s+=`<path class="sel" stroke-width="${S(sw*3)}" stroke-opacity=".35" d="M${S(d.a[0])} ${S(d.a[1])}L${S(d.b[0])} ${S(d.b[1])}"/>`;
    [['da',d.a],['db',d.b]].forEach(([h,p])=>{s+=`<circle class="hnd" data-h="${h}" cx="${S(p[0])}" cy="${S(p[1])}" r="${S(hr)}" stroke-width="${S(sw*1.5)}"/>`});
  }
  return s;
}

/* wall drawing state */
let wd=null,lenBuf='',cursorW={x:0,y:0},mdraw=null,shiftHeld=false;
function wallTarget(p,shift){
  let q=snapPt(p); const g={};
  if(wd&&wd.pts.length){
    const L=wd.pts[wd.pts.length-1],dx=q.x-L[0],dy=q.y-L[1];
    const ang=Math.abs(Math.atan2(dy,dx)/deg);
    if(shift){ if(Math.abs(dx)>=Math.abs(dy)){q.y=L[1];g.h=1}else{q.x=L[0];g.v=1} }
    else if(ang<4||ang>176){q.y=L[1];g.h=1}
    else if(Math.abs(ang-90)<4){q.x=L[0];g.v=1}
    if(wd.pts.length>1){const F=wd.pts[0];
      if(!g.v&&Math.abs(q.x-F[0])*view.s<9){q.x=F[0];g.fx=1}
      if(!g.h&&Math.abs(q.y-F[1])*view.s<9){q.y=F[1];g.fy=1}}
  }
  return{q,g};
}
function wallPreview(o,sw,fs){
  const hr=4/o.px;
  if(!wd){const q=snapPt(cursorW);return`<circle class="wpt" cx="${S(q.x)}" cy="${S(q.y)}" r="${S(hr)}"/>`}
  const {q,g}=wallTarget(cursorW,shiftHeld); const P=[...wd.pts,[q.x,q.y]]; let s='';
  const F=wd.pts[0];
  if(g.fx) s+=`<path class="guide" stroke-width="${S(sw)}" stroke-dasharray="${S(sw*4)} ${S(sw*3)}" d="M${S(F[0])} ${S(F[1])}L${S(q.x)} ${S(q.y)}"/>`;
  if(g.fy) s+=`<path class="guide" stroke-width="${S(sw)}" stroke-dasharray="${S(sw*4)} ${S(sw*3)}" d="M${S(F[0])} ${S(F[1])}L${S(q.x)} ${S(q.y)}"/>`;
  s+=`<path class="wprev" stroke-width="${S(sw*2.5)}" d="${polyD(P,false)}"/>`;
  for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<0.02)continue;
    const nx=-dy/l*14/o.px,ny=dx/l*14/o.px; s+=dimLine([a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],sw,fs,o)}
  P.forEach((p,i)=>{s+=`<circle class="wpt" cx="${S(p[0])}" cy="${S(p[1])}" r="${S(i===0&&wd.pts.length>=3?hr*1.8:hr)}"/>`});
  if(lenBuf) s+=`<text class="lbl" x="${S(q.x+12/o.px)}" y="${S(q.y-12/o.px)}" font-size="${S(fs*1.2)}" stroke-width="${S(fs*0.45)}">${esc(lenBuf)} m ↵</text>`;
  return s;
}

function scene(o){
  const sw=o.k/o.px,fs=11*o.k/o.px,R=doc.room; let s='';
  const closed=R.closed&&R.pts.length>2;
  if(!o.screen&&closed) s+=`<defs><clipPath id="rc"><path d="${polyD(R.pts,true)}"/></clipPath></defs>`;
  if(closed) s+=`<path class="floor" d="${polyD(R.pts,true)}"/>`;
  if(doc.set.gridOn) s+=(!o.screen&&closed)?`<g clip-path="url(#rc)">${gridSVG(o,sw)}</g>`:gridSVG(o,sw);
  const vis=visItems();
  if(R.pts.length>1){
    s+=`<path class="wallp" stroke-width="${S(R.wall)}" d="${polyD(R.pts,R.closed)}"/>`;
    if(o.screen) s+=`<path class="hitw" data-room="1" stroke-width="${S(Math.max(R.wall,12/o.px))}" d="${polyD(R.pts,R.closed)}"/>`;
  }
  for(const L of doc.layers){
    if(!L.vis) continue;
    if(isCones(L)){vis.forEach(it=>{s+=coneSVG(it,o,sw,fs)});continue}
    vis.forEach(it=>{if(layerOf(it)===L)s+=itemSVG(it,o,sw)});
  }
  if(doc.set.dims&&closed) s+=roomDims(o,sw,fs);
  if(doc.set.mdims) doc.dims.forEach(d=>{
    s+=`<g data-dim="${d.id}">${o.screen?`<path class="hitw" stroke-width="${S(12/o.px)}" d="M${S(d.a[0])} ${S(d.a[1])}L${S(d.b[0])} ${S(d.b[1])}"/>`:''}${dimLine(d.a,d.b,sw*1.1,fs,o)}</g>`;
  });
  s+=labelsSVG(o,fs);
  if(o.screen){
    s+=selSVG(o,sw);
    if(tool==='wall') s+=wallPreview(o,sw,fs);
    if(mdraw) s+=dimLine([mdraw.a.x,mdraw.a.y],[mdraw.b.x,mdraw.b.y],sw*1.3,fs,o);
  }
  return s;
}

const cv=$('#cv');
let raf=0;
function render(){ if(raf) return; raf=requestAnimationFrame(()=>{raf=0;draw()}) }
function draw(){
  const W=cv.clientWidth||800,H=cv.clientHeight||600,s=view.s;
  const x0=view.cx-W/2/s,y0=view.cy-H/2/s;
  cv.setAttribute('viewBox',`${S(x0)} ${S(y0)} ${S(W/s)} ${S(H/s)}`);
  cv.innerHTML=scene({x0,y0,w:W/s,h:H/s,px:s,k:1,screen:true});
  drawScaleBar();
  if(sel&&sel.t==='item'&&activeTab==='sel') updateReadout();
}
function drawScaleBar(){
  const opts=[0.1,0.2,0.25,0.5,1,2,5,10,20,50,100]; let m=opts[0];
  for(const v of opts) if(v*view.s<=120) m=v;
  $('#scalebar').innerHTML=`<div class="sb"><span style="width:${Math.round(m*view.s)}px"></span>${m<1?Math.round(m*100)+' cm':fmt(m,0)+' m'}</div>`;
}
function toW(e){const r=cv.getBoundingClientRect();return{x:view.cx+(e.clientX-r.left-r.width/2)/view.s,y:view.cy+(e.clientY-r.top-r.height/2)/view.s}}
function fit(){
  const b=contentBounds(),W=cv.clientWidth||800,H=cv.clientHeight||600;
  view.s=clamp(Math.min(W/b.w,H/b.h)*0.9,4,2500); view.cx=b.x+b.w/2; view.cy=b.y+b.h/2; render();
}
function zoomBy(f,cx,cy){
  const W=cv.clientWidth,H=cv.clientHeight; if(cx==null){cx=W/2;cy=H/2}
  const wx=view.cx+(cx-W/2)/view.s,wy=view.cy+(cy-H/2)/view.s;
  view.s=clamp(view.s*f,4,2500); view.cx=wx-(cx-W/2)/view.s; view.cy=wy-(cy-H/2)/view.s; render();
}

/* ---------- interaction ---------- */
const ptrs=new Map(); let drag=null,pinch=null,spaceDown=false,lp={};
function startPinch(){const[a,b]=[...ptrs.values()],r=cv.getBoundingClientRect(),mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;
  pinch={d0:Math.hypot(a.x-b.x,a.y-b.y)||1,s0:view.s,wx:view.cx+(mx-r.width/2)/view.s,wy:view.cy+(my-r.height/2)/view.s}}
function doPinch(){const[a,b]=[...ptrs.values()],r=cv.getBoundingClientRect(),mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;
  view.s=clamp(pinch.s0*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d0,4,2500);view.cx=pinch.wx-(mx-r.width/2)/view.s;view.cy=pinch.wy-(my-r.height/2)/view.s;render()}

cv.addEventListener('pointerdown',e=>{
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){if(lp.t){clearTimeout(lp.t);lp={}}if(drag&&drag.k!=='pan'){record()}drag=null;mdraw=null;startPinch();return}
  if(ptrs.size>2) return;
  const p=toW(e); cursorW=p;
  if(e.button===1||spaceDown){drag={k:'pan',sx:e.clientX,sy:e.clientY,cx:view.cx,cy:view.cy};cv.classList.add('panning');return}
  if(e.pointerType==='mouse'&&e.button!==0) return;
  if(tool==='wall'){wallClick(p,e);return}
  if(tool==='measure'){const a=snapPt(p);mdraw={a,b:a};return}
  if(tool==='text'){const it=mkItem('text',snap(p.x),snap(p.y));doc.items.push(it);setTool('select');select({t:'item',id:it.id});record();render();
    setTimeout(()=>{const el=document.querySelector('[data-k="p.text"]');if(el){el.focus();el.select()}},30);return}
  const hEl=e.target.closest&&e.target.closest('[data-h]');
  if(hEl){startHandle(hEl.dataset.h,+hEl.dataset.i,p,e);return}
  const iEl=e.target.closest&&e.target.closest('[data-id]');
  if(iEl){const it=byId(iEl.dataset.id);if(!it)return;if(!sel||sel.id!==it.id)select({t:'item',id:it.id});drag={k:'move',it,ox:p.x-it.x,oy:p.y-it.y,x0:it.x,y0:it.y};render();
    if(e.pointerType!=='mouse'){const cx=e.clientX,cy=e.clientY;clearTimeout(lp.t);lp={sx:cx,sy:cy,t:setTimeout(()=>{if(!drag||drag.it!==it)return;it.x=drag.x0;it.y=drag.y0;drag=null;lp={};openCtx(it,cx,cy)},550)}}
    return}
  const dEl=e.target.closest&&e.target.closest('[data-dim]');
  if(dEl){const dm=doc.dims.find(d=>d.id===dEl.dataset.dim);if(!dm)return;select({t:'dim',id:dm.id});drag={k:'dim',dm,p0:p,a0:[...dm.a],b0:[...dm.b]};render();return}
  if(e.target.closest&&e.target.closest('[data-room]')){if(!sel||sel.t!=='room')select({t:'room'});drag={k:'room',p0:p,pts0:doc.room.pts.map(q=>[...q])};render();return}
  if(sel){select(null);render()}
  drag={k:'pan',sx:e.clientX,sy:e.clientY,cx:view.cx,cy:view.cy};cv.classList.add('panning');
});
function startHandle(h,i,p,e){
  if(h==='v'){ if(e.altKey&&doc.room.pts.length>3){doc.room.pts.splice(i,1);record();refreshPanels();render();return} drag={k:'v',i};return }
  if(h==='mid'){const P=doc.room.pts,a=P[i],b=P[(i+1)%P.length];P.splice(i+1,0,[S((a[0]+b[0])/2),S((a[1]+b[1])/2)]);drag={k:'v',i:i+1};render();return}
  if(h==='da'||h==='db'){drag={k:h,dm:selDim()};return}
  const it=selItem(); if(!it) return;
  drag={k:h,it,w0:it.w,d0:it.d};
}
cv.addEventListener('pointermove',e=>{
  if(ptrs.has(e.pointerId)) ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(lp.t&&Math.hypot(e.clientX-lp.sx,e.clientY-lp.sy)>8){clearTimeout(lp.t);lp={}}
  if(pinch&&ptrs.size===2){doPinch();return}
  const p=toW(e); cursorW=p; shiftHeld=e.shiftKey;
  $('#coords').textContent=`x ${fmt(p.x)}  y ${fmt(p.y)} m`;
  if(tool==='wall'){render();return}
  if(mdraw){mdraw.b=snapPt(p);render();return}
  if(!drag) return;
  const it=drag.it;
  switch(drag.k){
    case 'pan': view.cx=drag.cx-(e.clientX-drag.sx)/view.s; view.cy=drag.cy-(e.clientY-drag.sy)/view.s; break;
    case 'move': it.x=S(snap(p.x-drag.ox)); it.y=S(snap(p.y-drag.oy)); break;
    case 'rot': {let a=Math.atan2(p.x-it.x,-(p.y-it.y))/deg;const st=e.shiftKey?15:(e.altKey?1:5);a=Math.round(a/st)*st;it.rot=((a%360)+360)%360;break}
    case 'size': {const r=it.rot*deg,dx=p.x-it.x,dy=p.y-it.y,lx=dx*Math.cos(r)+dy*Math.sin(r),ly=-dx*Math.sin(r)+dy*Math.cos(r),pad=7/view.s;
      let w=Math.max(0.02,2*lx-2*pad),d=Math.max(0.02,2*ly-2*pad);
      if(e.shiftKey){const k=Math.max(w/drag.w0,d/drag.d0);w=drag.w0*k;d=drag.d0*k}
      it.w=S(Math.max(0.02,snap(w,0.01)));it.d=S(Math.max(0.02,snap(d,0.01)));break}
    case 'dist': case 'beam': {const g=front(it),v=(p.x-g.ox)*g.fx+(p.y-g.oy)*g.fy;it.p[drag.k]=S(Math.max(0.2,snap(v)));break}
    case 'v': {const P=doc.room.pts,n=P.length;let q=snapPt(p);
      [P[(drag.i-1+n)%n],P[(drag.i+1)%n]].forEach(nb=>{if(!nb)return;if(Math.abs(q.x-nb[0])*view.s<8)q.x=nb[0];if(Math.abs(q.y-nb[1])*view.s<8)q.y=nb[1]});
      P[drag.i]=[S(q.x),S(q.y)];break}
    case 'room': {const dx=p.x-drag.p0.x,dy=p.y-drag.p0.y;if(!drag.go&&Math.hypot(dx,dy)*view.s<5)return;drag.go=true;
      const sx=snap(dx),sy=snap(dy);doc.room.pts=drag.pts0.map(q=>[S(q[0]+sx),S(q[1]+sy)]);break}
    case 'dim': {const dx=snap(p.x-drag.p0.x),dy=snap(p.y-drag.p0.y);drag.dm.a=[S(drag.a0[0]+dx),S(drag.a0[1]+dy)];drag.dm.b=[S(drag.b0[0]+dx),S(drag.b0[1]+dy)];break}
    case 'da': case 'db': {const q=snapPt(p);drag.dm[drag.k==='da'?'a':'b']=[S(q.x),S(q.y)];break}
  }
  render();
});
function endPtr(e){
  ptrs.delete(e.pointerId);
  if(lp.t){clearTimeout(lp.t);lp={}}
  if(ptrs.size<2) pinch=null;
  cv.classList.remove('panning');
  if(mdraw){const{a,b}=mdraw;mdraw=null;
    if(Math.hypot(b.x-a.x,b.y-a.y)>0.03){const dm={id:uid(),a:[S(a.x),S(a.y)],b:[S(b.x),S(b.y)]};doc.dims.push(dm);sel={t:'dim',id:dm.id};record();refreshPanels()}
    render();return}
  if(drag){const k=drag.k;drag=null;if(k!=='pan'){record();refreshPanels()}}
}
cv.addEventListener('pointerup',endPtr);
cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('pointerleave',()=>{if(tool==='wall')render()});
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomBy(Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0015)),e.clientX-r.left,e.clientY-r.top)},{passive:false});
cv.addEventListener('dblclick',()=>{if(tool==='wall'&&wd&&wd.pts.length>=3)finishWall()});

function wallClick(p,e){
  if(!wd){const q=snapPt(p);wd={pts:[[S(q.x),S(q.y)]]};lenBuf='';render();return}
  const{q}=wallTarget(p,e.shiftKey),F=wd.pts[0];
  if(wd.pts.length>=3&&Math.hypot(q.x-F[0],q.y-F[1])*view.s<12){finishWall();return}
  const L=wd.pts[wd.pts.length-1]; if(Math.hypot(q.x-L[0],q.y-L[1])<0.01) return;
  wd.pts.push([S(q.x),S(q.y)]);lenBuf='';render();
}
function placeByLength(v){
  const L=wd.pts[wd.pts.length-1],{q}=wallTarget(cursorW,shiftHeld);
  let dx=q.x-L[0],dy=q.y-L[1],l=Math.hypot(dx,dy); if(l<1e-6){dx=1;dy=0;l=1}
  wd.pts.push([S(L[0]+dx/l*v),S(L[1]+dy/l*v)]);lenBuf='';render();
}
function finishWall(){
  if(!wd||wd.pts.length<3){toast('Rummet behöver minst tre hörn.');return}
  doc.room={pts:wd.pts,closed:true,wall:doc.room.wall||0.2}; wd=null; lenBuf='';
  if(doc.meta.example){doc.meta.example=false;showBanner()}
  setTool('select'); sel={t:'room'}; activeTab='sel'; record(); refreshPanels(); render();
}

/* keyboard */
addEventListener('keydown',e=>{
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  shiftHeld=e.shiftKey;
  if(!$('#modal').hidden){if(e.key==='Escape')closeModal();return}
  if(e.key===' '&&!typing){spaceDown=true;e.preventDefault();return}
  const mod=e.metaKey||e.ctrlKey;
  if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();if(typing)e.target.blur();e.shiftKey?saveAs():save();return}
  if(mod&&e.key.toLowerCase()==='o'){e.preventDefault();openProject();return}
  if(mod&&!typing&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
  if(mod&&!typing&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return}
  if(typing) return;
  if(tool==='wall'&&wd){
    if(/^[0-9]$/.test(e.key)||((e.key===','||e.key==='.')&&!/[.,]/.test(lenBuf))){lenBuf+=e.key===','?',':e.key==='.'?',':e.key;render();e.preventDefault();return}
    if(e.key==='Backspace'){e.preventDefault();if(lenBuf)lenBuf=lenBuf.slice(0,-1);else if(wd.pts.length>1)wd.pts.pop();else wd=null;render();return}
    if(e.key==='Enter'){e.preventDefault();const v=pnum(lenBuf);if(lenBuf&&v>0)placeByLength(v);else finishWall();return}
    if(e.key==='Escape'){wd=null;lenBuf='';render();return}
  }
  if(!ctx.hidden&&e.key==='Escape'){closeCtx();return}
  if(mod&&(e.key==='ArrowUp'||e.key==='ArrowDown')&&selItem()){e.preventDefault();reorder(e.key==='ArrowUp'?(e.shiftKey?'top':'up'):(e.shiftKey?'bottom':'down'));return}
  if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();return}
  if(mod) return;
  const it=selItem();
  switch(e.key){
    case 'Delete': case 'Backspace': e.preventDefault(); delSel(); break;
    case 'Escape': if(tool!=='select')setTool('select');else{select(null);render()} break;
    case 'v': case 'V': setTool('select'); break;
    case 'w': case 'W': setTool('wall'); break;
    case 'm': case 'M': setTool('measure'); break;
    case 't': case 'T': setTool('text'); break;
    case 'f': case 'F': fit(); break;
    case 'r': case 'R': if(it){it.rot=((it.rot+(e.shiftKey?-15:15))%360+360)%360;record();render();refreshPanels()} break;
    case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': {
      if(!it) return; e.preventDefault(); const st=e.shiftKey?0.5:0.05;
      if(e.key==='ArrowLeft')it.x=S(it.x-st); if(e.key==='ArrowRight')it.x=S(it.x+st);
      if(e.key==='ArrowUp')it.y=S(it.y-st); if(e.key==='ArrowDown')it.y=S(it.y+st);
      record();render();refreshPanels();break}
  }
});
addEventListener('keyup',e=>{if(e.key===' ')spaceDown=false;shiftHeld=e.shiftKey});

function delSel(){
  if(!sel) return;
  if(sel.t==='item') doc.items=doc.items.filter(i=>i.id!==sel.id);
  else if(sel.t==='dim') doc.dims=doc.dims.filter(d=>d.id!==sel.id);
  else if(sel.t==='room') doc.room={pts:[],closed:false,wall:doc.room.wall};
  sel=null; record(); render(); refreshPanels();
}
function duplicate(){
  const it=selItem(); if(!it) return;
  const c=JSON.parse(JSON.stringify(it)); c.id=uid(); c.x=S(c.x+0.3); c.y=S(c.y+0.3);
  doc.items.push(c); sel={t:'item',id:c.id}; record(); render(); refreshPanels();
}
function reorder(mode){
  const it=selItem(); if(!it) return;
  const arr=doc.items,L=layerOf(it),same=arr.filter(x=>layerOf(x)===L),k=same.indexOf(it);
  const atTop=k===same.length-1,atBot=k===0;
  if((mode==='up'||mode==='top')&&atTop){toast(`Redan överst i lagret ${L.name}. Flytta upp lagret i fliken Lager för att lägga det över andra lager.`);return}
  if((mode==='down'||mode==='bottom')&&atBot){toast(`Redan underst i lagret ${L.name}. Flytta ned lagret i fliken Lager för att lägga det under andra lager.`);return}
  const ref=mode==='up'?same[k+1]:mode==='down'?same[k-1]:mode==='top'?same[same.length-1]:same[0];
  arr.splice(arr.indexOf(it),1);
  const ri=arr.indexOf(ref);
  arr.splice((mode==='up'||mode==='top')?ri+1:ri,0,it);
  record(); render(); refreshPanels();
}
function moveToLayer(it,id){const L=doc.layers.find(l=>l.id===id);if(!it||!L)return;it.layer=id;if(!L.vis){L.vis=true;toast(`Lagret ${L.name} var dolt och visas nu.`)}record();render();refreshPanels()}

/* context menu */
const ctx=document.createElement('div');ctx.className='ctx';ctx.hidden=true;document.body.appendChild(ctx);
function closeCtx(){ctx.hidden=true}
cv.addEventListener('contextmenu',e=>{
  e.preventDefault();
  const iEl=e.target.closest&&e.target.closest('[data-id]'); if(!iEl){closeCtx();return}
  const it=byId(iEl.dataset.id); if(!it) return;
  openCtx(it,e.clientX,e.clientY);
});
function openCtx(it,cx,cy){
  select({t:'item',id:it.id}); render();
  ctx.innerHTML=`<button data-c="top">Längst fram<kbd>⇧⌘↑</kbd></button><button data-c="up">Fram ett steg<kbd>⌘↑</kbd></button><button data-c="down">Bak ett steg<kbd>⌘↓</kbd></button><button data-c="bottom">Längst bak<kbd>⇧⌘↓</kbd></button><hr>
<div class="ctx-h">Flytta till lager</div>${[...itemLayers()].reverse().map(l=>`<button data-c="layer" data-l="${l.id}"${l===layerOf(it)?' aria-current="true"':''}>${esc(l.name)}${l.vis?'':' (dolt)'}</button>`).join('')}<hr>
<button data-c="dup">Duplicera<kbd>⌘D</kbd></button><button data-c="del" class="danger">Ta bort<kbd>Del</kbd></button>`;
  ctx.hidden=false;
  const W=innerWidth,H=innerHeight,r=ctx.getBoundingClientRect();
  ctx.style.left=Math.max(8,Math.min(cx,W-r.width-8))+'px'; ctx.style.top=Math.max(8,Math.min(cy,H-r.height-8))+'px';
}
ctx.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(!b)return;const c=b.dataset.c,it=selItem();closeCtx();
  if(['top','up','down','bottom'].includes(c))reorder(c);else if(c==='layer')moveToLayer(it,b.dataset.l);else if(c==='dup')duplicate();else if(c==='del')delSel()});
addEventListener('pointerdown',e=>{if(!ctx.hidden&&!ctx.contains(e.target))closeCtx()},true);
function select(s){ sel=s; if(s) activeTab='sel'; refreshPanels(); }

/* tools */
const HINTS={
  select:'<b>Dra in</b> objekt från biblioteket. Dra i en tom yta för att panorera, scrolla för att zooma. <b>R</b> roterar, <b>Ctrl/Cmd+D</b> duplicerar.',
  wall:'<b>Klicka ut hörnen.</b> Skriv en längd, t.ex. 4,5, och tryck <b>Enter</b> för exakt mått. Klicka på första hörnet eller tryck Enter för att stänga. <b>Shift</b> ger raka vinklar, <b>Esc</b> avbryter.',
  measure:'<b>Dra en linje</b> för att mäta. Måttet sparas i ritningen och följer med i PDF:en.',
  text:'<b>Klicka</b> där texten ska stå.'
};
const TOUCH_HINTS={
  select:'<b>Tryck</b> på ett objekt i biblioteket för att lägga till det. Dra för att flytta, nyp för att zooma, <b>håll kvar</b> för meny.',
  wall:'<b>Tryck ut hörnen.</b> Tryck på första hörnet för att stänga rummet. Exakta väggmått skriver du in efteråt under Markerat.'
};
function setTool(t){
  tool=t; wd=null; lenBuf=''; mdraw=null;
  document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===t)));
  cv.setAttribute('class','t-'+t);
  $('#hint').innerHTML=(H.touch&&TOUCH_HINTS[t])||HINTS[t];
  render();
}
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));

/* ---------- library ---------- */
function buildLib(){
  const q=$('#libSearch').value.trim().toLowerCase(); let h='';
  for(const c of CAT_ORDER){
    const items=Object.values(T).filter(t=>t.cat===c&&(!q||t.name.toLowerCase().includes(q)||CATS[c].toLowerCase().includes(q)));
    if(!items.length) continue;
    h+=`<div class="c-${c}"><div class="cat-h"><i></i>${CATS[c]}</div><div class="tiles">`+
      items.map(t=>`<button class="tile" draggable="true" data-type="${t.key}" title="Klicka eller dra in: ${esc(t.name)}">${iconSVG(t.key)}<span>${esc(t.name)}</span></button>`).join('')+`</div></div>`;
  }
  $('#libList').innerHTML=h||'<p class="muted">Inget matchar sökningen.</p>';
}
$('#libSearch').addEventListener('input',buildLib);
$('#libList').addEventListener('click',e=>{const b=e.target.closest('.tile');if(!b)return;addItem(b.dataset.type,view.cx,view.cy)});
$('#libList').addEventListener('dragstart',e=>{const b=e.target.closest('.tile');if(!b)return;e.dataTransfer.setData('text/plain','floorplan:'+b.dataset.type);e.dataTransfer.effectAllowed='copy'});
const stage=$('#stage');
stage.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy'});
stage.addEventListener('drop',e=>{e.preventDefault();
  const f=e.dataTransfer.files&&e.dataTransfer.files[0];
  if(f){f.text().then(t=>loadProject(t,{name:f.name,path:null})).catch(()=>toast('Filen gick inte att läsa.'));return}
  const d=e.dataTransfer.getData('text/plain')||'';if(!d.startsWith('floorplan:'))return;const p=toW(e);addItem(d.slice(10),p.x,p.y)});
function addItem(type,x,y){
  if(!T[type]) return;
  const it=mkItem(type,S(snap(x)),S(snap(y)));
  if(doc.set.target!=='auto'&&doc.layers.some(l=>l.id===doc.set.target)) it.layer=doc.set.target;
  const L=layerOf(it);
  if(!L.vis){L.vis=true;toast(`Lagret ${L.name} var dolt och visas nu.`)}
  if(L.lock){L.lock=false;toast(`Lagret ${L.name} var låst och är nu upplåst.`)}
  doc.items.push(it); if(tool!=='select') setTool('select');
  select({t:'item',id:it.id}); record(); render();
}

/* ---------- side panel ---------- */
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;refreshPanels()}));
const fld=(label,inner,unit='')=>`<label class="fld"><span>${label}</span><span class="in">${inner}${unit?`<i>${unit}</i>`:''}</span></label>`;
const inp=(o,k,v,t='text',extra='')=>`<input data-o="${o}" data-k="${k}" data-t="${t}" value="${esc(v)}"${t==='m'||t==='cm'||t==='deg'||t==='num'?' inputmode="decimal"':''} ${extra}>`;
const selIn=(o,k,v,opts,t='sel')=>`<select data-o="${o}" data-k="${k}" data-t="${t}">${opts.map(x=>{const[val,lab]=Array.isArray(x)?x:[x,x];return`<option value="${esc(val)}"${String(val)===String(v)?' selected':''}>${esc(lab)}</option>`}).join('')}</select>`;
const chk=(o,k,v,label)=>`<label class="chk"><input type="checkbox" data-o="${o}" data-k="${k}" data-t="bool"${v?' checked':''}> ${label}</label>`;

function refreshPanels(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===activeTab)));
  const pane=$('#pane'); let h='';
  if(activeTab==='sel') h=paneSel();
  else if(activeTab==='proj') h=paneProj();
  else if(activeTab==='layers') h=paneLayers();
  else h=paneList();
  pane.innerHTML=h;
  if(activeTab==='sel') updateReadout();
}
function paneSel(){
  if(sel&&sel.t==='item'){const it=selItem();if(it)return paneItem(it)}
  if(sel&&sel.t==='room'&&doc.room.pts.length) return paneRoom();
  if(sel&&sel.t==='dim'){const d=selDim();if(d)return`<h3>Måttlinje</h3><div class="stat"><div><b>${fm(Math.hypot(d.b[0]-d.a[0],d.b[1]-d.a[1]))}</b>längd</div></div><p class="muted">Dra i ändpunkterna för att flytta dem.</p><div class="acts"><button class="btn danger" data-act="del">Ta bort</button></div>`}
  return`<div class="help"><h3>Kom igång</h3>
<p>${doc.room.pts.length?'Klicka på en vägg för att ändra rummets mått.':'Börja med att rita upp ytan: välj <b>Ny ritning</b> och ange mått, eller välj <b>Rita rum</b> och klicka ut hörnen.'}</p>
${H.touch?`<p>Tryck på kamera, ljus eller props i biblioteket så hamnar de mitt i vyn. Tryck på ett objekt för att ändra mått, vinkel och optik här.</p>
<dl><dt>Ett finger</dt><dd>Flytta objekt, eller panorera på tom yta</dd><dt>Två fingrar</dt><dd>Nyp för att zooma</dd><dt>Håll kvar</dt><dd>Meny med ordning, lager, duplicera och ta bort</dd><dt>Handtagen</dt><dd>Den runda roterar, den fyrkantiga ändrar storlek, romben ändrar avstånd eller ljuskägla</dd><dt>Anpassa</dt><dd>Visa hela ritningen</dd></dl>`:`<p>Dra in kamera, ljus och props från biblioteket. Klicka på ett objekt för att ändra mått, vinkel och optik här.</p>
<dl><dt>V W M T</dt><dd>Markera, rita rum, mått, text</dd><dt>R / Shift+R</dt><dd>Rotera 15°</dd><dt>Pilar</dt><dd>Flytta 5 cm, med Shift 50 cm</dd>
<dt>Ctrl/Cmd+D</dt><dd>Duplicera</dd><dt>Ctrl/Cmd+↑ ↓</dt><dd>Fram eller bak ett steg, med Shift längst fram eller bak</dd><dt>Högerklick</dt><dd>Ordning, lager, duplicera</dd><dt>Del</dt><dd>Ta bort</dd><dt>Mellanslag</dt><dd>Håll ned och dra för att panorera</dd><dt>F</dt><dd>Visa hela ritningen</dd><dt>Cmd+S / Cmd+O</dt><dd>Spara, öppna</dd></dl>`}
${doc.room.pts.length?`<div class="acts"><button class="btn" data-act="room">Redigera rummet</button></div>`:''}</div>`;
}
function paneItem(it){
  const t=T[it.type]; let h=`<div class="c-${t.cat}"><div class="ihead"><div class="ic">${iconSVG(it.type)}</div><div><div class="cat">${CATS[t.cat]}</div><div class="tname">${esc(it.type==='text'?'Text':it.name)}</div></div></div>`;
  if(it.type==='text'){h+=fld('Text',inp('item','p.text',it.p.text))+fld('Textstorlek',inp('item','p.size',fmt(it.p.size*100,0),'cm'),'cm')}
  else h+=fld('Namn',inp('item','name',it.name));
  h+=`<div class="g3">${fld('X',inp('item','x',fmt(it.x),'m'),'m')}${fld('Y',inp('item','y',fmt(it.y),'m'),'m')}${fld('Vinkel',inp('item','rot',Math.round(it.rot),'deg'),'°')}</div>`;
  if(it.type!=='text') h+=`<div class="g2">${fld('Bredd',inp('item','w',Math.round(it.w*100),'cm'),'cm')}${fld('Djup',inp('item','d',Math.round(it.d*100),'cm'),'cm')}</div>`;
  h+=fld('Lager',selIn('item','layer',layerOf(it).id,[...itemLayers()].reverse().map(l=>[l.id,l.name+(l.vis?'':' (dolt)')])));
  h+=`<div class="order" role="group" aria-label="Ordning"><span>Ordning</span><button data-act="ord" data-m="bottom" title="Längst bak (Shift+Ctrl/Cmd+↓)">Längst bak</button><button data-act="ord" data-m="down" title="Bak ett steg (Ctrl/Cmd+↓)">Bakåt</button><button data-act="ord" data-m="up" title="Fram ett steg (Ctrl/Cmd+↑)">Framåt</button><button data-act="ord" data-m="top" title="Längst fram (Shift+Ctrl/Cmd+↑)">Längst fram</button></div>`;
  if(it.type!=='text') h+=chk('item','show',it.show,'Visa namn i ritningen');
  if(t.cat!=='person'&&it.type!=='text') h+=chk('item','inList',it.inList,'Med i utrustningslistan');
  if(t.kind==='camera'){
    h+=`<h4>Kamera och optik</h4>`;
    h+=`<label class="fld"><span>Brännvidd</span></label><input type="range" min="12" max="200" step="1" data-o="item" data-k="p.focal" data-t="num" value="${it.p.focal}" aria-label="Brännvidd">`;
    h+=`<div class="chips">${FOCALS.map(f=>`<button data-focal="${f}" aria-pressed="${Math.round(it.p.focal)===f}">${f}</button>`).join('')}</div>`;
    h+=`<div class="g2">${fld('Brännvidd',inp('item','p.focal',Math.round(it.p.focal),'num'),'mm')}${fld('Avstånd till motiv',inp('item','p.dist',fmt(it.p.dist),'m'),'m')}</div>`;
    h+=fld('Sensor',selIn('item','p.sensor',it.p.sensor,Object.entries(SENSORS).map(([k,v])=>[k,v.n])));
    h+=`<div class="g2">${fld('Bildformat',selIn('item','p.aspect',it.p.aspect,Object.keys(ASP)))}${fld('Orientering',selIn('item','p.orient',it.p.orient,[['land','Liggande'],['port','Stående']]))}</div>`;
    h+=chk('item','p.cone',it.p.cone,'Visa synfält i ritningen');
    h+=`<div class="readout" id="camRead"></div>`;
    h+=`<h4>Utrustning</h4>${fld('Objektiv',inp('item','p.lens',it.p.lens,'text','list="lensList" placeholder="T.ex. 24-70 mm"'))}${fld('Stöd',selIn('item','p.support',it.p.support,SUPPORTS))}`;
  }
  if(t.kind==='light'){
    h+=`<h4>Ljus</h4>`;
    h+=`<label class="fld"><span>Spridning</span></label><input type="range" min="5" max="180" step="1" data-o="item" data-k="p.spread" data-t="num" value="${it.p.spread}" aria-label="Spridning">`;
    h+=`<div class="g2">${fld('Spridning',inp('item','p.spread',Math.round(it.p.spread),'num'),'°')}${fld('Kägla i ritningen',inp('item','p.beam',fmt(it.p.beam),'m'),'m')}</div>`;
    h+=chk('item','p.cone',it.p.cone,'Visa ljuskägla');
    h+=fld('Inställning',inp('item','p.setting',it.p.setting,'text','placeholder="T.ex. f/8, halv effekt"'));
    h+=`<h4>Utrustning</h4>`;
    if(it.type!=='head'&&it.type!=='led'&&it.type!=='fresnel'&&it.type!=='tube') h+=fld('Lamphuvud',inp('item','p.head',it.p.head,'text','list="headList" placeholder="T.ex. Profoto D2"'));
    h+=fld('Stativ',selIn('item','p.stand',it.p.stand,STANDS));
  }
  h+=`<h4>Notering</h4><label class="fld"><span class="in"><textarea data-o="item" data-k="note" data-t="text" placeholder="Följer med i PDF:en" aria-label="Notering">${esc(it.note)}</textarea></span></label>`;
  h+=`<div class="acts"><button class="btn" data-act="dup">Duplicera</button><button class="btn" data-act="rot90">Rotera 90°</button><button class="btn danger" data-act="del">Ta bort</button></div></div>`;
  return h;
}
function updateReadout(){
  const el=$('#camRead'),it=selItem(); if(!el||!it||T[it.type].kind!=='camera') return;
  const f=frameOf(it.p);
  el.innerHTML=`Bildvinkel <b>${fmt(f.h/deg,1)}°</b> × ${fmt(f.v/deg,1)}°<br>Utsnitt på ${fmt(it.p.dist)} m: <b>${fmt(f.W)} × ${fmt(f.H)} m</b><br>Sensorutsnitt ${fmt(f.fw,1)} × ${fmt(f.fh,1)} mm`;
  document.querySelectorAll('[data-focal]').forEach(b=>b.setAttribute('aria-pressed',String(Math.round(it.p.focal)===+b.dataset.focal)));
}
function paneRoom(){
  const R=doc.room,P=R.pts,n=P.length,m=R.closed?n:n-1; let per=0,rows='';
  for(let i=0;i<m;i++){const a=P[i],b=P[(i+1)%n],l=Math.hypot(b[0]-a[0],b[1]-a[1]);per+=l;
    rows+=`<div class="edge"><span>Vägg ${i+1}</span><span class="in"><input inputmode="decimal" data-o="edge" data-i="${i}" data-t="cm" value="${Math.round(l*100)}" aria-label="Vägg ${i+1}"><i>cm</i></span></div>`}
  return`<h3>Rum</h3><div class="stat"><div><b>${R.closed?fmt(area(P),1):'–'} m²</b>golvyta</div><div><b>${fmt(per,1)} m</b>omkrets</div><div><b>${n}</b>hörn</div></div>
${fld('Väggtjocklek',inp('room','wall',Math.round(R.wall*100),'cm'),'cm')}
<h4>Väggmått</h4>${rows}
<p class="muted">Ändrar du ett mått sträcks rummet åt det hållet. Dra i hörnen för att flytta dem, klicka på en mittpunkt för att lägga till ett hörn och Alt-klicka på ett hörn för att ta bort det.</p>
<div class="acts"><button class="btn" data-act="redraw">Rita om rummet</button><button class="btn danger" data-act="del">Ta bort rummet</button></div>`;
}
const EYE=on=>on?'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1.5 10S5 4 10 4s8.5 6 8.5 6-3.5 6-8.5 6S1.5 10 1.5 10Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.6" fill="currentColor"/></svg>':'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1.5 10S5 4 10 4s8.5 6 8.5 6-3.5 6-8.5 6S1.5 10 1.5 10Z" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".45"/><path d="M3 17 17 3" stroke="currentColor" stroke-width="1.6"/></svg>';
const LOCK=on=>on?'<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="1.5" fill="currentColor"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>':'<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".55"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 6.8-1.2" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".55"/></svg>';
function layerAct(a,id){
  const i=doc.layers.findIndex(l=>l.id===id),L=doc.layers[i]; if(!L) return;
  if(a==='lvis'){L.vis=!L.vis;if(!L.vis){const it=selItem();if(it&&layerOf(it)===L)sel=null}}
  else if(a==='lsolo'){const only=doc.layers.every(l=>l===L?l.vis:!l.vis);doc.layers.forEach(l=>{l.vis=only?true:l===L})}
  else if(a==='llock'){L.lock=!L.lock;if(L.lock){const it=selItem();if(it&&layerOf(it)===L)sel=null}}
  else if(a==='lup'){if(i>=doc.layers.length-1)return;doc.layers.splice(i,1);doc.layers.splice(i+1,0,L)}
  else if(a==='ldown'){if(i<=0)return;doc.layers.splice(i,1);doc.layers.splice(i-1,0,L)}
  else if(a==='ldel'){if(L.cat)return;doc.items.forEach(it=>{if(it.layer===L.id)it.layer=T[it.type].cat});doc.layers.splice(i,1);if(doc.set.target===L.id)doc.set.target='auto'}
  record();render();refreshPanels();
}
function paneLayers(){
  const St=doc.set,cnt=id=>doc.items.filter(it=>layerOf(it).id===id).length,n=doc.layers.length;
  const rows=[...doc.layers].map((l,i)=>({l,i})).reverse().map(({l,i})=>`<div class="lyr${l.vis?'':' off'}${l.cat?' c-'+l.cat:''}${isCones(l)?' cones':''}">
<button class="lb" data-act="lvis" data-id="${l.id}" aria-pressed="${l.vis}" title="${l.vis?'Dölj':'Visa'} lagret">${EYE(l.vis)}</button>
<i class="dot"></i><span class="in"><input data-o="layer" data-id="${l.id}" data-k="name" data-t="text" value="${esc(l.name)}" aria-label="Lagrets namn"></span>
<span class="cnt" title="Antal objekt">${isCones(l)?'':cnt(l.id)}</span>
<button class="lb" data-act="lsolo" data-id="${l.id}" title="Visa bara det här lagret">S</button>
${isCones(l)?'<span></span>':`<button class="lb" data-act="llock" data-id="${l.id}" aria-pressed="${l.lock}" title="${l.lock?'Lås upp':'Lås'} lagret">${LOCK(l.lock)}</button>`}
<button class="lb" data-act="lup" data-id="${l.id}" title="Flytta upp"${i>=n-1?' disabled':''}>↑</button>
<button class="lb" data-act="ldown" data-id="${l.id}" title="Flytta ned"${i<=0?' disabled':''}>↓</button>
${l.cat||isCones(l)?'<span></span>':`<button class="lb" data-act="ldel" data-id="${l.id}" title="Ta bort lagret. Objekten flyttas tillbaka till sina vanliga lager.">×</button>`}</div>`).join('');
  return`<h3>Lager</h3><p class="muted">Lagret överst i listan ritas överst. Synfält och ljuskäglor är ett eget lager som du kan flytta, så att ljuset syns ovanpå fonder och golvytor men under lampor och personer. Ögat döljer lagret, S visar bara det lagret och låset gör att det inte går att klicka på av misstag. Dolda lager kommer inte med i PDF:en.</p>
<div class="lyrs">${rows}</div>
<div class="acts"><button class="btn sm" data-act="ladd">Nytt lager</button><button class="btn sm" data-act="lall">Visa alla</button></div>
${fld('Nya objekt hamnar i',selIn('set','target',St.target,[['auto','Sitt kategorilager'],...[...itemLayers()].reverse().map(l=>[l.id,l.name])]))}
<p class="muted">Egna lager passar bra för olika setups, t.ex. Setup 1 och Setup 2, som du tänder och släcker. Högerklicka på ett objekt för att flytta det till ett annat lager.</p>
<h4>Visning</h4>
${chk('set','labels',St.labels,'Namn')}${chk('set','dims',St.dims,'Väggmått')}${chk('set','mdims',St.mdims,'Måttlinjer')}${chk('set','gridOn',St.gridOn,'Rutnät')}
<div class="g2">${fld('Rutnät',selIn('set','grid',St.grid,[[0.1,'10 cm'],[0.25,'25 cm'],[0.5,'50 cm'],[1,'1 m']],'num'))}<div style="padding-top:18px">${chk('set','snap',St.snap,'Fäst mot 5 cm')}</div></div>`;
}
function paneProj(){
  const M=doc.meta,St=doc.set;
  return`<h3>Projekt</h3>
${fld('Projektnamn',inp('meta','title',M.title))}${fld('Kund',inp('meta','client',M.client))}
<div class="g2">${fld('Plats',inp('meta','location',M.location))}${fld('Datum',`<input type="date" data-o="meta" data-k="date" data-t="text" value="${esc(M.date)}">`)}</div>
${fld('Ritad av',inp('meta','author',M.author))}
<label class="fld"><span>Anteckningar</span><span class="in"><textarea data-o="meta" data-k="notes" data-t="text" placeholder="Kommer med i PDF:en">${esc(M.notes)}</textarea></span></label>
<h4>PDF</h4>
<div class="g2">${fld('Papper',selIn('set','paper',St.paper,[['A4','A4 liggande'],['A3','A3 liggande']]))}${fld('Skala',selIn('set','scale',St.scale,[['auto','Automatisk'],'20','25','50','75','100','200'].map(x=>Array.isArray(x)?x:[x,'1:'+x])))}</div>
<p class="muted">Ritningen placeras i exakt skala med skalstock, så den går att mäta på utskriften. Sida två har utrustningslista, kamerainställningar och ljus.</p>
<div class="acts"><button class="btn primary" data-act="pdf">Exportera PDF</button><button class="btn" data-act="png">Exportera bild (PNG)</button></div>
<h4>Fil</h4>
<p class="muted">${fileHelp()}</p>
<div class="acts"><button class="btn" data-act="save">${H.kind==='app'?'Spara':'Spara projektfil'}</button>${H.kind==='app'?'<button class="btn" data-act="saveas">Spara som …</button>':''}<button class="btn" data-act="open">Öppna</button><button class="btn" data-act="new">Ny ritning</button></div>`;
}
function equipment(){
  const m=new Map();
  const add=(cat,name,q=1)=>{name=String(name||'').trim();if(!name||!(q>0))return;const k=cat+'|'+name.toLowerCase();const e=m.get(k)||{cat,name,q:0};e.q+=q;m.set(k,e)};
  for(const it of doc.items){
    const t=T[it.type]; if(t.cat==='person'||it.type==='text'||!it.inList) continue;
    add(t.cat,it.name);
    if(t.kind==='camera'){ if(it.p.lens) add('cam','Objektiv '+it.p.lens); const s=it.p.support; if(s&&!['Inget','Handhållen'].includes(s)) add('grip',s==='Stativ'?'Kamerastativ':s); }
    if(t.kind==='light'){ if(it.p.head&&it.type!=='head') add('light',it.p.head); if(it.p.stand&&it.p.stand!=='Inget') add('grip',it.p.stand); }
  }
  doc.extras.forEach(x=>add('extra',x.t,+x.q||1));
  const order=[...CAT_ORDER,'extra'];
  return[...m.values()].sort((a,b)=>order.indexOf(a.cat)-order.indexOf(b.cat)||a.name.localeCompare(b.name,'sv'));
}
function people(){const m=new Map();doc.items.filter(it=>T[it.type].cat==='person').forEach(it=>m.set(it.name,(m.get(it.name)||0)+1));return[...m.entries()]}
function paneList(){
  const eq=equipment().filter(e=>e.cat!=='extra'); let h='<div class="eq"><h3>Utrustningslista</h3><p class="muted">Räknas fram från ritningen. Ljusformare räknar med sitt lamphuvud och stativ, kameror med objektiv och stöd.</p>';
  let last='';
  if(!eq.length) h+='<p class="muted">Inget i listan än. Dra in kamera, ljus eller props.</p>';
  eq.forEach((e,i)=>{if(e.cat!==last){if(last)h+='</ul>';const tot=eq.filter(x=>x.cat===e.cat).reduce((s,x)=>s+x.q,0);h+=`<div class="c-${e.cat}"><h5><span>${CATS[e.cat]}</span><span>${tot}</span></h5></div><ul>`;last=e.cat}
    h+=`<li><b>${e.q}</b><span>${esc(e.name)}</span></li>`});
  if(last) h+='</ul>';
  const pp=people();
  if(pp.length) h+=`<div class="c-person"><h5><span>Personer på plan</span><span>${pp.reduce((s,x)=>s+x[1],0)}</span></h5></div><ul>${pp.map(([n,q])=>`<li><b>${q}</b><span>${esc(n)}</span></li>`).join('')}</ul>`;
  h+=`<h4>Övrigt att ta med</h4><p class="muted">Sådant som inte syns i ritningen, som kablar, batterier och tejp.</p>`;
  doc.extras.forEach((x,i)=>{h+=`<div class="xrow"><span class="in"><input inputmode="decimal" data-o="extra" data-i="${i}" data-k="q" data-t="num" value="${x.q}" aria-label="Antal"></span><span class="in"><input data-o="extra" data-i="${i}" data-k="t" data-t="text" value="${esc(x.t)}" aria-label="Artikel"></span><button data-act="xdel" data-i="${i}" aria-label="Ta bort rad">×</button></div>`});
  h+=`<div class="acts"><button class="btn sm" data-act="xadd">Lägg till rad</button></div></div>`;
  return h;
}

function targetOf(el){
  const o=el.dataset.o;
  if(o==='item') return selItem();
  if(o==='meta') return doc.meta;
  if(o==='set') return doc.set;
  if(o==='room') return doc.room;
  if(o==='extra') return doc.extras[+el.dataset.i];
  if(o==='layer') return doc.layers.find(l=>l.id===el.dataset.id);
  return null;
}
function readVal(el){
  const t=el.dataset.t;
  if(t==='bool') return el.checked;
  if(t==='text'||t==='sel') return el.value;
  const n=pnum(el.value); if(isNaN(n)) return undefined;
  if(t==='cm') return n/100;
  return n;
}
function applyField(el,commit){
  if(el.dataset.o==='edge'){ if(!commit) return; const v=readVal(el); if(v>0.01) setEdgeLength(+el.dataset.i,v); return true; }
  const obj=targetOf(el); if(!obj) return;
  let v=readVal(el); if(v===undefined) return;
  const k=el.dataset.k;
  if(k==='w'||k==='d') v=Math.max(0.02,v);
  if(k==='rot') v=((v%360)+360)%360;
  if(k==='p.dist'||k==='p.beam') v=Math.max(0.1,v);
  if(k==='p.focal') v=clamp(v,4,1200);
  if(k==='p.size') v=Math.max(0.03,v/100);
  if(el.dataset.o==='room'&&k==='wall') v=clamp(v,0.01,1);
  if(k.startsWith('p.')) obj.p[k.slice(2)]=v; else obj[k]=v;
  if(el.dataset.o==='item'&&k==='layer'){const L=layerOf(obj);if(!L.vis){L.vis=true;toast(`Lagret ${L.name} var dolt och visas nu.`)}}
  if(el.dataset.o==='item'&&obj.type==='text'&&(k==='p.text'||k==='p.size')) textSize(obj);
  if(el.dataset.o==='meta'&&k==='title') syncTitle();
  return true;
}
function setEdgeLength(i,L){
  const P=doc.room.pts,n=P.length,a=P[i],b=P[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy); if(len<1e-6) return;
  const ux=dx/len,uy=dy/len,delta=L-len,pb=dx*ux+dy*uy;
  for(let j=0;j<n;j++){if(j===i)continue;const p=P[j],pr=(p[0]-a[0])*ux+(p[1]-a[1])*uy;if(pr>=pb-1e-6)P[j]=[S(p[0]+ux*delta),S(p[1]+uy*delta)]}
}
const pane=$('#pane');
pane.addEventListener('input',e=>{
  const el=e.target; if(!el.dataset.o||el.dataset.o==='edge') return;
  if(applyField(el,false)){
    const k=el.dataset.k; pane.querySelectorAll(`[data-k="${k}"][data-o="${el.dataset.o}"]`).forEach(x=>{if(x!==el&&x.type!=='checkbox'){x.value=x.type==='range'?readVal(el):(el.type==='range'?Math.round(+el.value):x.value)}});
    render();
  }
});
pane.addEventListener('change',e=>{
  const el=e.target; if(!el.dataset.o) return;
  applyField(el,true); record(); render();
  const rebuild=el.dataset.o==='edge'||el.dataset.o==='room'||activeTab==='list'||el.dataset.t==='bool'||el.tagName==='SELECT'||['name','p.text'].includes(el.dataset.k);
  if(rebuild){const f=document.activeElement===el;refreshPanels();if(f&&el.dataset.o==='extra'){}}
});
pane.addEventListener('click',e=>{
  const fb=e.target.closest('[data-focal]');
  if(fb){const it=selItem();if(it){it.p.focal=+fb.dataset.focal;record();render();refreshPanels()}return}
  const b=e.target.closest('[data-act]'); if(!b) return;
  const a=b.dataset.act,it=selItem();
  if(a==='del') delSel();
  else if(a==='dup') duplicate();
  else if(a==='rot90'&&it){it.rot=(it.rot+90)%360;record();render();refreshPanels()}
  else if(a==='ord') reorder(b.dataset.m);
  else if(a==='lvis'||a==='llock'||a==='lup'||a==='ldown'||a==='ldel'||a==='lsolo'){layerAct(a,b.dataset.id);}
  else if(a==='ladd'){const l={id:'L'+uid(),name:'Lager '+(doc.layers.filter(x=>!x.cat).length+1),cat:null,vis:true,lock:false};doc.layers.push(l);record();refreshPanels();setTimeout(()=>{const el=pane.querySelector(`[data-o="layer"][data-id="${l.id}"]`);if(el){el.focus();el.select()}},20)}
  else if(a==='lall'){doc.layers.forEach(l=>{l.vis=true});record();render();refreshPanels()}
  else if(a==='room'){select({t:'room'});render()}
  else if(a==='redraw'){sel=null;setTool('wall');refreshPanels()}
  else if(a==='xadd'){doc.extras.push({q:1,t:''});record();refreshPanels();const ins=pane.querySelectorAll('[data-o="extra"][data-k="t"]');ins[ins.length-1]?.focus()}
  else if(a==='xdel'){doc.extras.splice(+b.dataset.i,1);record();refreshPanels()}
  else if(a==='pdf') exportPDF();
  else if(a==='png') exportPNG();
  else if(a==='save') save();
  else if(a==='saveas') saveAs();
  else if(a==='open') openProject();
  else if(a==='new') openModal();
});

/* datalists */
document.body.insertAdjacentHTML('beforeend',`<datalist id="lensList">${['14 mm','16-35 mm','24 mm','24-70 mm','35 mm','50 mm','70-200 mm','85 mm','90 mm makro','100 mm makro','135 mm'].map(x=>`<option value="${x}">`).join('')}</datalist>
<datalist id="headList">${['Blixthuvud','Profoto D2','Profoto D3','Profoto B10','Profoto B10X','Profoto B1X','Profoto Pro-11','Aputure 600d','Aputure 300d','Nanlite Forza 500','ARRI SkyPanel S60'].map(x=>`<option value="${x}">`).join('')}</datalist>`);

/* title */
const titleIn=$('#titleIn');
function syncTitle(){if(document.activeElement!==titleIn)titleIn.value=doc.meta.title||''}
titleIn.addEventListener('input',()=>{doc.meta.title=titleIn.value});
titleIn.addEventListener('change',()=>{record();if(activeTab==='proj')refreshPanels()});

/* ---------- new drawing modal ---------- */
function openModal(){ $('#nTitle').value=''; $('#modal').hidden=false; setTimeout(()=>$('#nTitle').focus(),20) }
function closeModal(){ $('#modal').hidden=true }
$('#newB').addEventListener('click',openModal);
$('#bannerNew').addEventListener('click',openModal);
$('#nCancel').addEventListener('click',closeModal);
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function startNew(rect){
  const title=$('#nTitle').value.trim();
  if(rect){const w=pnum($('#nW').value),d=pnum($('#nD').value);
    if(!(w>0.3&&d>0.3&&w<500&&d<500)){toast('Ange bredd och djup i meter, t.ex. 8,5.');return}
    doc=rectDoc(title,S(w),S(d));}
  else doc=blankDoc(title);
  closeModal(); sel=null; activeTab='sel'; setFile(null); record(); syncTitle(); showBanner();
  if(rect){setTool('select');fit();sel={t:'room'}}
  else{view.cx=4;view.cy=3;view.s=60;setTool('wall')}
  refreshPanels(); render();
}
$('#nRect').addEventListener('click',()=>startNew(true));
$('#nEmpty').addEventListener('click',()=>startNew(false));
['nW','nD','nTitle'].forEach(id=>$('#'+id).addEventListener('keydown',e=>{if(e.key==='Enter')startNew(true)}));

function showBanner(){ $('#banner').hidden=!doc.meta.example }
$('#bannerX').addEventListener('click',()=>{$('#banner').hidden=true});

/* ---------- toolbar ---------- */
$('#undoB').addEventListener('click',undo);
$('#redoB').addEventListener('click',redo);
$('#zoomIn').addEventListener('click',()=>zoomBy(1.25));
$('#zoomOut').addEventListener('click',()=>zoomBy(0.8));
$('#fitB').addEventListener('click',fit);
$('#pdfB').addEventListener('click',exportPDF);

let toastT=0;
function toast(msg,sticky){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);if(!sticky)toastT=setTimeout(()=>{t.hidden=true},3600)}

/* ---------- files ---------- */
const slug=s=>(String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'floorplan');
// The drawing is always kept on this device (localStorage). In the Mac app it can also be tied to a
// .floorplan file, which is then written automatically after every change – no manual saving needed.
let file=null; // {path,name}; path is null on the web (iPhone/iPad/browser)
try{file=JSON.parse(localStorage.getItem(FILEKEY)||'null')}catch(e){file=null}
let saveTimer=0,savedText=null,saving=null,saveErr=null;
const projectText=()=>JSON.stringify(doc,null,1);
const autoFile=()=>H.kind==='app'&&file&&file.path;
const stem=n=>String(n||'').replace(/\.(floorplan|setplan)(\.json)?$|\.json$/i,'');
function setFile(f,text){
  file=f; savedText=text??null; saveErr=null;
  try{f?localStorage.setItem(FILEKEY,JSON.stringify(f)):localStorage.removeItem(FILEKEY)}catch(e){}
  updateSaveState();
}
function docChanged(){
  if(autoFile()){clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,700)}
  updateSaveState();
}
async function flushSave(){
  clearTimeout(saveTimer);
  if(!autoFile()) return true;
  if(saving){await saving;return flushSave()}
  const text=projectText(); if(text===savedText) return true;
  const path=file.path;
  updateSaveState('saving');
  saving=H.writeProject(path,text).then(()=>{if(file&&file.path===path){savedText=text;saveErr=null}},
    e=>{saveErr=String(e&&e.message||e);console.error('save failed',saveErr)}).finally(()=>{saving=null;updateSaveState()});
  await saving;
  return !saveErr;
}
function updateSaveState(st){
  const el=$('#saveState'); if(!el) return;
  let t='',k='';
  if(H.kind==='app'){
    if(!file||!file.path){t='Inte sparad som fil';k='none'}
    else if(st==='saving'||saving){t='Sparar …';k='saving'}
    else if(saveErr){t='Kunde inte spara';k='err'}
    else{const ok=projectText()===savedText;t=ok?'Sparad':'Sparar …';k=ok?'ok':'pending'}
  }
  el.textContent=t; el.dataset.st=k; el.title=file&&file.path?file.path:'';
  el.hidden=!t;
  const name=file&&file.name?stem(file.name):(doc.meta.title||'Namnlös ritning');
  H.setTitle(name+' – Floorplan');
}
function fileHelp(){
  if(H.kind==='app') return file&&file.path
    ?`Ritningen sparas automatiskt i <b>${esc(file.name)}</b> efter varje ändring.`
    :'Spara ritningen som en fil, så sparas den sedan automatiskt efter varje ändring. Dubbelklicka på filen i Finder för att öppna den igen. Filen kan också öppnas i Floorplan på iPhone och iPad.';
  return 'Ritningen sparas automatiskt på den här enheten. Spara en projektfil för att ha flera projekt eller flytta ritningen till en annan enhet eller till Mac-appen.'+(H.touch?' Välj <b>Spara i Filer</b> i menyn som kommer upp.':'');
}
async function save(){
  if(autoFile()){const ok=await flushSave();toast(ok?'Sparad i '+file.name:'Kunde inte spara: '+saveErr);return}
  return saveAs();
}
async function saveAs(){
  if(doc.meta.example){doc.meta.example=false;record();showBanner()}
  const name=(file&&file.name?stem(file.name):slug(doc.meta.title))+'.floorplan',text=projectText();
  try{
    const r=await H.saveProjectAs(name,text);
    if(!r){$('#toast').hidden=true;return}
    if(H.kind==='app'){setFile({path:r.path,name:r.name},text);toast('Sparad i '+r.name+'. Ändringar sparas nu automatiskt.');if(activeTab==='proj')refreshPanels();return}
    if(r.status==='needs-tap'){readySheet(r.file,'Projektfilen är klar');return}
    setFile({path:null,name:r.name});
    toast(r.status==='downloaded'?'Hämtad: '+r.name:'Projektfilen är sparad.');
  }catch(e){console.error(e);toast('Filen kunde inte sparas.')}
}
async function openProject(){
  try{
    if(autoFile()) await flushSave();
    const r=await H.pickProject(); if(!r) return;
    loadProject(r.text,{path:r.path,name:r.name});
  }catch(e){console.error(e);toast('Filen gick inte att öppna.')}
}
async function openPath(path){
  if(autoFile()&&file.path===path) return;
  await flushSave();
  const text=await H.readProject(path);
  if(text==null){toast('Filen gick inte att läsa: '+H.baseName(path));return}
  loadProject(text,{path,name:H.baseName(path)});
}
function loadProject(text,f){
  let d; try{d=normalize(JSON.parse(text))}catch(e){toast('Filen gick inte att läsa. Välj en ritning som sparats från Floorplan.');return false}
  doc=d; sel=null; wd=null;
  undoS=[]; redoS=[]; cur=JSON.stringify(doc);
  try{localStorage.setItem(KEY,cur)}catch(e){}
  setFile(f.path?{path:f.path,name:f.name}:{path:null,name:f.name},f.path?text:null);
  updateUndo(); syncTitle(); showBanner(); setTool('select'); activeTab='sel'; refreshPanels(); fit();
  toast('Öppnade '+f.name);
  return true;
}
/* exports (PDF, PNG): Mac app → save dialog, iPhone/iPad → share sheet, computer browser → download */
async function deliver(filename,blob){
  try{
    const r=await H.exportFile(filename,blob);
    if(r.status==='saved') toast('Sparad: '+r.name);
    else if(r.status==='downloaded') toast('Hämtad: '+r.name);
    else if(r.status==='needs-tap') readySheet(r.file,filename.endsWith('.pdf')?'PDF:en är klar':'Bilden är klar');
    else $('#toast').hidden=true;
    return r.status!=='cancelled';
  }catch(e){console.error(e);toast('Filen kunde inte sparas.');return false}
}
// iOS only lets the share sheet open straight after a tap; if building the file took too long, ask for one more tap.
function readySheet(f,title){
  $('#toast').hidden=true;
  let m=$('#ready');
  if(!m){m=document.createElement('div');m.id='ready';m.className='modal';
    m.innerHTML='<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="readyT"><h2 id="readyT"></h2><p>Tryck på Dela för att spara i Filer, skicka med AirDrop eller mejl, eller skriva ut.</p><div class="acts"><button class="btn" data-r="x">Stäng</button><button class="btn primary" data-r="share">Dela</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(e.target===m||b&&b.dataset.r==='x'){m.hidden=true;return}
      if(b&&b.dataset.r==='share'){m.hidden=true;H.shareAgain(m._file).catch(err=>{console.error(err);toast('Filen kunde inte delas.')})}});}
  m._file=f; $('#readyT').textContent=title; m.hidden=false;
}
$('#openB').addEventListener('click',openProject);
$('#saveB').addEventListener('click',save);
$('#saveState').addEventListener('click',()=>{if(H.kind==='app'&&!autoFile())saveAs();else if(saveErr)save()});

async function planCanvas(b,px,k){
  const W=Math.max(1,Math.round(b.w*px)),H=Math.max(1,Math.round(b.h*px));
  const o={x0:b.x,y0:b.y,w:b.w,h:b.h,px,k,screen:false};
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${S(b.x)} ${S(b.y)} ${S(b.w)} ${S(b.h)}"><style>${PRINT_VARS}${SVG_RULES}</style><rect x="${S(b.x)}" y="${S(b.y)}" width="${S(b.w)}" height="${S(b.h)}" fill="#ffffff"/>${scene(o)}</svg>`;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const img=new Image(); img.src=url; await img.decode();
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,W,H); g.drawImage(img,0,0,W,H);
    return c;
  }finally{URL.revokeObjectURL(url)}
}
async function exportPNG(){
  try{
    const b=contentBounds(),px=clamp(3200/Math.max(b.w,b.h),60,400);
    const c=await planCanvas(b,px,px/90);
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));
    await deliver(slug(doc.meta.title)+'.png',blob);
  }catch(e){console.error(e);toast('Bilden kunde inte skapas.')}
}
const pdfT=s=>String(s??'').replace(/[–—]/g,'-').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/…/g,'...').replace(/[^\x00-\xFF]/g,'?');
async function exportPDF(){
  if(!window.jspdf){toast('PDF-modulen kunde inte laddas. Ladda om appen.');return}
  toast('Skapar PDF …',true);
  try{
    const{jsPDF}=window.jspdf,A3=doc.set.paper==='A3',PW=A3?420:297,PH=A3?297:210;
    const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:A3?'a3':'a4'});
    const M=12,top=30,bot=PH-22,aw=PW-2*M,ah=bot-top;
    const b=contentBounds(),need=Math.max(b.w*1000/aw,b.h*1000/ah);
    const SC=[10,20,25,50,75,100,125,150,200,250,500,1000,2000];
    let den=doc.set.scale==='auto'?(SC.find(s=>s>=need)||Math.ceil(need)):+doc.set.scale,warn='';
    if(den<need){den=SC.find(s=>s>=need)||Math.ceil(need);warn=`Ritningen fick inte plats i vald skala, så PDF:en använder 1:${den}.`}
    const wmm=b.w*1000/den,hmm=b.h*1000/den,ix=M+(aw-wmm)/2,iy=top+(ah-hmm)/2;
    const c=await planCanvas(b,8*1000/den,1.55);
    pdf.addImage(c.toDataURL('image/png'),'PNG',ix,iy,wmm,hmm,undefined,'FAST');
    const title=pdfT(doc.meta.title||'Namnlös ritning'),meta=[doc.meta.client,doc.meta.location,doc.meta.date].filter(Boolean).map(pdfT);
    const header=(t)=>{pdf.setTextColor(17);pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.text(t,M,17);
      pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(80);if(meta.length)pdf.text(meta.join('   ·   '),M,23);
      pdf.setDrawColor(30);pdf.setLineWidth(0.35);pdf.line(M,26,PW-M,26)};
    header(title);
    pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setTextColor(17);pdf.text('PLANRITNING',PW-M,17,{align:'right'});
    pdf.setFont('helvetica','normal');pdf.text(`Skala 1:${den}  (${A3?'A3':'A4'})`,PW-M,23,{align:'right'});
    // scale bar
    const mmPerM=1000/den;let segM=[0.25,0.5,1,2,5,10,20,50].find(v=>v*mmPerM>=8)||50;
    const by=PH-13,segW=segM*mmPerM;pdf.setLineWidth(0.25);pdf.setDrawColor(17);
    for(let i=0;i<4;i++){pdf.setFillColor(i%2?255:17);pdf.rect(M+i*segW,by,segW,2,'FD')}
    pdf.setFontSize(7);pdf.setTextColor(60);
    for(let i=0;i<=4;i++)pdf.text(fmt(segM*i,segM<1?2:0).replace(/,00$/,'')+(i===4?' m':''),M+i*segW,by+5.5,{align:i===0?'left':'center'});
    pdf.text(`Skala 1:${den}. Mät från skalstocken om utskriften inte är i 100 %.`,M+4*segW+10,by+2);
    // page 2
    pdf.addPage(); header(title+' - utrustning');
    let y=36; const colW=Math.min(PW-2*M,190);
    const ensure=h=>{if(y+h>PH-16){pdf.addPage();header(title+' - utrustning');y=36}};
    const sec=t=>{ensure(14);pdf.setFont('helvetica','bold');pdf.setFontSize(10.5);pdf.setTextColor(17);pdf.text(t,M,y);y+=2;pdf.setDrawColor(150);pdf.setLineWidth(0.2);pdf.line(M,y,M+colW,y);y+=5};
    const row=(q,t,sub)=>{const lines=pdf.splitTextToSize(pdfT(t),colW-16);ensure(lines.length*4.4+1);pdf.setFont('helvetica','bold');pdf.setFontSize(9.5);pdf.setTextColor(17);
      if(q!=null)pdf.text(String(q),M+8,y,{align:'right'});pdf.setFont('helvetica',sub?'normal':'normal');pdf.setTextColor(sub?80:17);pdf.text(lines,M+12,y);y+=lines.length*4.4+0.8};
    const eq=equipment();
    sec('Utrustningslista');
    if(!eq.length) row(null,'Ingen utrustning i ritningen.',true);
    let last='';
    eq.forEach(e=>{if(e.cat!==last){ensure(10);y+=1.5;pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setTextColor(90);pdf.text(pdfT(CATS[e.cat]).toUpperCase(),M+12,y);y+=4.5;last=e.cat}row(e.q,e.name)});
    const cams=doc.items.filter(it=>T[it.type].kind==='camera');
    if(cams.length){y+=4;sec('Kameror');cams.forEach(it=>{const f=frameOf(it.p),sn=SENSORS[it.p.sensor]||SENSORS.ff;
      row(null,`${it.name}${it.p.lens?', '+it.p.lens:''} på ${Math.round(it.p.focal)} mm, ${sn.s} ${it.p.aspect} ${it.p.orient==='port'?'stående':'liggande'}. Avstånd till motiv ${fmt(it.p.dist)} m, bildvinkel ${fmt(f.h/deg,1)}° x ${fmt(f.v/deg,1)}°, utsnitt ${fmt(f.W)} x ${fmt(f.H)} m.${it.p.support&&it.p.support!=='Inget'?' Stöd: '+it.p.support+'.':''}`)})}
    const lights=doc.items.filter(it=>T[it.type].kind==='light');
    if(lights.length){y+=4;sec('Ljus');lights.forEach(it=>{
      row(null,[it.name+(it.p.head&&it.type!=='head'?' med '+it.p.head:''),it.p.setting,it.p.stand&&it.p.stand!=='Inget'?'på '+it.p.stand.toLowerCase():'',`spridning ${Math.round(it.p.spread)}°`].filter(Boolean).join(', ')+'.')})}
    const pp=people();
    if(pp.length){y+=4;sec('Personer på plan');pp.forEach(([n,q])=>row(q,n))}
    const notes=[doc.meta.notes,...doc.items.filter(it=>it.note).map(it=>`${it.name}: ${it.note}`)].filter(Boolean);
    if(notes.length){y+=4;sec('Anteckningar');notes.forEach(n=>row(null,n))}
    const np=pdf.getNumberOfPages(),who=pdfT([doc.meta.author?'Ritad av '+doc.meta.author:'',doc.meta.date].filter(Boolean).join(' · '));
    for(let i=1;i<=np;i++){pdf.setPage(i);pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(110);pdf.text(`${who?who+'   ':''}Sida ${i} av ${np}`,PW-M,PH-8,{align:'right'})}
    const ok=await deliver(slug(doc.meta.title)+'.pdf',pdf.output('blob'));
    if(ok&&warn) toast(warn);
  }catch(e){console.error(e);toast('PDF:en kunde inte skapas.')}
}

/* ---------- boot ---------- */
buildLib(); syncTitle(); showBanner(); updateUndo(); setTool('select'); refreshPanels(); updateSaveState();
new ResizeObserver(()=>render()).observe(cv);
requestAnimationFrame(()=>fit());
H.onBeforeQuit(flushSave);
(async()=>{
  // Mac app: the file is the source of truth, so reopen it (it may have changed in Dropbox or on another Mac)
  if(autoFile()){
    const ok=await H.exists(file.path);
    const text=ok?await H.readProject(file.path):null;
    if(text==null){toast('Hittade inte '+file.name+'. Ritningen finns kvar här, spara den igen för att koppla den till en fil.');setFile(null)}
    else if(text!==projectText()) loadProject(text,{path:file.path,name:file.name});
    else setFile(file,text);
  }
  // Finder double-click / Open With
  await H.onOpenFiles(paths=>{const p=paths.find(x=>/\.(floorplan|setplan|json)$/i.test(x));if(p)openPath(p).catch(e=>{console.error(e);toast('Filen gick inte att öppna.')})});
  const dir=await H.selftest(); if(dir) runSelftest(dir);
})().catch(e=>console.error(e));

// Web: offline support and "Lägg till på hemskärmen" on iPhone / iPad
if(H.kind==='web'&&'serviceWorker' in navigator&&(location.protocol==='https:'||/[?&]sw\b/.test(location.search))){
  navigator.serviceWorker.register('sw.js').then(reg=>{
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{
      if(w.state==='installed'&&navigator.serviceWorker.controller) toast('En ny version av Floorplan finns. Den används nästa gång du öppnar appen.')})});
  }).catch(e=>console.warn('service worker',e));
}

// CI self-test of the real Mac app (debug builds only): open a file, edit, autosave, export PDF and PNG.
async function runSelftest(dir){
  const res={ok:false,steps:[]};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    await openPath(dir+'/test.floorplan');
    if(!autoFile()||file.path!==dir+'/test.floorplan') throw new Error('file not opened');
    res.steps.push('opened');
    const n=doc.items.length;
    addItem('softbox',3,3);
    await wait(1500); await flushSave();
    const back=JSON.parse(await H.readProject(dir+'/test.floorplan'));
    if(back.items.length!==n+1) throw new Error('autosave did not write the new item');
    res.steps.push('autosaved');
    await exportPDF(); res.steps.push('pdf');
    await exportPNG(); res.steps.push('png');
    res.title=doc.meta.title; res.items=doc.items.length; res.ok=true;
  }catch(e){res.error=String(e&&e.stack||e)}
  console.log('selftest',JSON.stringify(res));
  await H.writeProject(dir+'/selftest.json',JSON.stringify(res));
}
})();
