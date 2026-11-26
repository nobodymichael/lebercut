import {materials,grainDefault,edgeCode,edgeLength,optimize,equalCuts} from './engine.js?v=pro1';
const $=id=>document.getElementById(id), uid=()=>crypto.randomUUID(), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), num=v=>Number(String(v).replace(',','.')), fmt=v=>Number(v.toFixed(2)).toLocaleString('pl-PL'), valid=p=>p.l>0&&p.w>0&&Number.isFinite(p.l)&&Number.isFinite(p.w)&&Number.isInteger(p.q)&&p.q>0&&p.q<=500;
const materialGrain=g=>g.grain??(grainDefault(g.m,g.color)==='any'?'any':'length');
const row=(g)=>({id:uid(),l:0,w:0,q:1,edges:[false,false,false,false],grain:materialGrain(g),done:false});const group=(m='furniture',color=materials[m].colors[0])=>{const g={id:uid(),m,color,kerf:3.2,rows:[]};g.rows=[];return g};const fresh=()=>({name:'',groups:[group()],active:0});let state=fresh(), tab='layout', plans=[], timer;
function normalize(v){if(!v||!Array.isArray(v.groups)||!v.groups.length||v.groups.length>30)throw Error('Nieprawidłowy projekt');return {name:String(v.name||'').slice(0,200),active:Math.max(0,Math.min(v.groups.length-1,Math.floor(Number(v.active))||0)),groups:v.groups.map(g=>{if(!Object.hasOwn(materials,g.m)||!materials[g.m].colors.includes(g.color)||!Array.isArray(g.rows)||g.rows.length>1000)throw Error('Nieprawidłowy materiał');const z=group(g.m,g.color);z.kerf=Number.isFinite(+g.kerf)&&+g.kerf>=0&&+g.kerf<=20?+g.kerf:3.2;z.grain=["length","long","short","any"].includes(g.grain)?g.grain:undefined;z.rows=g.rows.map(p=>({id:uid(),l:Math.max(0,num(p.l)||0),w:Math.max(0,num(p.w)||0),q:num(p.q??1),edges:Array.from({length:4},(_,i)=>!!p.edges?.[i]),edgeInput:String(p.edgeInput??edgeCode({...p,edges:p.edges||[]})).replace(/^—$/,''),grain:['length','long','short','any'].includes(p.grain)?p.grain:grainDefault(g.m,g.color),done:!!p.done}));return z})}}
try{const saved=localStorage.getItem('lebercut-v2');if(saved)state=normalize(JSON.parse(saved));else{const old=JSON.parse(localStorage.getItem('lebercut-project-v1')||'null');if(old&&['furniture','osb'].includes(old.material)){const g=group(old.material);g.kerf=old.kerf??3.2;g.rows=(old.parts||[]).map(p=>({...row(g),l:p.length,w:p.width,q:p.quantity,edges:[p.edges?.top,p.edges?.right,p.edges?.bottom,p.edges?.left],grain:'long'}));state={name:old.projectName||'',groups:[g],active:0}}}}catch{}
const current=()=>state.groups[state.active], label=g=>materials[g.m].label+(g.color?': '+g.color:'');function save(){try{localStorage.setItem('lebercut-v2',JSON.stringify(state));$('saved').textContent='Zapisano lokalnie'}catch{$('saved').textContent='Zapis lokalny niedostępny'}}
function hidePlan(){ $('results').hidden=true; }
function schedule(){save();hidePlan()}
function tabs(){ $('tabs').innerHTML=state.groups.map((g,i)=>`<button class="tab ${i===state.active?'selected':''}" data-tab="${i}">${esc(label(g))}</button>`).join('')+'<button id="add-group" class="addtab">+ Materiał</button>';$('tabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.active=+b.dataset.tab;render()});$('add-group').onclick=()=>{state.groups.push(group());state.active=state.groups.length-1;render()}}
function settings(){const g=current(),m=materials[g.m];$('settings').innerHTML=`<div class="sectionhead"><h2>Materiał</h2>${state.groups.length>1?'<button id="remove-group" class="danger">Usuń materiał</button>':''}</div><div class="material-buttons">${Object.entries(materials).map(([k,v])=>`<button data-material="${k}" class="${g.m===k?'selected':''}">${v.label}</button>`).join('')}</div><div class="fields settings-fields">${g.m!=='osb'?`<div class="decor-picker"><small>Kolor / wykończenie</small><div class="decor-buttons">${m.colors.map(c=>`<button data-color="${esc(c)}" aria-pressed="${g.color===c}" class="${g.color===c?'selected':''}"><i style="background:${({Biała:"#fff",Popiel:"#a8abb0",Sonoma:"#c8b698",Wenge:"#443229","Craft złoty":"#c2985e","Dąb Grandson":"#aa8c66",Surowa:"#ad895f"})[c]}"></i>${esc(c)}</button>`).join('')}</div></div>`:''}<label>Rzaz (mm)<input type="number" id="kerf" step="0.1" min="0" max="20" value="${g.kerf}"></label><div class="board-size"><small>Arkusz ${m.nominal.join(" × ")} mm · pole robocze</small><b>${m.w} × ${m.h} mm</b><small>${g.m==="furniture"?"Wyrównanie: 20 mm z każdej strony":"Bez wyrównania krawędzi"}</small></div></div><label class="grain-option"><input id="grain" type="checkbox"> Zachowaj kierunek słojów</label><small class="grain-help">Wzdłuż wymiaru wpisanego jako długość.</small>`;
const grain=$('grain');grain.checked=materialGrain(g)!=='any';grain.indeterminate=g.rows.some(p=>p.grain!==materialGrain(g));grain.onchange=()=>{checkpoint();g.grain=grain.checked?'length':'any';g.rows.forEach(p=>p.grain=g.grain);render()};
document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{if(g.m===b.dataset.material)return;checkpoint();g.grain=undefined;g.m=b.dataset.material;g.color=materials[g.m].colors[0];g.rows.forEach(p=>{p.grain=materialGrain(g);if(g.m!=='furniture'){p.edges=[false,false,false,false];p.edgeInput=''}});render()});document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{if(g.color===b.dataset.color)return;checkpoint();g.grain=undefined;g.color=b.dataset.color;g.rows.forEach(p=>p.grain=materialGrain(g));render()});$('kerf').oninput=e=>{g.kerf=Math.max(0,Math.min(20,num(e.target.value)||0));schedule()};if($('remove-group'))$('remove-group').onclick=()=>{if(confirm('Usunąć ten materiał i jego formatki?')){state.groups.splice(state.active,1);state.active=Math.max(0,state.active-1);render()}}}
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
   input.onfocus=()=>{input.select();input.dataset.snapshot=''};
   input.oninput=()=>{
    if(!input.dataset.snapshot){checkpoint();input.dataset.snapshot='1'}
    const oldCode=p.edgeInput??edgeCode(p);
    const wasLong=p.l>=p.w;
    p[k]=k==='edgeInput'?input.value:num(input.value);
    if(g.m==='furniture' && (k==='edgeInput'||wasLong!==(p.l>=p.w))){
      const edges=parseEdges(p,k==='edgeInput'?p.edgeInput:oldCode);
      if(edges)p.edges=edges;
    }
    input.setCustomValidity('');hidePlan();save();countRows();
   };
   input.onblur=()=>{if(k==='edgeInput' && parseEdges(p,input.value)){p.edgeInput=edgeCode(p)==='—'?'':edgeCode(p);input.value=p.edgeInput;save()}};
   input.onkeydown=e=>{if(e.key==='Enter'||(e.key==='Tab'&&!e.shiftKey&&i===g.rows.length-1&&input===Array.from(tr.querySelectorAll('input:enabled')).at(-1)&&valid(p))){
    e.preventDefault();if(!validateGroup(g))return;
    if(i===g.rows.length-1)addRow();else $('rows').rows[i+1].querySelector('input').focus()
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
let diagramId=0, showCuts=false;function diagram(b,g,print=false){const id='hatch'+(++diagramId), scale=1000/b.w,H=b.h*scale;let s=`<svg class="board-svg" viewBox="-3 -3 1006 ${H+6}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schemat rozkroju"><defs><pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#f7f8fa"/><path d="M0 0V12" stroke="#b2bac4" stroke-width="1.3"/></pattern></defs><rect width="1000" height="${H}" fill="url(#${id})" stroke="#303943" stroke-width="2"/>`;for(const r of b.free){const w=r.w*scale,h=r.h*scale,x=r.x*scale,y=r.y*scale;const t=`${fmt(r.w)} × ${fmt(r.h)}`,f=Math.min(19,w/(t.length*.59),h*.35);if(f>=10)s+=`<text x="${x+w/2}" y="${y+h/2}" dominant-baseline="middle" text-anchor="middle" font-size="${f}" fill="#747d88" stroke="white" stroke-width="4" paint-order="stroke">${t}</text>`}for(const o of b.parts){const x=o.x*scale,y=o.y*scale,w=o.w*scale,h=o.h*scale,t=`${partLetter(g,o.p)} · ${fmt(o.p.l)} × ${fmt(o.p.w)}${edgeCode(o.p)==='—'?'':' · '+edgeCode(o.p)}`,normal=Math.min(35,w/(t.length*.62),h*.52),rotated=Math.min(35,h/(t.length*.62),w*.52),rotate=rotated>normal*1.15,f=rotate?rotated:normal;s+=`<g data-letter="${partLetter(g,o.p)}" data-part="${esc(o.p.id)}"><title>${t} mm · ${edgeCode(o.p)}</title><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${print?'white':o.p.done?'#dce7dc':'#e0efff'}" stroke="#1e3448" stroke-width="1.7"/>`;if(f>=14)s+=`<text transform="rotate(${rotate?-90:0} ${x+w/2} ${y+h/2})" x="${x+w/2}" y="${y+h/2}" dominant-baseline="middle" text-anchor="middle" font-size="${f}" font-weight="850" fill="#15202b">${t}</text>`;else if(w>12&&h>12)s+=`<text x="${x+w/2}" y="${y+h/2}" dominant-baseline="middle" text-anchor="middle" font-size="${Math.min(15,w*.45,h*.6)}" font-weight="bold">${partLetter(g,o.p)}</text>`;s+='</g>'}for(const c of b.sequence){const x=c.x*scale,y=c.y*scale,len=c.length*scale;s+=`<path pointer-events="none" d="M${x} ${y}l${c.axis==='horizontal'?len:0} ${c.axis==='vertical'?len:0}" stroke="#929da8" stroke-width="1"/>`}if(showCuts&&!print){for(const [i,c] of b.sequence.entries()){const x=c.x*scale,y=c.y*scale,len=c.length*scale,ex=x+(c.axis==='horizontal'?len:0),ey=y+(c.axis==='vertical'?len:0);s+=`<g pointer-events="none"><path d="M${x} ${y}L${ex} ${ey}" stroke="#e56b16" stroke-width="3" stroke-dasharray="8 4"/><circle cx="${(x+ex)/2}" cy="${(y+ey)/2}" r="13" fill="#a34300"/><text x="${(x+ex)/2}" y="${(y+ey)/2}" dominant-baseline="central" text-anchor="middle" fill="white" font-size="15" font-weight="700">${i+1}</text></g>`}}return s+'</svg>'}
const grainNote=g=>g.rows.some(p=>valid(p)&&p.grain!=='any')?'<div class="grain-note">⟶ Kierunek słojów płyty (poziomo)</div>':'';
function calculate(){return state.groups.map(g=>{try{const r=optimize(g.rows,materials[g.m],g.kerf);const incomplete=g.rows.filter(p=>(p.l!==0||p.w!==0)&&!valid(p));if(incomplete.length)r.error=`Niepełne lub nieprawidłowe dane: ${incomplete.length} wierszy.`;return r}catch(e){return {boards:[],unplaced:[],total:0,placed:0,error:e.message}}})}
function result(){plans=calculate();const g=current(),p=plans[state.active],area=p.boards.reduce((a,b)=>a+b.w*b.h,0),used=p.boards.reduce((a,b)=>a+b.parts.reduce((z,o)=>z+o.w*o.h,0),0);$('count').textContent=p.total+' szt.';$('stats').innerHTML=[['Płyty',p.boards.length],['Formatki',`${p.placed}/${p.total}`],['Cięcia rozliczeniowe',p.total],['Przejazdy piły',p.boards.reduce((s,b)=>s+b.cuts,0)],['Wykorzystanie',area?fmt(used/area*100)+'%':'—']].map(([l,v])=>`<div><small>${l}</small><b>${v}</b></div>`).join('');$('warning').textContent=p.error|| (p.unplaced.length?`Nie umieszczono ${p.unplaced.length} formatek. Sprawdź wymiary, słoje i rzaz.`:'');$('boards').innerHTML=p.boards.length?p.boards.map((b,i)=>`<article class="board"><div class="board-head"><b>Płyta ${i+1} / ${p.boards.length}</b><span>${b.parts.length} szt. · ${b.cuts} przejazdów</span></div>${diagram(b,g)}${grainNote(g)}<button class="primary" type="button" data-print-board="${i}">Drukuj arkusz ${i+1}</button></article>`).join(''):'<div class="empty">Wprowadź wymiary formatek, aby zobaczyć schemat.</div>';$('totals').innerHTML=`<b>Całe zamówienie</b><span>Materiały <strong>${state.groups.length}</strong></span><span>Płyty <strong>${plans.reduce((a,p)=>a+p.boards.length,0)}</strong></span><span>Cięcia rozliczeniowe <strong>${plans.reduce((a,p)=>a+p.total,0)}</strong></span><span>Okleina <strong>${fmt(state.groups.reduce((a,g)=>a+g.rows.filter(valid).reduce((s,p)=>s+edgeLength(p)*p.q,0),0)/1000)} mb</strong></span>`}
function render(){ $('project').value=state.name;tabs();settings();rows();hidePlan();save()}
function eq(){try{const n=num($('eq-n').value),r=equalCuts(num($('eq-l').value),n,num($('eq-k').value));$('eq-result').innerHTML=`<div class="eq-value"><small>Długość jednego kawałka</small><strong>${fmt(r.piece)} mm</strong></div><div class="eq-strip">${Array.from({length:Math.min(n,30)},()=>'<i></i>').join('')}</div><p>Fizyczne cięcia: <b>${r.cuts}</b> · Strata na rzaz: <b>${fmt(r.loss)} mm</b></p>`;return r}catch{$('eq-result').textContent='Sprawdź dane wejściowe.';return null}}
function mode(t){tab=t;$('layout').hidden=t!=='layout';$('equal').hidden=t!=='equal';$('nav-layout').classList.toggle('active',t==='layout');$('nav-equal').classList.toggle('active',t==='equal');if(t==='equal')eq()}
const printHead=(title,sub='')=>`<header class="printhead"><img src="assets/logo.png" alt="LEBERCUT"><b>${esc(sub)}</b></header><h1>${esc(title)}</h1>${state.name?`<p class="printproject">${esc(state.name)}</p>`:''}`;
function listTable(items){return `<table class="printtable"><thead><tr><th>Nr</th><th>Wymiar (mm)</th><th>Ilość</th><th>Okleina</th><th>✓</th></tr></thead><tbody>${items.map(({p,q,i})=>`<tr><td>${letters(i)}</td><td><b>${fmt(p.l)} × ${fmt(p.w)}</b></td><td>${q}</td><td>${edgeCode(p)}</td><td><i class="checkprint"></i></td></tr>`).join('')}</tbody></table>`}
function print(){if(tab==='equal'){const r=eq();if(!r)return;$('print-area').innerHTML=`<article class="paper">${printHead('Cięcie na równe kawałki')}<h2>${fmt(r.piece)} mm / szt.</h2><p>Liczba kawałków: ${esc($('eq-n').value)} · Liczba fizycznych cięć: ${r.cuts}</p></article>`;window.print();return}if(!state.groups.every(validateGroup))return;plans=calculate();if(plans.some(p=>p.error||p.unplaced.length)){alert('Nie wszystkie formatki są umieszczone. Popraw dane przed wydrukiem.');return}$('print-dialog').showModal()}
$('p-go').onclick=()=>{const scheme=$('p-scheme').checked,list=$('p-list').checked;if(!scheme&&!list)return;let pages=[];state.groups.forEach((g,gi)=>{const p=plans[gi];if(scheme)p.boards.forEach((b,i)=>{const map=new Map();for(const o of b.parts){const old=map.get(key(o.p));if(old)old.q++;else map.set(key(o.p),{p:o.p,q:1,i:g.rows.findIndex(v=>v.id===o.p.id)})}const items=[...map.values()];pages.push(`<article class="paper">${printHead(label(g),`PŁYTA ${i+1}/${p.boards.length}`)}${diagram(b,g,true)}${grainNote(g)}<p class="printnote">Kreskowanie — odpad · Wymiary w mm</p><p><b>Formatki / cięcia: ${b.parts.length}</b></p>${list?listTable(items.slice(0,8)):''}${list&&items.length>8?'<p>Pozostałe pozycje w zestawieniu materiału.</p>':''}</article>`)});if(list&&(!scheme||p.boards.length>1||g.rows.filter(valid).length>8)){const items=grouped(g);for(let i=0;i<items.length;i+=30)pages.push(`<article class="paper">${printHead(label(g),'ZESTAWIENIE FORMATEK')}${listTable(items.slice(i,i+30))}<p><b>Cięcia rozliczeniowe: ${p.total}</b></p></article>`)}});if(!pages.length){alert('Brak formatek do wydruku');return}$('print-area').innerHTML=pages.join('');$('print-dialog').close();window.print()};$('p-cancel').onclick=()=>$('print-dialog').close();$('print').onclick=print;$('project').oninput=e=>{state.name=e.target.value;save()};$('nav-layout').onclick=()=>mode('layout');$('nav-equal').onclick=()=>mode('equal');['eq-l','eq-n','eq-k'].forEach(id=>$(id).oninput=eq);$('new').onclick=()=>{if(confirm('Rozpocząć nowe zamówienie?')){state=fresh();render();mode('layout')}};$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='lebercut-projekt.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};$('import').onchange=async e=>{try{state=normalize(JSON.parse(await e.target.files[0].text()));render()}catch{alert('Nie można wczytać projektu')}e.target.value=''};$('show-cuts').onchange=e=>{showCuts=e.target.checked;result()};$('fullscreen').onclick=()=>{const p=document.querySelector('.result');if(p.classList.contains('expanded'))p.classList.remove('expanded');else if(document.fullscreenElement)document.exitFullscreen();else if(p.requestFullscreen)p.requestFullscreen().catch(()=>p.classList.toggle('expanded'));else p.classList.toggle('expanded')};render();eq();document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&!e.target.matches("input,textarea,select")&&["z","y"].includes(e.key.toLowerCase())){e.preventDefault();undo(e.shiftKey||e.key.toLowerCase()==="y")}});$("undo").onclick=()=>undo();$("redo").onclick=()=>undo(true);$("theme").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("lebercut-dark",document.body.classList.contains("dark")?"1":"0");document.getElementById("theme").setAttribute("aria-pressed",String(document.body.classList.contains("dark")))};document.body.classList.toggle("dark",localStorage.getItem("lebercut-dark")==="1");document.getElementById("theme").setAttribute("aria-pressed",String(document.body.classList.contains("dark")));

$('add-row').onclick=addRow;
$('boards').addEventListener('click', event => {
  const button = event.target.closest('[data-print-board]');
  if (!button) return;
  const group = current();
  const plan = plans[state.active];
  const index = Number(button.dataset.printBoard);
  const board = plan.boards[index];
  const counts = new Map();
  for (const {p} of board.parts) counts.set(p.id, (counts.get(p.id) || 0) + 1);
  const items = grouped(group).filter(({p}) => counts.has(p.id))
    .map(item => ({...item, q: counts.get(item.p.id)}));
  const title = printHead(label(group), `PŁYTA ${index+1}/${plan.boards.length}`);
  const pages = [`<article class="paper">${title}${diagram(board,group,true)}${grainNote(group)}
    <p>Kreskowanie — odpad · Wymiary w mm</p>${listTable(items.slice(0,8))}</article>`];
  for (let start = 8; start < items.length; start += 30) {
    pages.push(`<article class="paper">${title}${listTable(items.slice(start,start+30))}</article>`);
  }
  $('print-area').innerHTML = pages.join('');
  window.print();
});
$('reveal').onclick=()=>{if(!validateGroup(current()))return;result();$('results').hidden=false;$('results').scrollIntoView({block:'start'})};
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
