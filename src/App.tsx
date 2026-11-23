import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, CircleHelp, Layers3, Plus, Printer, RotateCcw, Ruler, Scissors, Trash2, X } from 'lucide-react';
import { calculateEqualCuts } from './engine/equalCuts';
import { DEFAULT_KERF, getBoardSpec } from './engine/boards';
import { optimizeCut } from './engine/optimizer';
import type { EdgeFlags, Material, Part } from './engine/types';

const blankEdges: EdgeFlags = { top: false, right: false, bottom: false, left: false };
const newPart = (): Part => ({ id: crypto.randomUUID(), name: '', length: 600, width: 400, quantity: 1, edges: { ...blankEdges } });
const saved = localStorage.getItem('lebercut-project-v1');
const initialParts: Part[] = saved ? (() => { try { return JSON.parse(saved).parts ?? [newPart()]; } catch { return [newPart()]; } })() : [newPart()];

type Tab = 'layout' | 'equal';
function App() {
  const [tab, setTab] = useState<Tab>('layout');
  const [material, setMaterial] = useState<Material>('furniture');
  const [customWidth, setCustomWidth] = useState(2800);
  const [customHeight, setCustomHeight] = useState(2070);
  const [kerf, setKerf] = useState(DEFAULT_KERF);
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [projectName, setProjectName] = useState('Nowy projekt');
  const [cutLength, setCutLength] = useState(2500);
  const [cutCount, setCutCount] = useState(5);
  const [cutKerf, setCutKerf] = useState(DEFAULT_KERF);
  const board = useMemo(() => getBoardSpec(material, { name: 'Własny format', width: customWidth, height: customHeight, trim: 0 }), [material, customWidth, customHeight]);
  const plan = useMemo(() => optimizeCut(parts, board, kerf), [parts, board, kerf]);
  const updatePart = (id: string, patch: Partial<Part>) => setParts(current => current.map(p => p.id === id ? { ...p, ...patch } : p));
  const updateEdge = (id: string, edge: keyof EdgeFlags, value: boolean) => setParts(current => current.map(p => p.id === id ? { ...p, edges: { ...p.edges, [edge]: value } } : p));
  const saveProject = () => { localStorage.setItem('lebercut-project-v1', JSON.stringify({ projectName, parts, material, kerf, customWidth, customHeight })); };
  const loadProject = () => { const raw = localStorage.getItem('lebercut-project-v1'); if (!raw) return; try { const data = JSON.parse(raw); setProjectName(data.projectName ?? 'Wczytany projekt'); setParts(data.parts ?? [newPart()]); setMaterial(data.material ?? 'furniture'); setKerf(data.kerf ?? DEFAULT_KERF); setCustomWidth(data.customWidth ?? 2800); setCustomHeight(data.customHeight ?? 2070); } catch { /* ignore malformed local project */ } };
  const exportProject = () => { const blob = new Blob([JSON.stringify({ projectName, parts, material, kerf, customWidth, customHeight }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${projectName.replace(/[^a-z0-9-_]/gi, '_')}.json`; a.click(); URL.revokeObjectURL(url); };
  const equalResult = (() => { try { return calculateEqualCuts(cutLength, cutCount, cutKerf); } catch { return null; } })();
  const runPrint = () => window.print();

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Scissors size={23} strokeWidth={2.7}/></div><div><div className="brand-name">LEBER<span>CUT</span></div><div className="brand-sub">CUT SMARTER.</div></div></div>
      <div className="side-label">WORKSPACE</div>
      <button className={`nav-item ${tab === 'layout' ? 'active' : ''}`} onClick={() => setTab('layout')}><Layers3 size={18}/> Rozkrój płyt</button>
      <button className={`nav-item ${tab === 'equal' ? 'active' : ''}`} onClick={() => setTab('equal')}><Ruler size={18}/> Cięcie na kawałki</button>
      <div className="sidebar-bottom"><div className="version-dot"/> <span>WERSJA ROBOCZA</span><span className="version">0.1.0</span></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">LEBERCUT <span>/</span> {tab === 'layout' ? 'ROZKRÓJ PŁYT' : 'CIĘCIE NA KAWAŁKI'}</div><div className="top-actions"><button className="ghost-btn" onClick={loadProject}><RotateCcw size={15}/> Wczytaj</button><button className="ghost-btn" onClick={saveProject}><Check size={15}/> Zapisz</button><button className="primary-btn small" onClick={tab === 'layout' ? runPrint : runPrint}><Printer size={15}/> Drukuj</button></div></header>
      {tab === 'layout' ? <>
        <section className="page-heading"><div><div className="eyebrow">OPTIMIZATION WORKSPACE</div><h1>Rozkrój <span>płyt.</span></h1><p>Wprowadź formatki. LEBERCUT przygotuje czytelny plan rozkroju.</p></div><div className="heading-icon"><Layers3 size={28}/></div></section>
        <div className="project-line"><div className="project-name-wrap"><label>NAZWA PROJEKTU</label><input value={projectName} onChange={e => setProjectName(e.target.value)} /></div><div className="project-meta"><span className="status-dot"/> ZMIANY LOKALNE</div></div>
        <div className="workspace-grid">
          <section className="panel input-panel">
            <div className="panel-head"><div><div className="panel-kicker">01 / DANE WEJŚCIOWE</div><h2>Materiał i ustawienia</h2></div><span className="step-number">01</span></div>
            <div className="field-label">RODZAJ PŁYTY</div>
            <div className="material-options"><button className={material === 'furniture' ? 'selected' : ''} onClick={() => setMaterial('furniture')}><span className="material-swatch furniture"/><span><b>Płyta meblowa</b><small>2800 × 2070 mm</small></span>{material === 'furniture' && <Check size={16}/>}</button><button className={material === 'osb' ? 'selected' : ''} onClick={() => setMaterial('osb')}><span className="material-swatch osb"/><span><b>OSB</b><small>2500 × 1250 mm</small></span>{material === 'osb' && <Check size={16}/>}</button><button className={material === 'custom' ? 'selected' : ''} onClick={() => setMaterial('custom')}><span className="material-swatch custom"/><span><b>Własny</b><small>Wymiary ręczne</small></span>{material === 'custom' && <Check size={16}/>}</button></div>
            {material === 'custom' && <div className="inline-fields"><NumberField label="DŁUGOŚĆ PŁYTY" value={customWidth} onChange={setCustomWidth}/><NumberField label="SZEROKOŚĆ PŁYTY" value={customHeight} onChange={setCustomHeight}/></div>}
            <div className="settings-row"><div><label>RZAZ TARCZY</label><p>Strata materiału na każde cięcie</p></div><div className="unit-input"><input type="number" min="0" step="0.1" value={kerf} onChange={e => setKerf(Math.max(0, Number(e.target.value)))}/><span>mm</span></div></div>
            <div className="info-note"><CircleHelp size={16}/><span>{material === 'osb' ? 'OSB: program odejmuje 20 mm z każdej krawędzi. Pole robocze: 2460 × 1210 mm.' : 'Kierunek słojów jest stały. Formatki nie są obracane o 90°.'}</span></div>
            <div className="panel-divider"/>
            <div className="parts-heading"><div><div className="panel-kicker">02 / LISTA FORMATEK</div><h2>Elementy do wycięcia</h2></div><span className="count-pill">{parts.reduce((s,p)=>s+p.quantity,0)} szt.</span></div>
            <div className="parts-list">{parts.map((part, index) => <div className="part-card" key={part.id}><div className="part-card-top"><span className="part-index">{String(index+1).padStart(2,'0')}</span><input className="part-name" placeholder="Nazwa formatki" value={part.name} onChange={e => updatePart(part.id,{name:e.target.value})}/><button className="icon-btn danger" aria-label="Usuń formatkę" onClick={() => setParts(p => p.filter(x => x.id !== part.id))}><Trash2 size={15}/></button></div><div className="part-dimensions"><NumberField label="DŁUGOŚĆ" value={part.length} onChange={v => updatePart(part.id,{length:v})}/><span className="dimension-x">×</span><NumberField label="SZEROKOŚĆ" value={part.width} onChange={v => updatePart(part.id,{width:v})}/><NumberField label="ILOŚĆ" value={part.quantity} min={1} onChange={v => updatePart(part.id,{quantity:Math.max(1,Math.floor(v))})}/></div>
              {material === 'furniture' && <div className="edge-select"><div className="edge-title">OKLEJANIE KRAWĘDZI</div><div className="edge-buttons">{(['top','right','bottom','left'] as const).map(edge => <button key={edge} className={part.edges[edge] ? 'edge-on' : ''} onClick={() => updateEdge(part.id,edge,!part.edges[edge])}>{({top:'GÓRA',right:'PRAWA',bottom:'DÓŁ',left:'LEWA'})[edge]} {part.edges[edge] && <Check size={11}/>}</button>)}</div></div>}
            </div>)}</div>
            <button className="add-part-btn" onClick={() => setParts(p => [...p,newPart()])}><Plus size={16}/> Dodaj formatkę</button>
            <button className="calculate-btn" onClick={() => document.getElementById('result')?.scrollIntoView({behavior:'smooth'})}>Przelicz rozkrój <ArrowRight size={17}/></button>
          </section>

          <section className="panel result-panel" id="result">
            <div className="panel-head"><div><div className="panel-kicker">03 / WYNIK OPTYMALIZACJI</div><h2>Plan rozkroju</h2></div><span className="live-tag"><span/> LIVE</span></div>
            <div className="stats-grid"><Stat value={String(plan.boards.length).padStart(2,'0')} label="PŁYTY"/><Stat value={`${plan.placedParts}/${plan.totalParts}`} label="FORMATKI"/><Stat value={`${(100-plan.wastePercent).toFixed(1)}%`} label="WYKORZYSTANIE"/></div>
            {plan.boards.length ? <div className="layouts">{plan.boards.map(layout => <div className="layout-card" key={layout.index}><div className="layout-title"><b>PŁYTA {String(layout.index).padStart(2,'0')}</b><span>{layout.parts.length} elementów</span></div><BoardDrawing layout={layout} /></div>)}</div> : <div className="empty-state"><div className="empty-icon"><Layers3 size={24}/></div><b>Dodaj formatki, aby zobaczyć rozkrój</b><span>Wizualizacja pojawi się tutaj automatycznie.</span></div>}
            {plan.unplaced.length > 0 && <div className="warning-note"><X size={16}/><div><b>Nie wszystkie elementy mieszczą się na płycie</b><span>{plan.unplaced.length} szt. poza wymiarem materiału. Sprawdź długość i szerokość formatek.</span></div></div>}
            <div className="legend"><span><i className="legend-part"/> Formatka</span><span><i className="legend-edge"/> Krawędź do oklejenia</span><span><i className="legend-kerf"/> Rzaz {kerf} mm</span></div>
            <div className="result-foot"><span>ALGORYTM: GUILLOTINE / FIXED GRAIN</span><span>WYMIAR PŁYTY: {board.width} × {board.height} MM</span></div>
            <button className="outline-btn full" onClick={exportProject}><ArrowDownToLine size={16}/> Eksportuj projekt JSON</button>
          </section>
        </div>
      </> : <>
        <section className="page-heading"><div><div className="eyebrow">QUICK CUT CALCULATOR</div><h1>Cięcie na <span>kawałki.</span></h1><p>Podziel deskę, listwę lub profil na równe odcinki z uwzględnieniem rzazu.</p></div><div className="heading-icon"><Scissors size={28}/></div></section>
        <div className="equal-layout"><section className="panel equal-panel"><div className="panel-head"><div><div className="panel-kicker">01 / PARAMETRY MATERIAŁU</div><h2>Ustawienia cięcia</h2></div><span className="step-number">01</span></div><div className="equal-fields"><NumberField label="DŁUGOŚĆ CAŁKOWITA" value={cutLength} onChange={setCutLength} suffix="mm"/><NumberField label="LICZBA KAWAŁKÓW" value={cutCount} min={1} onChange={v => setCutCount(Math.max(1,Math.floor(v)))}/><NumberField label="RZAZ TARCZY" value={cutKerf} min={0} step={0.1} onChange={setCutKerf} suffix="mm"/></div><div className="info-note"><CircleHelp size={16}/><span>Liczba cięć wynosi zawsze o jedno mniej niż liczba gotowych kawałków. Każdy rzaz pomniejsza dostępną długość.</span></div></section>
          <section className="panel equal-result"><div className="panel-kicker">02 / WYNIK</div><div className="equal-result-label">DŁUGOŚĆ JEDNEGO KAWAŁKA</div><div className="equal-big">{equalResult ? equalResult.pieceLength.toFixed(2).replace('.',',') : '—'}<small>mm</small></div><div className="cut-visual">{Array.from({length:Math.min(12,Math.max(1,cutCount))},(_,i)=><div key={i} className="cut-piece"><span>{i+1}</span></div>)}</div><div className="equal-breakdown"><div><span>Gotowe kawałki</span><b>{cutCount} szt.</b></div><div><span>Liczba cięć</span><b>{equalResult?.totalCuts ?? '—'}</b></div><div><span>Łączna strata na rzaz</span><b>{equalResult ? `${equalResult.kerfLoss.toFixed(1)} mm` : '—'}</b></div><div><span>Długość wykorzystana</span><b>{equalResult ? `${(cutLength).toFixed(1)} mm` : '—'}</b></div></div>{!equalResult && <div className="warning-note">Sprawdź parametry — materiał musi być dłuższy niż suma rzazów.</div>}</section></div>
      </>}
      <footer className="footer"><span>LEBERCUT © 2026</span><span>MADE FOR THE WORKSHOP <b>◆</b></span></footer>
    </main>
  </div>;
}

function NumberField({label,value,onChange,min=1,step=1,suffix='mm'}:{label:string;value:number;onChange:(v:number)=>void;min?:number;step?:number;suffix?:string}) { return <div className="number-field"><label>{label}</label><div className="number-control"><input type="number" min={min} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/><span>{suffix}</span></div></div>; }
function Stat({value,label}:{value:string;label:string}) { return <div className="stat"><b>{value}</b><span>{label}</span></div>; }
function BoardDrawing({layout}:{layout:ReturnType<typeof optimizeCut>['boards'][number]}) { const scale = 420/layout.width; return <svg className="board-svg" viewBox={`-8 -8 ${layout.width*scale+16} ${layout.height*scale+16}`} role="img" aria-label={`Rozkrój płyty ${layout.index}`}><rect x="0" y="0" width={layout.width*scale} height={layout.height*scale} rx="2" className="board-bg"/>{layout.parts.map((p,i)=><g key={p.part.id}><rect x={p.x*scale} y={p.y*scale} width={p.part.length*scale} height={p.part.width*scale} className="part-rect"/><text x={(p.x+p.part.length/2)*scale} y={(p.y+p.part.width/2)*scale} textAnchor="middle" dominantBaseline="middle" className="part-text">{p.part.name || `Element ${i+1}`}</text><text x={(p.x+p.part.length/2)*scale} y={(p.y+p.part.width/2)*scale+11} textAnchor="middle" dominantBaseline="middle" className="part-subtext">{p.part.length} × {p.part.width}</text>{p.part.edges.top&&<line x1={p.x*scale} y1={p.y*scale+1} x2={(p.x+p.part.length)*scale} y2={p.y*scale+1} className="edge-line"/>}{p.part.edges.bottom&&<line x1={p.x*scale} y1={(p.y+p.part.width)*scale-1} x2={(p.x+p.part.length)*scale} y2={(p.y+p.part.width)*scale-1} className="edge-line"/>}{p.part.edges.left&&<line x1={p.x*scale+1} y1={p.y*scale} x2={p.x*scale+1} y2={(p.y+p.part.width)*scale} className="edge-line"/ >}{p.part.edges.right&&<line x1={(p.x+p.part.length)*scale-1} y1={p.y*scale} x2={(p.x+p.part.length)*scale-1} y2={(p.y+p.part.width)*scale} className="edge-line"/>}</g>)}</svg>; }
export default App;
