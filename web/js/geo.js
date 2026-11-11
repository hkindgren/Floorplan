// Outdoor plans: the sun's position, time zones, a local map projection, map tiles and buildings.
// The sun, time zones and projection work fully offline. Only the map tiles, the address search
// and the buildings come from the network (OpenStreetMap, free, no key).
(()=>{
'use strict';
const rad=Math.PI/180;

/* ---------- the sun ----------
   After the formulas in SunCalc by Vladimir Agafonkin (BSD-2-Clause), which follow
   Astronomy Answers (aa.quae.nl). Accurate to well under a degree, plenty for planning a shoot. */
const dayMs=864e5,J1970=2440588,J2000=2451545,obl=rad*23.4397;
function sunPos(ms,lat,lon){
  const d=ms/dayMs-0.5+J1970-J2000,lw=rad*-lon,phi=rad*lat;
  const M=rad*(357.5291+0.98560028*d);
  const C=rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M));
  const L=M+C+rad*102.9372+Math.PI;
  const dec=Math.asin(Math.sin(obl)*Math.sin(L));
  const ra=Math.atan2(Math.sin(L)*Math.cos(obl),Math.cos(L));
  const H=rad*(280.16+360.9856235*d)-lw-ra;
  const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi));
  const alt=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));
  // alt: degrees above the horizon (sun centre, no refraction); az: compass bearing, 0 = north, 90 = east
  return{alt:alt/rad,az:((az/rad+180)%360+360)%360};
}

/* ---------- time zones (the shoot's local clock, which may differ from this device's) ---------- */
const fmtCache={};
function tzOffsetMin(ms,tz){
  try{
    const f=fmtCache[tz]||(fmtCache[tz]=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}));
    const p={};for(const x of f.formatToParts(new Date(ms)))p[x.type]=x.value;
    const asUTC=Date.UTC(+p.year,+p.month-1,+p.day,(+p.hour)%24,+p.minute,+p.second);
    return Math.round((asUTC-Math.floor(ms/1000)*1000)/6e4);
  }catch(e){return -new Date(ms).getTimezoneOffset()}
}
// a date ('2026-06-21') and minutes after midnight on the shoot's clock -> UTC milliseconds
function localToUtc(date,min,tz){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||'')||[];
  const now=new Date(),y=+m[1]||now.getFullYear(),mo=m[2]?+m[2]-1:now.getMonth(),dd=+m[3]||now.getDate();
  const guess=Date.UTC(y,mo,dd,0,min);
  const off=tzOffsetMin(guess,tz);let ms=guess-off*6e4;
  const off2=tzOffsetMin(ms,tz);if(off2!==off)ms=guess-off2*6e4;
  return ms;
}
const deviceTz=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch(e){return'UTC'}};
function timeZones(){
  let z=[];try{z=Intl.supportedValuesOf('timeZone')}catch(e){}
  if(!z.length)z=['UTC','Europe/Stockholm','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Lisbon','Europe/Athens','Europe/Istanbul','Africa/Cairo','Asia/Dubai','Asia/Riyadh','Asia/Tokyo','America/New_York','America/Los_Angeles'];
  const d=deviceTz();if(!z.includes(d))z.unshift(d);
  return z;
}

// Events of the day on the shoot's clock, in minutes after midnight (null when the sun never crosses).
function dayEvents(date,tz,lat,lon){
  const t0=localToUtc(date,0,tz),N=24*30,alts=[];
  for(let i=0;i<=N;i++)alts.push(sunPos(t0+i*2*6e4,lat,lon).alt);
  const cross=(lim,up)=>{for(let i=0;i<N;i++){const a=alts[i],b=alts[i+1];if(up?(a<lim&&b>=lim):(a>=lim&&b<lim))return Math.round((i+(lim-a)/(b-a))*2)}return null};
  let hi=0;for(let i=1;i<=N;i++)if(alts[i]>alts[hi])hi=i;
  return{
    dawn:cross(-6,true),rise:cross(-0.833,true),goldenEnd:cross(6,true),
    noon:hi*2,noonAlt:alts[hi],
    goldenStart:cross(6,false),set:cross(-0.833,false),dusk:cross(-6,false),
    up:alts.some(a=>a>-0.833),down:alts.some(a=>a<=-0.833)
  };
}
const compass=b=>['N','NNO','NO','ONO','O','OSO','SO','SSO','S','SSV','SV','VSV','V','VNV','NV','NNV'][Math.round(((b%360)+360)%360/22.5)%16];

