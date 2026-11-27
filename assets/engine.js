export const materials={furniture:{label:'Płyta meblowa',w:2760,h:2030,nominal:[2800,2070],colors:['Biała','Sonoma','Wenge','Popiel','Craft złoty','Dąb Grandson']},osb:{label:'OSB',w:2500,h:1250,nominal:[2500,1250],colors:['']},hdf:{label:'HDF',w:2800,h:2070,nominal:[2800,2070],colors:['Surowa','Biała']}};
export const grainDefault=(m,c)=>m==='furniture'&&!['Biała','Popiel'].includes(c)?'long':'any';
export const edgeCode=p=>{const horizontal=Number(!!p.edges[0])+Number(!!p.edges[2]),vertical=Number(!!p.edges[1])+Number(!!p.edges[3]);const [d,k]=p.l>=p.w?[horizontal,vertical]:[vertical,horizontal];return (d?d+'D':'')+(k?k+'K':'')||'—'};
export const edgeLength=p=>p.l*(Number(!!p.edges[0])+Number(!!p.edges[2]))+p.w*(Number(!!p.edges[1])+Number(!!p.edges[3]));
export const orientations=p=>{const a={w:p.l,h:p.w,rot:false},b={w:p.w,h:p.l,rot:true};if(p.grain==='length')return [a];if(p.grain==='any')return p.l===p.w?[a]:[a,b];if(p.grain==='long')return [p.l>=p.w?a:b];return [p.l>=p.w?b:a]};
const eps=1e-7;
function split(r,o,k,axis){const dx=r.w-o.w,dy=r.h-o.h; if(dx < -eps||dy < -eps)return null; // a remaining strip narrower than the kerf cannot be isolated with an in-board cut
 if((dx>eps&&dx<k-eps)||(dy>eps&&dy<k-eps))return null;
 const rw=Math.max(0,dx-k),rh=Math.max(0,dy-k), x=r.x,y=r.y; const rest=axis===0?[{x:x+o.w+k,y,w:rw,h:r.h},{x,y:y+o.h+k,w:o.w,h:rh}]:[{x,y:y+o.h+k,w:r.w,h:rh},{x:x+o.w+k,y,w:rw,h:o.h}];return rest.filter(q=>q.w>eps&&q.h>eps)}
function candidate(b,p,k,mode){let best=null;for(let i=0;i<b.free.length;i++){const r=b.free[i];for(const o of orientations(p))for(const axis of [0,1]){const rest=split(r,o,k,axis);if(!rest)continue;const leftover=r.w*r.h-o.w*o.h, short=Math.min(r.w-o.w,r.h-o.h),long=Math.max(r.w-o.w,r.h-o.h),largest=Math.max(0,...rest.map(q=>q.w*q.h));const cuts=Number(r.w-o.w>eps)+Number(r.h-o.h>eps);const s=mode===5?[-largest,leftover,cuts]:mode===4?[(axis===0?r.h+o.w:r.w+o.h),leftover,-largest]:mode===3?[cuts,leftover,-largest]:mode===0?[leftover,short,-largest]:mode===1?[short,long,-largest]:[long,leftover,-largest];if(!best||compare(s,best.s)<0)best={i,r,o,rest,s,axis,cuts}}}return best}
function compare(a,b){for(let i=0;i<a.length;i++){if(Math.abs(a[i]-b[i])>eps)return a[i]-b[i]}return 0}
function run(parts,board,k,mode){const boards=[],unplaced=[];for(const p of parts){let b,c;for(const q of boards){const v=candidate(q,p,k,mode);if(v&&(!c||compare(v.s,c.s)<0)){b=q;c=v}}if(!c){b={w:board.w,h:board.h,free:[{x:0,y:0,w:board.w,h:board.h}],parts:[],cuts:0,sequence:[]};c=candidate(b,p,k,mode);if(!c){unplaced.push(p);continue}boards.push(b)}const {r,o,axis}=c; const vertical={axis:"vertical",x:r.x+o.w,y:r.y,length:axis===0?r.h:o.h};const horizontal={axis:"horizontal",x:r.x,y:r.y+o.h,length:axis===0?o.w:r.w};const steps=axis===0?[vertical,horizontal]:[horizontal,vertical];for(const step of steps){if(step.axis==="vertical"?r.w-o.w>eps:r.h-o.h>eps)b.sequence.push(step)}b.cuts+=c.cuts;b.free.splice(c.i,1,...c.rest);b.parts.push({...c.o,x:c.r.x,y:c.r.y,p,axis:c.axis});}return {boards,unplaced}}

/* Two-stage guillotine: cut full-width strips first, then crosscut each strip.
   The same implementation is transposed for vertical strips. */
