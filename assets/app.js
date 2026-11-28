import {materials,grainDefault,edgeCode,edgeLength,optimize,equalCuts} from './engine.js?v=workshop06';
const $=id=>document.getElementById(id), uid=()=>crypto.randomUUID(), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), num=v=>Number(String(v).replace(',','.')), fmt=v=>Number(v.toFixed(2)).toLocaleString('pl-PL'), valid=p=>p.l>0&&p.w>0&&Number.isFinite(p.l)&&Number.isFinite(p.w)&&Number.isInteger(p.q)&&p.q>0&&p.q<=500;
const boardFor=g=>{const m=materials[g.m],w=g.stockW??m.nominal[0],h=g.stockH??m.nominal[1],t=g.trim??(g.m==='furniture'?20:0);return {w:w-2*t,h:h-2*t,nominal:[w,h],trim:t}};
const materialGrain=g=>g.grain??(grainDefault(g.m,g.color)==='any'?'any':'length');
const row=(g)=>({id:uid(),l:0,w:0,q:1,edges:[false,false,false,false],grain:materialGrain(g),done:false});const group=(m='furniture',color=materials[m].colors[0])=>{const g={id:uid(),m,color,kerf:3.2,criterion:'cuts',technology:'auto',rows:[]};g.rows=[];return g};const fresh=()=>({name:'',groups:[group()],active:0});let state=fresh(), tab='layout', plans=[], timer;
function normalize(v){if(!v||!Array.isArray(v.groups)||!v.groups.length||v.groups.length>30)throw Error('Nieprawidłowy projekt');return {name:String(v.name||'').slice(0,200),active:Math.max(0,Math.min(v.groups.length-1,Math.floor(Number(v.active))||0)),groups:v.groups.map(g=>{if(!Object.hasOwn(materials,g.m)||!materials[g.m].colors.includes(g.color)||!Array.isArray(g.rows)||g.rows.length>1000)throw Error('Nieprawidłowy materiał');const z=group(g.m,g.color);z.kerf=Number.isFinite(+g.kerf)&&+g.kerf>=0&&+g.kerf<=20?+g.kerf:3.2;z.criterion=['cuts','length','scrap','patterns','waste'].includes(g.criterion)?g.criterion:'cuts';if(Number.isInteger(g.maxSheets)&&g.maxSheets>0&&g.maxSheets<=1000)z.maxSheets=g.maxSheets;z.technology=['auto','guillotine','horizontal','vertical'].includes(g.technology)?g.technology:'auto';for(const k of ['stockW','stockH','trim'])if(g[k]!==undefined&&Number.isFinite(+g[k])&&+g[k]>=(k==='trim'?0:1)&&+g[k]<=20000)z[k]=+g[k];z.grain=["length","long","short","any"].includes(g.grain)?g.grain:undefined;z.rows=g.rows.map(p=>({id:uid(),l:Math.max(0,num(p.l)||0),w:Math.max(0,num(p.w)||0),q:num(p.q??1),edges:Array.from({length:4},(_,i)=>!!p.edges?.[i]),edgeInput:String(p.edgeInput??edgeCode({...p,edges:p.edges||[]})).replace(/^—$/,''),grain:['length','long','short','any'].includes(p.grain)?p.grain:grainDefault(g.m,g.color),done:!!p.done}));return z})}}
try{const saved=localStorage.getItem('lebercut-v2');if(saved)state=normalize(JSON.parse(saved));else{const old=JSON.parse(localStorage.getItem('lebercut-project-v1')||'null');if(old&&['furniture','osb'].includes(old.material)){const g=group(old.material);g.kerf=old.kerf??3.2;g.rows=(old.parts||[]).map(p=>({...row(g),l:p.length,w:p.width,q:p.quantity,edges:[p.edges?.top,p.edges?.right,p.edges?.bottom,p.edges?.left],grain:'long'}));state={name:old.projectName||'',groups:[g],active:0}}}}catch{}
const current=()=>state.groups[state.active], label=g=>materials[g.m].label+(g.color?': '+g.color:'');function save(){try{localStorage.setItem('lebercut-v2',JSON.stringify(state));$('saved').textContent='Zapisano lokalnie'}catch{$('saved').textContent='Zapis lokalny niedostępny'}}
function hidePlan(){ $('results').hidden=true; }
function schedule(){save();hidePlan()}
function tabs(){ $('tabs').innerHTML=state.groups.map((g,i)=>`<button class="tab ${i===state.active?'selected':''}" data-tab="${i}">${esc(label(g))}</button>`).join('')+'<button id="add-group" class="addtab">+ Materiał</button>';$('tabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.active=+b.dataset.tab;activeBoard=0;render()});$('add-group').onclick=()=>{state.groups.push(group());state.active=state.groups.length-1;render()}}
function settings(){const g=current(),m=materials[g.m],b=boardFor(g);$('settings').innerHTML=`<div class="sectionhead"><h2>Materiał</h2>${state.groups.length>1?'<button id="remove-group" class="danger">Usuń materiał</button>':''}</div><div class="material-buttons">${Object.entries(materials).map(([k,v])=>`<button data-material="${k}" class="${g.m===k?'selected':''}">${v.label}</button>`).join('')}</div><div class="fields settings-fields">${g.m!=='osb'?`<div class="decor-picker"><small>Kolor / wykończenie</small><div class="decor-buttons">${m.colors.map(c=>`<button data-color="${esc(c)}" aria-pressed="${g.color===c}" class="${g.color===c?'selected':''}"><i style="background:${({Biała:"#fff",Popiel:"#a8abb0",Sonoma:"#c8b698",Wenge:"#443229","Craft złoty":"#c2985e","Dąb Grandson":"#aa8c66",Surowa:"#ad895f"})[c]}"></i>${esc(c)}</button>`).join('')}</div></div>`:''}<label>Priorytet optymalizacji<select id="criterion"><option value="cuts">Mniej cięć</option><option value="length">Krótsza droga cięcia</option><option value="scrap">Większe odpady użytkowe</option><option value="patterns">Mniej różnych układów</option><option value="waste">Mniejsza strata na rzazie</option></select></label><small>Najpierw minimalizujemy liczbę nieułożonych formatek i płyt.</small><label>Technologia<select id="technology"><option value="auto">Automatycznie</option><option value="guillotine">Gilotynowa</option><option value="horizontal">Pasy poziome</option><option value="vertical">Pasy pionowe</option></select></label><div class="stock-fields"><label>Długość arkusza (mm)<input id="stock-w" type="number" min="1" max="20000" step="0.1" value="${b.nominal[0]}"></label><label>Szerokość arkusza (mm)<input id="stock-h" type="number" min="1" max="20000" step="0.1" value="${b.nominal[1]}"></label><label>Bazowanie z każdej strony (mm)<input id="trim" type="number" min="0" max="1000" step="0.1" value="${b.trim}"></label></div><label>Limit dostępnych arkuszy (0 = bez limitu)<input id="stock-limit" type="number" min="0" max="1000" step="1" value="${g.maxSheets||0}"></label><label>Rzaz (mm)<input type="number" id="kerf" step="0.1" min="0" max="20" value="${g.kerf}"></label><div class="board-size"><small>Pole robocze po bazowaniu</small><b id="usable-size">${fmt(b.w)} × ${fmt(b.h)} mm</b><small>Rzaz wliczany między elementami.</small></div></div><label class="grain-option"><input id="grain" type="checkbox"> Zachowaj kierunek słojów</label><small class="grain-help">Wzdłuż wymiaru wpisanego jako długość.</small>`;
const grain=$('grain');grain.checked=materialGrain(g)!=='any';grain.indeterminate=g.rows.some(p=>p.grain!==materialGrain(g));grain.onchange=()=>{checkpoint();g.grain=grain.checked?'length':'any';g.rows.forEach(p=>p.grain=g.grain);render()};
document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{if(g.m===b.dataset.material)return;checkpoint();g.grain=undefined;g.m=b.dataset.material;delete g.stockW;delete g.stockH;delete g.trim;delete g.maxSheets;g.color=materials[g.m].colors[0];g.rows.forEach(p=>{p.grain=materialGrain(g);if(g.m!=='furniture'){p.edges=[false,false,false,false];p.edgeInput=''}});render()});document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{if(g.color===b.dataset.color)return;checkpoint();g.grain=undefined;g.color=b.dataset.color;g.rows.forEach(p=>p.grain=materialGrain(g));render()});$('stock-limit').onchange=e=>{const n=e.target.valueAsNumber;if(!Number.isInteger(n)||n<0||n>1000){e.target.value=g.maxSheets||0;return}checkpoint();g.maxSheets=n;schedule()};$('technology').value=g.technology||'auto';$('technology').onchange=e=>{checkpoint();g.technology=e.target.value;schedule()};for(const [id,k] of [['stock-w','stockW'],['stock-h','stockH'],['trim','trim']]){$(id).onchange=e=>{const v=e.target.valueAsNumber;if(!Number.isFinite(v)||v<(k==='trim'?0:1)||v>(k==='trim'?1000:20000)){settings();return}checkpoint();g[k]=v;const b=boardFor(g);$('usable-size').textContent=b.w>0&&b.h>0?fmt(b.w)+' × '+fmt(b.h)+' mm':'Bazowanie przekracza wymiar płyty';schedule()}}$('criterion').value=g.criterion||'cuts';$('criterion').onchange=e=>{checkpoint();g.criterion=e.target.value;schedule()};$('kerf').oninput=e=>{g.kerf=Math.max(0,Math.min(20,num(e.target.value)||0));schedule()};if($('remove-group'))$('remove-group').onclick=()=>{if(confirm('Usunąć ten materiał i jego formatki?')){state.groups.splice(state.active,1);state.active=Math.max(0,state.active-1);render()}}}
const key=p=>p.id;
const letters=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
function grouped(g){return g.rows.map((p,i)=>({p,q:p.q,i})).filter(v=>valid(v.p))}
const partLetter=(g,p)=>letters(g.rows.findIndex(r=>r.id===p.id));
let past=[],future=[];
function checkpoint(){past.push(JSON.stringify(state));if(past.length>60)past.shift();future=[]}
function undo(redo=false){const from=redo?future:past,to=redo?past:future;if(!from.length)return;to.push(JSON.stringify(state));state=JSON.parse(from.pop());render()}
const preset=(p,d,k)=>{const [a,b]=p.l>=p.w?[d,k]:[k,d];return [a>0,b>0,a===2,b===2]};
function parseLine(text,g){const m=text.trim().toUpperCase().match(/^(\d+(?:[.,]\d+)?)\s*[X×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[X×*]\s*(\d+))?(?:\s+(BRAK|[12]D(?:[12]K)?|[12]K))?(?:\s+([WPD]))?$/);if(!m)throw Error('Nie rozpoznano: '+text);const p={...row(g),l:num(m[1]),w:num(m[2]),q:Number(m[3]||1)};if(g.m==='furniture'){p.edges=preset(p,Number(m[4]?.match(/([12])D/)?.[1]||0),Number(m[4]?.match(/([12])K/)?.[1]||0));if(m[5])p.grain=({W:'long',P:'short',D:'any'})[m[5]]}if(!valid(p))throw Error('Nieprawidłowe wymiary: '+text);return p}
function parseEdges(p, text){
  const code=text.toUpperCase().replace(/\s/g,'');
  if (!/^(?:[12]D(?:[12]K)?|[12]K(?:[12]D)?|—|BRAK|)$/.test(code)) return null;
  return preset(p,Number(code.match(/([12])D/)?.[1]||0),Number(code.match(/([12])K/)?.[1]||0));
}
function rowError(p,g){
  if (!p.l && !p.w && p.q===1 && !p.edgeInput) return '';
  if (!valid(p)) return 'Podaj oba wymiary i liczbę sztuk od 1 do 500.';
  if (g.m==='furniture' && !parseEdges(p,p.edgeInput??edgeCode(p))) return 'Wpisz np. 1D2K. Na każdy wymiar przypadają maksymalnie 2 krawędzie.';
  return '';
}
function rows(){
 const g=current();
 if(!g.rows.length)g.rows.push(row(g));
 $('rows').innerHTML=g.rows.map((p,i)=>`<tr><td><button class="row-id" aria-label="Odhacz ${letters(i)}" aria-pressed="${p.done}">${letters(i)}</button></td>${['l','w','q','edgeInput'].map((k,n)=>`<td><input aria-label="${['Długość','Szerokość','Sztuki','Okleina'][n]} ${letters(i)}" data-field="${k}" ${k==='edgeInput'?(g.m==='furniture'?'placeholder="np. 1D2K"':'disabled'):'inputmode="decimal"'} value="${esc(k==='edgeInput'?(p.edgeInput??(edgeCode(p)==='—'?'':edgeCode(p))):p[k]||'')}"></td>`).join('')}<td><button class="remove" aria-label="Usuń ${letters(i)}">×</button></td></tr>`).join('');
 [...$('rows').rows].forEach((tr,i)=>{
  const p=g.rows[i];
  tr.querySelector('.row-id').onclick=()=>{checkpoint();p.done=!p.done;render()};
  tr.querySelector('.remove').onclick=()=>{checkpoint();g.rows.splice(i,1);render()};
  for(const input of tr.querySelectorAll('input')){
   const k=input.dataset.field;
   let advanceTimer;
   function nextRow(){
    if(!validateGroup(g))return;
    if(i===g.rows.length-1)addRow();
    else $('rows').rows[i+1].querySelector('input').focus();
   }
   input.onfocus=()=>{input.select();input.dataset.snapshot=''};
   input.oninput=e=>{
    clearTimeout(advanceTimer);
    if(!input.dataset.snapshot){checkpoint();input.dataset.snapshot='1'}
    const oldCode=p.edgeInput??edgeCode(p);
    const wasLong=p.l>=p.w;
    p[k]=k==='edgeInput'?input.value:num(input.value);
    if(g.m==='furniture' && (k==='edgeInput'||wasLong!==(p.l>=p.w))){
      const edges=parseEdges(p,k==='edgeInput'?p.edgeInput:oldCode);
      if(edges)p.edges=edges;
    }
    input.setCustomValidity('');hidePlan();save();countRows();
    if(k==='edgeInput' && valid(p) && !e.isComposing && e.inputType?.startsWith('insert')){
     const code=input.value.trim().toUpperCase();
     if(code && parseEdges(p,code)){
      // A single pair can still be extended, for example 1D to 1D2K.
      if(/^[12][DK]$/.test(code)){
       advanceTimer=setTimeout(()=>{if(document.activeElement===input)nextRow()},900);
      }else nextRow();
     }
    }
   };
   input.onblur=()=>{clearTimeout(advanceTimer);if(k==='edgeInput' && parseEdges(p,input.value)){p.edgeInput=edgeCode(p)==='—'?'':edgeCode(p);input.value=p.edgeInput;save()}};
   input.onkeydown=e=>{if(e.key==='Enter'||(e.key==='Tab'&&!e.shiftKey&&i===g.rows.length-1&&input===Array.from(tr.querySelectorAll('input:enabled')).at(-1)&&valid(p))){
    e.preventDefault();clearTimeout(advanceTimer);nextRow();
   }};
  }
 });countRows();
}
function countRows(){$('count').textContent=current().rows.filter(valid).reduce((a,p)=>a+p.q,0)+' szt.'}
function addRow(){const g=current();if(g.rows.length>=1000)return;if(g.rows.at(-1)?.l||g.rows.at(-1)?.w){checkpoint();g.rows.push(row(g))}render();$('rows').lastElementChild.querySelector('input').focus()}
function validateGroup(g){
 const i=g.rows.findIndex(p=>rowError(p,g));
 if(i<0)return true;
 if(g!==current()){state.active=state.groups.indexOf(g);render()}
 const p=g.rows[i],el=$('rows').rows[i].querySelector('[data-field="'+(!p.l?'l':!p.w?'w':!valid(p)?'q':'edgeInput')+'"]');
 el.setCustomValidity(rowError(p,g));el.focus();el.reportValidity();return false;
}
function partDiagram(o,g,scale,print){
 const w=o.w*scale,h=o.h*scale,letter=partLetter(g,o.p);
 const horizontal=fmt(o.w),vertical=fmt(o.h);
 // Printed workshop drawing: top width, left height, separate part identifier.
 // Keep the screen renderer and optimizer unchanged.
 if(print){
  const n=horizontal.length,m=vertical.length,k=letter.length;
  const pad=Math.min(5,w*.06,h*.06);
  const rotate=w<h*.60 && w<100;
  const f=Math.max(.1,Math.min(24,(w-2*pad)/(n*.72),(h-3*pad)/(rotate?3:2.7),rotate?(h-3*pad)/(m*.72+2):(w-3*pad)/(m*.72+k*.85+1)));
  const top=pad+f*.8, middle=Math.max(top+f*.75,h/2);
  const leftWidth=rotate?f: m*f*.72;
  const letterLeft=pad+leftWidth+pad;
  const available=Math.max(.1,w-letterLeft-pad);
  const centerSize=Math.max(.1,Math.min(30,available/(k*.85),h*.32));
  const cx=Math.max(letterLeft+centerSize*k*.43,w/2);
  const cy=Math.min(h-pad-centerSize*.5,Math.max(middle,h*.57));
  const edges=o.rot?[o.p.edges[3],o.p.edges[0],o.p.edges[1],o.p.edges[2]]:o.p.edges;
  const edgePaths=[`M0 0H${w}`,`M${w} 0V${h}`,`M0 ${h}H${w}`,`M0 0V${h}`];
  const outline=edges.map((v,i)=>v?`<path d="${edgePaths[i]}" stroke="#2364b3" stroke-width="3.5"/>`:'').join('');
  return `<g transform="translate(${o.x*scale} ${o.y*scale})" data-letter="${letter}" data-part="${esc(o.p.id)}" font-family="Arial, Helvetica, sans-serif" fill="#111">
   <title>${letter} · ${horizontal} × ${vertical} mm</title>
   <rect width="${w}" height="${h}" fill="#fff" stroke="#333" stroke-width="1.3"/>${outline}
   <text x="${w/2}" y="${top}" text-anchor="middle" font-size="${f}" font-weight="400">${horizontal}</text>
   ${rotate?`<text transform="translate(${pad+f*.82} ${Math.max((h+top+f*.5)/2,h/2)}) rotate(-90)" text-anchor="middle" font-size="${f}">${vertical}</text>`:`<text x="${pad}" y="${middle}" dominant-baseline="central" text-anchor="start" font-size="${f}">${vertical}</text>`}
   <text x="${cx}" y="${cy}" dominant-baseline="central" text-anchor="middle" fill="#444" font-size="${centerSize}" font-weight="600">${letter}</text>
  </g>`;
 }

 const size=Math.min(24,w/(horizontal.length*.65+2),h/(vertical.length*.65+2),w*.22,h*.22);
 const centerSize=Math.min(32,w*.44/(letter.length*.65),h*.44);
 const fill=print?'#fff':o.p.done?'#dce7dc':'#f1eee5';const edges=o.rot?[o.p.edges[3],o.p.edges[0],o.p.edges[1],o.p.edges[2]]:o.p.edges;const edgePaths=[`M0 0H${w}`,`M${w} 0V${h}`,`M0 ${h}H${w}`,`M0 0V${h}`];const outline=edges.map((v,i)=>v?`<path d="${edgePaths[i]}" stroke="#2364b3" stroke-width="3.5"/>`:'').join('');
 return `<g transform="translate(${o.x*scale} ${o.y*scale})" data-letter="${letter}" data-part="${esc(o.p.id)}" text-anchor="middle" fill="#15202b">
  <title>${letter} · ${horizontal} × ${vertical} mm</title>
  <rect width="${w}" height="${h}" fill="${fill}" stroke="#333" stroke-width="1.3"/>${outline}
  <text x="${w/2}" y="${size*1.05}" font-size="${size}">${horizontal}</text>
  <text transform="translate(${w-size*1.05} ${h/2}) rotate(90)" font-size="${size}">${vertical}</text>
  <text x="${w/2}" y="${h/2}" dominant-baseline="central" font-size="${centerSize}" font-weight="850">${letter}</text>
 </g>`;
}
let diagramId=0, showCuts=false;function diagram(b,g,print=false){const id='hatch'+(++diagramId), scale=1000/b.w,H=b.h*scale;let s=`<svg class="board-svg" viewBox="-3 -3 1006 ${H+6}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schemat rozkroju"><defs><pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#f7f8fa"/><path d="M0 0V12" stroke="#b2bac4" stroke-width="1.3"/></pattern></defs><rect width="1000" height="${H}" fill="url(#${id})" stroke="#303943" stroke-width="2"/>`;for(const r of b.free){const w=r.w*scale,h=r.h*scale,x=r.x*scale,y=r.y*scale;const t=`${fmt(r.w)} × ${fmt(r.h)}`,f=Math.min(19,w/(t.length*.59),h*.35);if(f>=10)s+=`<text x="${x+w/2}" y="${y+h/2}" dominant-baseline="middle" text-anchor="middle" font-size="${f}" fill="#747d88" stroke="white" stroke-width="4" paint-order="stroke">${t}</text>`}for(const o of b.parts)s+=partDiagram(o,g,scale,print);for(const c of b.sequence){const x=c.x*scale,y=c.y*scale,len=c.length*scale;s+=`<path pointer-events="none" d="M${x} ${y}l${c.axis==='horizontal'?len:0} ${c.axis==='vertical'?len:0}" stroke="#929da8" stroke-width="1"/>`}if(showCuts&&!print){for(const [i,c] of b.sequence.entries()){const x=c.x*scale,y=c.y*scale,len=c.length*scale,ex=x+(c.axis==='horizontal'?len:0),ey=y+(c.axis==='vertical'?len:0);s+=`<g pointer-events="none"><path d="M${x} ${y}L${ex} ${ey}" stroke="#e56b16" stroke-width="3" stroke-dasharray="8 4"/><circle cx="${(x+ex)/2}" cy="${(y+ey)/2}" r="13" fill="#a34300"/><text x="${(x+ex)/2}" y="${(y+ey)/2}" dominant-baseline="central" text-anchor="middle" fill="white" font-size="15" font-weight="700">${i+1}</text></g>`}}return s+'</svg>'}
const grainNote=g=>g.rows.some(p=>valid(p)&&p.grain!=='any')?'<div class="grain-note">⟶ Kierunek słojów płyty (poziomo)</div>':'';
function calculate(){return state.groups.map(g=>{try{const r=optimize(g.rows,boardFor(g),g.kerf,g.criterion,g.technology);const incomplete=g.rows.filter(p=>(p.l!==0||p.w!==0)&&!valid(p));if(incomplete.length)r.error=`Niepełne lub nieprawidłowe dane: ${incomplete.length} wierszy.`;else if(g.maxSheets&&r.boards.length>g.maxSheets)r.error=`Potrzeba ${r.boards.length} arkuszy; dostępnych tylko ${g.maxSheets}.`;return r}catch(e){return {boards:[],unplaced:[],total:0,placed:0,error:e.message}}})}
let activeBoard=0;
function renderBoards(g,p){const host=$('boards');if(!p.boards.length){host.innerHTML='<div class="empty">Brak schematu. Sprawdź dane.</div>';return}activeBoard=Math.min(activeBoard,p.boards.length-1);const b=p.boards[activeBoard];const groups=new Map();for(const [i,q] of p.boards.entries()){const sig=JSON.stringify(q.parts.map(o=>[o.p.id,o.x,o.y,o.w,o.h]).sort((a,b)=>a[1]-b[1]||a[2]-b[2]));if(!groups.has(sig))groups.set(sig,[]);groups.get(sig).push(i)}const used=b.parts.reduce((n,o)=>n+o.w*o.h,0);const leftover=b.free.reduce((n,r)=>n+r.w*r.h,0);host.innerHTML=`<div class="cut-workbench"><aside class="sheet-list" aria-label="Arkusze">${[...groups.values()].map(ids=>`<button data-sheet="${ids.includes(activeBoard)?activeBoard:ids[0]}" aria-pressed="${ids.includes(activeBoard)}"><b>Arkusz ${ids[0]+1}${ids.length>1?' · ×'+ids.length:''}</b><small>${p.boards[ids[0]].parts.length} formatek · ${p.boards[ids[0]].cuts} przejazdów</small></button>`).join('')}</aside><article class="board"><div class="board-head"><b>Płyta ${activeBoard+1} / ${p.boards.length}</b><div><button id="sheet-prev" ${activeBoard===0?'disabled':''}>←</button> <button id="sheet-next" ${activeBoard===p.boards.length-1?'disabled':''}>→</button></div></div>${diagram(b,g)}${grainNote(g)}<div class="sheet-summary"><span>Użycie: ${fmt(used/(b.w*b.h)*100)}%</span><span>Resztki: ${fmt(leftover/1e6)} m²</span><span>Droga piły: ${fmt(b.sequence.reduce((n,c)=>n+c.length,0)/1000)} m</span></div><details><summary>Odpady prostokątne (${b.free.length})</summary><ul>${b.free.slice().sort((a,b)=>b.w*b.h-a.w*a.h).map(r=>`<li>${fmt(r.w)} × ${fmt(r.h)} mm ${r.w>=50&&r.h>=50?`<button data-remnant="${b.free.indexOf(r)}" type="button">Zapisz odpad</button>`:''}</li>`).join('')}</ul></details><details><summary>Kolejność przejazdów (${b.sequence.length})</summary><ol>${b.sequence.map(c=>`<li>${c.axis==='vertical'?'Pion':'Poziom'} · X ${fmt(c.x)} / Y ${fmt(c.y)} · długość ${fmt(c.length)} mm</li>`).join('')}</ol><small>Współrzędne od lewego górnego narożnika pola po bazowaniu. Przed cięciem zweryfikuj ustawienie i procedurę maszyny.</small></details></article></div>`;host.querySelectorAll('[data-remnant]').forEach(e=>e.onclick=()=>saveRemnant(g,b.free[+e.dataset.remnant]));host.querySelectorAll('[data-sheet]').forEach(e=>e.onclick=()=>{activeBoard=+e.dataset.sheet;renderBoards(g,p)});$('sheet-prev').onclick=()=>{if(activeBoard>0){activeBoard--;renderBoards(g,p)}};$('sheet-next').onclick=()=>{if(activeBoard+1<p.boards.length){activeBoard++;renderBoards(g,p)}}}
function result(){plans=calculate();$('print').hidden=!plans.some(plan=>plan.boards.length);const g=current(),p=plans[state.active],area=p.boards.reduce((a,b)=>a+b.w*b.h,0),used=p.boards.reduce((a,b)=>a+b.parts.reduce((z,o)=>z+o.w*o.h,0),0);$('count').textContent=p.total+' szt.';$('stats').innerHTML=[['Płyty',p.boards.length],['Formatki',`${p.placed}/${p.total}`],['Cięcia rozliczeniowe',p.total],['Przejazdy piły',p.boards.reduce((s,b)=>s+b.cuts,0)],['Wykorzystanie',area?fmt(used/area*100)+'%':'—']].map(([l,v])=>`<div><small>${l}</small><b>${v}</b></div>`).join('');$('warning').textContent=p.error|| (p.unplaced.length?`Nie umieszczono ${p.unplaced.length} formatek. Sprawdź wymiary, słoje i rzaz.`:'');renderBoards(g,p);$('totals').innerHTML=`<b>Całe zamówienie</b><span>Materiały <strong>${state.groups.length}</strong></span><span>Płyty <strong>${plans.reduce((a,p)=>a+p.boards.length,0)}</strong></span><span>Cięcia rozliczeniowe <strong>${plans.reduce((a,p)=>a+p.total,0)}</strong></span><span>Okleina <strong>${fmt(state.groups.reduce((a,g)=>a+g.rows.filter(valid).reduce((s,p)=>s+edgeLength(p)*p.q,0),0)/1000)} mb</strong></span>`}
function render(){ $('project').value=state.name;tabs();settings();rows();hidePlan();save()}
function eq(){try{const n=num($('eq-n').value),r=equalCuts(num($('eq-l').value),n,num($('eq-k').value));$('eq-result').innerHTML=`<div class="eq-value"><small>Długość jednego kawałka</small><strong>${fmt(r.piece)} mm</strong></div><div class="eq-strip">${Array.from({length:Math.min(n,30)},()=>'<i></i>').join('')}</div><p>Fizyczne cięcia: <b>${r.cuts}</b> · Strata na rzaz: <b>${fmt(r.loss)} mm</b></p>`;return r}catch{$('eq-result').textContent='Sprawdź dane wejściowe.';return null}}
function mode(t){tab=t;$('layout').hidden=t!=='layout';$('equal').hidden=t!=='equal';$('nav-layout').classList.toggle('active',t==='layout');$('nav-equal').classList.toggle('active',t==='equal');if(t==='equal')eq()}
const printHead=(title,sub='')=>`<header class="printhead"><img src="assets/logo.png" alt="LEBERCUT"><b>${esc(sub)}</b></header><h1>${esc(title)}</h1>${state.name?`<p class="printproject">${esc(state.name)}</p>`:''}`;
function listTable(items){return `<table class="printtable"><thead><tr><th>Nr</th><th>Wymiar (mm)</th><th>Ilość</th><th>Okleina</th><th>✓</th></tr></thead><tbody>${items.map(({p,q,i})=>`<tr><td>${letters(i)}</td><td><b>${fmt(p.l)} × ${fmt(p.w)}</b></td><td>${q}</td><td>${edgeCode(p)}</td><td><i class="checkprint"></i></td></tr>`).join('')}</tbody></table>`}
async function printPages(pages){
 const area=$('print-area');
 area.innerHTML=pages.join('');
 try{
  await Promise.all(Array.from(area.querySelectorAll('img'),img=>img.decode()));
 }catch{
  alert('Nie udało się wczytać logo LEBERCUT. Spróbuj wydrukować ponownie.');
  return;
 }
 window.print();
}
$('print-equal').onclick=()=>{
 const r=eq();
 if(r)printPages([`<article class="paper">${printHead('Cięcie na równe kawałki')}<h2>${fmt(r.piece)} mm / szt.</h2><p>Liczba kawałków: ${esc($('eq-n').value)} · Liczba fizycznych cięć: ${r.cuts}</p></article>`]);
};
$('print').onclick=()=>{
 if(!state.groups.every(validateGroup))return;
 if(plans.some(p=>p.error||p.unplaced.length)){
  alert('Nie wszystkie formatki są umieszczone. Popraw dane przed wydrukiem.');
  return;
 }
 const pages=[];
 state.groups.forEach((g,gi)=>{
  const plan=plans[gi];
  for(const [i,board] of plan.boards.entries()){
   const head=printHead(label(g),`PŁYTA ${i+1}/${plan.boards.length} · ${fmt(board.w)} × ${fmt(board.h)} mm`);
   const counts=new Map();
   for(const {p} of board.parts)counts.set(p.id,(counts.get(p.id)||0)+1);
   const items=grouped(g).filter(({p})=>counts.has(p.id)).map(item=>({...item,q:counts.get(item.p.id)}));
   pages.push(`<article class="paper">${head}${diagram(board,g,true)}${grainNote(g)}<p class="printnote">Kreskowanie — odpad · Niebieskie krawędzie — okleina · Wymiary w mm</p><p>Formatki: ${board.parts.length} · Przejazdy piły po bazowaniu: ${board.cuts}</p>${listTable(items.slice(0,8))}</article>`);
   for(let start=8;start<items.length;start+=30){
    pages.push(`<article class="paper">${head}${listTable(items.slice(start,start+30))}</article>`);
   }
  }
  if(plan.boards.length>1){
   const items=grouped(g);
   for(let start=0;start<items.length;start+=30){
    pages.push(`<article class="paper">${printHead(label(g),'ZESTAWIENIE FORMATEK')}${listTable(items.slice(start,start+30))}<p>Cięcia rozliczeniowe: ${plan.total}</p></article>`);
   }
  }
 });
 if(pages.length)printPages(pages);
};
$('project').oninput=e=>{state.name=e.target.value;save()};$('nav-layout').onclick=()=>mode('layout');$('nav-equal').onclick=()=>mode('equal');['eq-l','eq-n','eq-k'].forEach(id=>$(id).oninput=eq);$('new').onclick=()=>{if(confirm('Rozpocząć nowe zamówienie?')){state=fresh();render();mode('layout')}};$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='lebercut-projekt.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};$('import').onchange=async e=>{try{state=normalize(JSON.parse(await e.target.files[0].text()));render()}catch{alert('Nie można wczytać projektu')}e.target.value=''};$('show-cuts').onchange=e=>{showCuts=e.target.checked;if(plans[state.active])renderBoards(current(),plans[state.active])};$('fullscreen').onclick=()=>{const p=document.querySelector('.result');if(p.classList.contains('expanded'))p.classList.remove('expanded');else if(document.fullscreenElement)document.exitFullscreen();else if(p.requestFullscreen)p.requestFullscreen().catch(()=>p.classList.toggle('expanded'));else p.classList.toggle('expanded')};render();eq();document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&!e.target.matches("input,textarea,select")&&["z","y"].includes(e.key.toLowerCase())){e.preventDefault();undo(e.shiftKey||e.key.toLowerCase()==="y")}});$("undo").onclick=()=>undo();$("redo").onclick=()=>undo(true);$("theme").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("lebercut-dark",document.body.classList.contains("dark")?"1":"0");document.getElementById("theme").setAttribute("aria-pressed",String(document.body.classList.contains("dark")))};document.body.classList.toggle("dark",localStorage.getItem("lebercut-dark")!=="0");document.getElementById("theme").setAttribute("aria-pressed",String(document.body.classList.contains("dark")));