/* ---------- local projection ----------
   The plan is in metres. g = {lat, lon, ox, oy, rot}: the plan point (ox, oy) lies at lat/lon and the
   plan's "up" points to compass bearing rot. An equirectangular projection around that point is exact
   to millimetres over the few hundred metres a set covers. */
const R=6378137;
function toPlan(g,lat,lon){
  const E=(lon-g.lon)*rad*R*Math.cos(g.lat*rad),N=(lat-g.lat)*rad*R,r=g.rot*rad,c=Math.cos(r),s=Math.sin(r);
  return[g.ox+E*c-N*s,g.oy-(E*s+N*c)];
}
function toGeo(g,x,y){
  const u=x-g.ox,v=-(y-g.oy),r=g.rot*rad,c=Math.cos(r),s=Math.sin(r),E=u*c+v*s,N=-u*s+v*c;
  return[g.lat+N/R/rad,g.lon+E/(R*Math.cos(g.lat*rad))/rad];
}
// a compass bearing as a unit vector in the plan
const bearingVec=(g,b)=>{const a=(b-g.rot)*rad;return[Math.sin(a),-Math.cos(a)]};
const distM=(a,b,c,d)=>{const x=(d-b)*rad*Math.cos((a+c)/2*rad),y=(c-a)*rad;return Math.hypot(x,y)*R};

/* ---------- map tiles (Web Mercator) ---------- */
const MAPS={
  osm:{name:'Karta (OpenStreetMap)',max:19,attr:'Karta © OpenStreetMap-bidragsgivare',url:(z,x,y)=>`https://tile.openstreetmap.org/${z}/${x}/${y}.png`},
  sat:{name:'Flygfoto (Esri)',max:19,attr:'Flygfoto © Esri, Maxar, Earthstar Geographics · byggnader © OpenStreetMap-bidragsgivare',url:(z,x,y)=>`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`},
  none:{name:'Ingen karta',max:0,attr:'Byggnader © OpenStreetMap-bidragsgivare',url:null}
};
const lon2x=(lon,z)=>(lon+180)/360*2**z;
const lat2y=(lat,z)=>(1-Math.log(Math.tan(lat*rad)+1/Math.cos(lat*rad))/Math.PI)/2*2**z;
const x2lon=(x,z)=>x/2**z*360-180;
const y2lat=(y,z)=>Math.atan(Math.sinh(Math.PI-2*Math.PI*y/2**z))/rad;
// Tiles covering a plan rectangle at `pxPerM` screen pixels per metre. Each tile comes with the plan
// positions of its NW, NE and SW corners, which map the unit square onto the plan (an affine transform).
function tilesFor(g,style,b,pxPerM,maxTiles=110){
  const M=MAPS[style];if(!M||!M.url)return[];
  const cs=[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(p=>toGeo(g,p[0],p[1]));
  const la=cs.map(c=>c[0]),lo=cs.map(c=>c[1]);
  let z=Math.ceil(Math.log2(156543.034*Math.cos(g.lat*rad)*pxPerM));
  z=Math.max(3,Math.min(M.max,z));
  let x0,x1,y0,y1;
  for(;;){
    x0=Math.floor(lon2x(Math.min(...lo),z));x1=Math.floor(lon2x(Math.max(...lo),z));
    y0=Math.floor(lat2y(Math.max(...la),z));y1=Math.floor(lat2y(Math.min(...la),z));
    if((x1-x0+1)*(y1-y0+1)<=maxTiles||z<=3)break;z--;
  }
  const n=2**z,out=[];
  for(let ty=Math.max(0,y0);ty<=Math.min(n-1,y1);ty++)for(let tx=x0;tx<=x1;tx++){
    const wx=((tx%n)+n)%n,a=y2lat(ty,z),c=y2lat(ty+1,z),l=x2lon(tx,z),r=x2lon(tx+1,z);
    out.push({key:style+'/'+z+'/'+wx+'/'+ty,url:M.url(z,wx,ty),nw:toPlan(g,a,l),ne:toPlan(g,a,r),sw:toPlan(g,c,l)});
  }
  return out;
}

/* ---------- address search (Nominatim) ---------- */
function parseCoords(s){
  s=String(s||'').trim();
  let m=s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)||s.match(/[?&](?:q|ll|query|center)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i)
    ||s.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/)||s.match(/^(-?\d+(?:[.,]\d+)?)\s*[,;]?\s+(-?\d+(?:[.,]\d+)?)$/);
  if(!m)return null;
  const lat=parseFloat(m[1].replace(',','.')),lon=parseFloat(m[2].replace(',','.'));
  return Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat,lon}:null;
}
const NOMI='https://nominatim.openstreetmap.org';
async function search(q){
  const r=await fetch(`${NOMI}/search?format=jsonv2&limit=6&accept-language=sv&q=${encodeURIComponent(q)}`);
  if(!r.ok)throw new Error('search '+r.status);
  return(await r.json()).map(x=>({lat:+x.lat,lon:+x.lon,name:x.display_name}));
}
async function reverse(lat,lon){
  const r=await fetch(`${NOMI}/reverse?format=jsonv2&zoom=17&accept-language=sv&lat=${lat}&lon=${lon}`);
  if(!r.ok)throw new Error('reverse '+r.status);
  const j=await r.json();return j&&j.display_name||'';
}