function stripRun(parts,board,k,transpose=false,mode=0){
 const W=transpose?board.h:board.w,H=transpose?board.w:board.h,boards=[],unplaced=[];
 const fit=(remaining,need)=>remaining>=need-eps&&(remaining-need<=eps||remaining-need>=k-eps);
 const rect=(x,y,w,h)=>transpose?{x:y,y:x,w:h,h:w}:{x,y,w,h};
 function addCut(b,axis,x,y,length){b.sequence.push(transpose?{axis:axis==='horizontal'?'vertical':'horizontal',x:y,y:x,length}:{axis,x,y,length});b.cuts++}
 const options=p=>orientations(p).map(o=>({o,u:transpose?o.h:o.w,v:transpose?o.w:o.h}));
 function find(p){let best;for(const b of boards)for(const o of options(p)){
   for(const st of b.strips){if(Math.abs(st.h-o.v)>eps||!fit(W-st.x,o.u))continue;const score=[0,W-st.x-o.u,0];if(!best||compare(score,best.score)<0)best={b,st,o,score}}
   if(fit(W,o.u)&&fit(H-b.y,o.v)){const score=[1,mode===0?H-b.y-o.v:W-o.u,mode===0?W-o.u:H-b.y-o.v];if(!best||compare(score,best.score)<0)best={b,st:null,o,score}}
 }return best}
 for(const p of parts){let c=find(p);if(!c){const os=options(p).filter(o=>fit(W,o.u)&&fit(H,o.v)).sort((a,b)=>mode===0?b.v-a.v:b.u-a.u);if(!os.length){unplaced.push(p);continue}const b={w:board.w,h:board.h,parts:[],sequence:[],cuts:0,free:[],strips:[],y:0};boards.push(b);c={b,st:null,o:os[0]}}
  const {b,o}=c;let st=c.st;
  if(!st){st={x:0,y:b.y,h:o.v};b.strips.push(st);if(H-b.y-o.v>eps){addCut(b,'horizontal',0,b.y+o.v,W);b.y+=o.v+k}else b.y=H}
  const x=st.x,y=st.y;
  if(W-x-o.u>eps){addCut(b,'vertical',x+o.u,y,st.h);st.x+=o.u+k}else st.x=W;
  b.parts.push({...o.o,...rect(x,y,o.u,o.v),p,axis:transpose?0:1});
 }
 for(const b of boards){b.free=b.strips.filter(st=>W-st.x>eps).map(st=>rect(st.x,st.y,W-st.x,st.h));if(H-b.y>eps)b.free.push(rect(0,b.y,W,H-b.y));delete b.strips;delete b.y}
 return {boards,unplaced};
}
export function optimize(rows,board,k=3.2,criterion='cuts',technology='auto'){if(!Number.isFinite(k)||k<0)throw Error('Nieprawidłowy rzaz');if(!Number.isFinite(board.w)||!Number.isFinite(board.h)||board.w<=0||board.h<=0)throw Error('Nieprawidłowy wymiar arkusza');const parts=[];for(const p of rows){if(!Number.isFinite(p.l)||!Number.isFinite(p.w)||p.l<=0||p.w<=0||!Number.isInteger(p.q)||p.q<1||p.q>500)continue;if(parts.length+p.q>1000)throw Error('Limit 1000 formatek na materiał');for(let i=0;i<p.q;i++)parts.push(p)}const sorts=[(a,b)=>b.l*b.w-a.l*a.w,(a,b)=>Math.max(b.l,b.w)-Math.max(a.l,a.w),(a,b)=>Math.min(b.l,b.w)-Math.min(a.l,a.w),(a,b)=>b.l-a.l,(a,b)=>b.w-a.w,(a,b)=>b.l+b.w-a.l-a.w];let best,score;const assess=t=>{const free=t.boards.flatMap(b=>b.free),largest=free.reduce((s,r)=>s+r.w*r.h*r.w*r.h,0);const cuts=t.boards.reduce((s,b)=>s+b.cuts,0),length=t.boards.reduce((s,b)=>s+b.sequence.reduce((n,c)=>n+c.length,0),0),patterns=new Set(t.boards.map(b=>JSON.stringify(b.parts.map(p=>[p.x,p.y,p.w,p.h]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])))).size;const secondary=criterion==='length'?[length,cuts,-largest]:criterion==='scrap'?[-largest,cuts,length]:criterion==='patterns'?[patterns,cuts,length,-largest]:criterion==='waste'?[t.boards.reduce((n,b)=>n+b.sequence.reduce((a,c)=>a+c.length*k,0),0),-largest,cuts]:[cuts,-largest,free.length,length];const v=[t.unplaced.length,t.boards.length,...secondary];if(!best||compare(v,score)<0){best=t;score=v}};
for(const cmp of sorts){const sorted=[...parts].sort(cmp);if(technology==='auto'||technology==='guillotine')for(let mode=0;mode<6;mode++)assess(run(sorted,board,k,mode));if(technology!=='guillotine')for(const transpose of [false,true]){if(technology==='horizontal'&&transpose||technology==='vertical'&&!transpose)continue;for(let mode=0;mode<2;mode++)assess(stripRun(sorted,board,k,transpose,mode))}}return {...best,total:parts.length,placed:parts.length-best.unplaced.length}}
export function equalCuts(length,count,kerf){if(!Number.isFinite(length)||length<=0||!Number.isInteger(count)||count<1||!Number.isFinite(kerf)||kerf<0||length-(count-1)*kerf<=0)throw Error('Sprawdź wymiary');return {piece:(length-(count-1)*kerf)/count,cuts:count-1,loss:(count-1)*kerf}}