$('add-row').onclick=addRow;
$('reveal').onclick=()=>{if(!state.groups.every(validateGroup))return;activeBoard=0;result();$('results').hidden=false;$('results').scrollIntoView({block:'start'})};
function commandAdd(){
 const g=current();
 try{
  const parts=$('command-parts').value.split(/\n/).filter(t=>t.trim()).map(t=>parseLine(t,g));
  if(!parts.length)throw Error('Wpisz wymiary formatki.');
  if(parts.reduce((n,p)=>n+p.q,0)+g.rows.filter(valid).reduce((n,p)=>n+p.q,0)>1000)throw Error('Limit 1000 formatek na materiał.');
  checkpoint();g.rows=g.rows.filter(p=>p.l||p.w||p.edgeInput||p.q!==1);g.rows.push(...parts);$('command-parts').value='';$('command-error').textContent='';render();
 }catch(e){$('command-error').textContent=e.message}
}
$('command-add').onclick=commandAdd;
$('command-parts').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commandAdd()}};

const archiveKey='lebercut-orders-v1';
function getArchive(){try{const a=JSON.parse(localStorage.getItem(archiveKey)||'[]');return Array.isArray(a)?a:[]}catch{return []}}
function putArchive(a){try{localStorage.setItem(archiveKey,JSON.stringify(a));return true}catch{alert('Brak miejsca w pamięci lokalnej. Wyeksportuj projekt do JSON.');return false}}
$('archive-save').onclick=()=>{if(!state.groups.every(validateGroup))return;const name=state.name.trim();if(!name){$('project').focus();alert('Nadaj nazwę zleceniu przed zapisaniem.');return}const a=getArchive(),existing=a.find(x=>x.name===name);if(existing&&!confirm('Nadpisać zlecenie '+name+'?'))return;const next=[{id:existing?.id||uid(),name,at:Date.now(),project:JSON.parse(JSON.stringify(state))},...a.filter(x=>x.id!==existing?.id)];if(putArchive(next))$('saved').textContent='Zapisano zlecenie'};
function archiveRender(){const host=$('archive-list');host.replaceChildren();const a=getArchive();if(!a.length)host.textContent='Brak zapisanych zleceń.';for(const x of a){const r=document.createElement('div');r.className='order-line';const name=document.createElement('b');name.textContent=x.name;const d=document.createElement('small');d.textContent=new Date(x.at).toLocaleString('pl-PL');const open=document.createElement('button');open.textContent='Otwórz';open.onclick=()=>{if(!confirm('Zastąpić bieżący projekt?'))return;try{state=normalize(x.project);past=[];future=[];activeBoard=0;render();mode('layout');$('archive').close()}catch{alert('Nieprawidłowy zapis')}};const del=document.createElement('button');del.textContent='Usuń';del.onclick=()=>{if(confirm('Usunąć zapisane zlecenie?')&&putArchive(getArchive().filter(y=>y.id!==x.id)))archiveRender()};r.append(name,d,open,del);host.append(r)}}
$('archive-open').onclick=()=>{archiveRender();$('archive').showModal()};$('archive-close').onclick=()=>$('archive').close();
$('csv-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>500000)throw Error('Maksymalny rozmiar CSV to 500 KB.');const g=current(),lines=(await file.text()).replace(/^\uFEFF/,'').split(/\r?\n/).filter(t=>t.trim());if(lines[0]&&/^(długość|dlugosc|length)[;,]/i.test(lines[0]))lines.shift();const parts=lines.map((l,i)=>{const cols=l.split(';').map(v=>v.trim().replace(/^"|"$/g,''));if(cols.length<2||cols.length>4)throw Error('Wiersz '+(i+1)+': oczekiwano 2–4 pól rozdzielonych średnikiem.');return parseLine(cols[0]+'x'+cols[1]+'x'+(cols[2]||1)+(cols[3]?' '+cols[3]:''),g)});if(!parts.length)throw Error('Pusty plik.');if(parts.reduce((n,p)=>n+p.q,0)+g.rows.filter(valid).reduce((n,p)=>n+p.q,0)>1000)throw Error('Limit 1000 formatek na materiał.');checkpoint();g.rows=g.rows.filter(p=>p.l||p.w||p.edgeInput||p.q!==1);g.rows.push(...parts);render();$('command-error').textContent='Zaimportowano '+parts.length+' wierszy.'}catch(err){$('command-error').textContent=err.message}finally{e.target.value=''}};
function completePlans(){if(!state.groups.every(validateGroup))return false;if(!plans.length||plans.some(p=>p.error||p.unplaced.length)){alert('Najpierw oblicz kompletny rozkrój.');return false}return true}
$('print-labels').onclick=()=>{if(!completePlans())return;const cards=[];state.groups.forEach((g,gi)=>plans[gi].boards.forEach((b,bi)=>b.parts.forEach(o=>cards.push(`<div class="part-label"><img src="assets/logo.png" alt="LEBERCUT"><strong>${partLetter(g,o.p)} · ${fmt(o.p.l)} × ${fmt(o.p.w)} mm</strong><span>${esc(label(g))} · Płyta ${bi+1}</span><span>Okleina: ${edgeCode(o.p)} · ${esc(state.name)}</span></div>`))));const pages=[];for(let i=0;i<cards.length;i+=18)pages.push('<article class="paper labels-paper"><div class="label-grid">'+cards.slice(i,i+18).join('')+'</div></article>');if(pages.length)printPages(pages)};
$('report-csv').onclick=()=>{if(!completePlans())return;const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const lines=[['Zlecenie','Materiał','Arkusz','Element','Długość mm','Szerokość mm','Okleina','X mm','Y mm','Obrót','Okleina mm']];state.groups.forEach((g,gi)=>plans[gi].boards.forEach((b,bi)=>b.parts.forEach(o=>lines.push([state.name,label(g),bi+1,partLetter(g,o.p),o.p.l,o.p.w,edgeCode(o.p),o.x,o.y,o.rot?'TAK':'NIE',edgeLength(o.p)]))));const blob=new Blob(['\uFEFF'+lines.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lebercut-raport.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};

const stockKey='lebercut-remnants-v1';
function getStock(){try{const a=JSON.parse(localStorage.getItem(stockKey)||'[]');return Array.isArray(a)?a.filter(x=>Object.hasOwn(materials,x.m)&&Number.isFinite(x.w)&&Number.isFinite(x.h)&&x.w>0&&x.h>0):[]}catch{return []}}
function putStock(a){try{localStorage.setItem(stockKey,JSON.stringify(a));return true}catch{alert('Nie udało się zapisać magazynu.');return false}}
function saveRemnant(g,r){if(!r||!confirm('Zapisz fizycznie dostępny odpad '+fmt(r.w)+' × '+fmt(r.h)+' mm? Sprawdź wymiar przed zatwierdzeniem.'))return;const a=getStock(),w=Math.floor((r.w+1e-8)*10)/10,h=Math.floor((r.h+1e-8)*10)/10;if(putStock([{id:uid(),m:g.m,color:g.color,w,h,at:Date.now(),project:state.name},...a]))alert('Zapisano odpad. Przy zużyciu usuń go ręcznie z magazynu.')}
function stockRender(){const host=$('stock-list');host.replaceChildren();const a=getStock();if(!a.length)host.textContent='Brak odpadów. Dodaj je z obliczonego rozrysu.';for(const x of a){const r=document.createElement('div');r.className='order-line';const name=document.createElement('b');name.textContent=materials[x.m].label+' · '+fmt(x.w)+' × '+fmt(x.h)+' mm';const note=document.createElement('small');note.textContent=[x.color,x.project,new Date(x.at).toLocaleDateString('pl-PL')].filter(Boolean).join(' · ');const use=document.createElement('button');use.textContent='Użyj';use.onclick=()=>{if(state.groups.length>=30){alert('Limit 30 materiałów.');return}if(!confirm('Dodaj odpad jako osobny materiał z limitem jednego arkusza?'))return;checkpoint();const g=group(x.m,x.color);g.stockW=x.w;g.stockH=x.h;g.trim=0;g.maxSheets=1;state.groups.push(g);state.active=state.groups.length-1;activeBoard=0;render();mode('layout');$('stock-dialog').close()};const del=document.createElement('button');del.textContent='Usuń / zużyto';del.onclick=()=>{if(confirm('Usunąć ten odpad z magazynu?')&&putStock(getStock().filter(y=>y.id!==x.id)))stockRender()};r.append(name,note,use,del);host.append(r)}}
$('stock-open').onclick=()=>{stockRender();$('stock-dialog').showModal()};$('stock-close').onclick=()=>$('stock-dialog').close();