/* ---------- buildings (Overpass API, OpenStreetMap data) ---------- */
const DEFAULT_H={house:7,detached:7,semidetached_house:7,terrace:8,bungalow:4,cabin:4,garage:3,garages:3,shed:3,hut:3,kiosk:3,
  carport:3,roof:4,greenhouse:3,service:4,church:20,cathedral:30,chapel:8,apartments:18,residential:15,commercial:15,office:20,
  hotel:20,industrial:9,warehouse:9,retail:8,supermarket:7,school:12,university:15,hospital:20,train_station:12};
function heightOf(t){
  const num=v=>{const n=parseFloat(String(v??'').replace(',','.'));return n>0&&n<1000?n:0};
  const h=num(t.height);if(h)return{h:Math.round(h*10)/10,src:'height'};
  const lv=num(t['building:levels']);
  if(lv){const roof=num(t['roof:levels']);return{h:Math.round((lv*3.2+(roof?roof*2:0.8))*10)/10,src:'levels',levels:lv}}
  return{h:DEFAULT_H[t.building]||10,src:'default'};
}
function parseOverpass(j){
  const out=[];
  for(const el of(j&&j.elements)||[]){
    const t=el.tags||{};if(!t.building||t.building==='no')continue;
    const rings=el.type==='way'?[el.geometry]:(el.members||[]).filter(m=>m.role==='outer'&&m.geometry).map(m=>m.geometry);
    rings.forEach((ring,i)=>{
      if(!ring||ring.length<4)return;
      let pts=ring.map(p=>[+p.lat.toFixed(6),+p.lon.toFixed(6)]);
      const a=pts[0],z=pts[pts.length-1];if(a[0]===z[0]&&a[1]===z[1])pts=pts.slice(0,-1);
      if(pts.length<3)return;
      out.push({id:el.type[0]+el.id+(i?'-'+i:''),pts,...heightOf(t),name:t.name||[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ')});
    });
  }
  return out;
}
const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function fetchBuildings(lat,lon,radius){
  const q=`[out:json][timeout:25];(way["building"](around:${radius},${lat},${lon});relation["building"]["type"="multipolygon"](around:${radius},${lat},${lon}););out tags geom;`;
  let err;
  for(const u of OVERPASS){
    try{
      const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q)});
      if(!r.ok)throw new Error('overpass '+r.status);
      return parseOverpass(await r.json());
    }catch(e){err=e}
  }
  throw err;
}

window.FPGeo={sunPos,dayEvents,compass,tzOffsetMin,localToUtc,deviceTz,timeZones,toPlan,toGeo,bearingVec,distM,
  MAPS,tilesFor,parseCoords,search,reverse,fetchBuildings,parseOverpass,heightOf};
})();
