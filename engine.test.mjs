import test from 'node:test';import assert from 'node:assert/strict';import {optimize,materials,edgeCode,equalCuts,orientations} from './assets/engine.js';
const p=(l,w,q=1,grain='any')=>({l,w,q,grain,edges:[true,true,false,true]});
test('wymiary i rzaz',()=>{assert.equal(materials.hdf.w,2800);assert.equal(materials.hdf.h,2070);assert.equal(materials.furniture.w,2760);assert.equal(equalCuts(2500,5,3.2).cuts,4);assert(Math.abs(equalCuts(2500,5,3.2).piece-497.44)<1e-8)});
test('okleina i słoje',()=>{assert.equal(edgeCode(p(600,400)),'1D2K');assert.equal(edgeCode(p(400,600)),'2D1K');assert.equal(orientations(p(400,600,1,'long'))[0].w,600);assert.equal(orientations(p(600,400,1,'short'))[0].w,400)});
test('wypełnianie wolnych obszarów',()=>{const r=optimize([p(120,105),p(90,60),p(85,40),p(140,55)],{w:280,h:207},3);assert.equal(r.placed,4);assert.equal(r.boards.length,1)});
test('losowe układy: granice, rzaz, brak nakładania i odpad',()=>{let seed=1234;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);for(let t=0;t<45;t++){const rows=Array.from({length:12},()=>p(100+Math.floor(rand()*1000),100+Math.floor(rand()*850),1+Math.floor(rand()*4),['any','long','short'][Math.floor(rand()*3)]));const r=optimize(rows,materials.furniture,3.2);assert.equal(r.placed,r.total);for(const b of r.boards){for(const a of b.parts){assert(a.x>=0&&a.y>=0&&a.x+a.w<=b.w+1e-6&&a.y+a.h<=b.h+1e-6);assert(orientations(a.p).some(o=>o.w===a.w&&o.h===a.h))}for(let i=0;i<b.parts.length;i++)for(let j=i+1;j<b.parts.length;j++){const a=b.parts[i],c=b.parts[j];assert(a.x+a.w+3.2<=c.x+1e-6||c.x+c.w+3.2<=a.x+1e-6||a.y+a.h+3.2<=c.y+1e-6||c.y+c.h+3.2<=a.y+1e-6)}for(const a of b.free)for(const c of b.parts)assert(a.x+a.w<=c.x+1e-6||c.x+c.w<=a.x+1e-6||a.y+a.h<=c.y+1e-6||c.y+c.h<=a.y+1e-6)}}});
test('za duże elementy',()=>assert.equal(optimize([p(3000,3000)],materials.hdf).unplaced.length,1));
test('kolejność pełnych cięć i bilans materiału',()=>{for(const rows of [[p(600,400,12),p(800,500,3)],[p(2760,2030)],[p(2760,400,4)],[p(400,600,8,'short')]]){const plan=optimize(rows,materials.furniture,3.2);for(const b of plan.boards){let rects=[{x:0,y:0,w:b.w,h:b.h}];for(const c of b.sequence){const v=c.axis==='vertical';const i=rects.findIndex(r=>v?Math.abs(r.y-c.y)<1e-6&&Math.abs(r.h-c.length)<1e-6&&c.x>r.x&&c.x+3.2<=r.x+r.w+1e-6:Math.abs(r.x-c.x)<1e-6&&Math.abs(r.w-c.length)<1e-6&&c.y>r.y&&c.y+3.2<=r.y+r.h+1e-6);assert(i>=0,'cięcie musi przechodzić przez cały aktualny fragment');const r=rects.splice(i,1)[0];const a=v?{...r,w:c.x-r.x}:{...r,h:c.y-r.y};const d=v?{...r,x:c.x+3.2,w:r.x+r.w-c.x-3.2}:{...r,y:c.y+3.2,h:r.y+r.h-c.y-3.2};rects.push(a);if(d.w>1e-6&&d.h>1e-6)rects.push(d)}assert.equal(b.cuts,b.sequence.length);for(const o of b.parts)assert(rects.some(r=>['x','y','w','h'].every(k=>Math.abs(r[k]-o[k])<1e-6)));}}});

test('technologie cięcia i niestandardowy arkusz',()=>{
 for(const technology of ['auto','guillotine','horizontal','vertical']){
  const r=optimize([p(720,510,9,'length'),p(410,180,4),p(230,150,3)],{w:2760,h:2030},3.2,'waste',technology);
  assert.equal(r.placed,r.total);
  for(const b of r.boards){
   let rects=[{x:0,y:0,w:b.w,h:b.h}];
   for(const c of b.sequence){
    const v=c.axis==='vertical';const i=rects.findIndex(r=>v?Math.abs(r.y-c.y)<1e-6&&Math.abs(r.h-c.length)<1e-6&&c.x>r.x&&c.x+3.2<=r.x+r.w+1e-6:Math.abs(r.x-c.x)<1e-6&&Math.abs(r.w-c.length)<1e-6&&c.y>r.y&&c.y+3.2<=r.y+r.h+1e-6);
    assert(i>=0,'cięcie musi przechodzić przez cały aktualny fragment');
    const r=rects.splice(i,1)[0],a=v?{...r,w:c.x-r.x}:{...r,h:c.y-r.y},d=v?{...r,x:c.x+3.2,w:r.x+r.w-c.x-3.2}:{...r,y:c.y+3.2,h:r.y+r.h-c.y-3.2};
    rects.push(a);if(d.w>1e-6&&d.h>1e-6)rects.push(d);
   }
   for(const o of b.parts){assert(rects.some(r=>['x','y','w','h'].every(k=>Math.abs(r[k]-o[k])<1e-6)));assert(orientations(o.p).some(a=>a.w===o.w&&a.h===o.h))}
  }
 }
});
test('odrzuć pole robocze o niedodatnim wymiarze',()=>{let thrown=false;try{optimize([p(100,100)],{w:-1,h:500})}catch{thrown=true}assert(thrown)});
test('pięć kryteriów i deterministyczny wynik',()=>{const rows=[p(380,200,7),p(250,510,3,'length'),p(170,170,10)];for(const k of ['cuts','length','scrap','patterns','waste']){const a=optimize(rows,{w:950,h:700},3.2,k);const b=optimize(rows,{w:950,h:700},3.2,k);assert.equal(a.placed,a.total);assert.equal(JSON.stringify(a),JSON.stringify(b))}});
