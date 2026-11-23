import type { BoardLayout, BoardSpec, CutPlan, Material } from './engine/types';

type Props = { plan: CutPlan; board: BoardSpec; material: Material; kerf: number; projectName: string };
const nominalSize = (material: Material, board: BoardSpec) => material === 'furniture'
  ? { width: 2800, height: 2070 } : material === 'osb'
  ? { width: 2500, height: 1250 } : { width: board.width, height: board.height };
const materialName = (material: Material) => material === 'furniture' ? 'Płyta meblowa' : material === 'osb' ? 'OSB' : 'Materiał własny';

function Brand() {
  return <div className="print-brand"><div className="print-brand-mark">L</div><div>
    <div className="print-brand-name">LEBERCUT</div><div className="print-brand-tagline">MĄDRE CIĘCIE TEŻ ZAJĘCIE</div>
  </div></div>;
}

function BoardSvg({ layout }: { layout: BoardLayout }) {
  const width = 1000, scale = width / layout.width, height = layout.height * scale;
  return <svg className="print-board-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Schemat płyty ${layout.index}`}>
    <rect width={width} height={height} fill="white" stroke="#111" strokeWidth="2"/>
    {layout.parts.map((item, i) => {
      const x = item.x * scale, y = item.y * scale, w = item.part.length * scale, h = item.part.width * scale;
      const edge = item.part.edges;
      return <g key={`${item.part.id}-${i}`}>
        <rect x={x} y={y} width={w} height={h} fill="#f1f1f1" stroke="#222" strokeWidth="1.5"/>
        {edge.top && <line x1={x} y1={y+2} x2={x+w} y2={y+2} stroke="#111" strokeWidth="5"/>}
        {edge.right && <line x1={x+w-2} y1={y} x2={x+w-2} y2={y+h} stroke="#111" strokeWidth="5"/>}
        {edge.bottom && <line x1={x} y1={y+h-2} x2={x+w} y2={y+h-2} stroke="#111" strokeWidth="5"/>}
        {edge.left && <line x1={x+2} y1={y} x2={x+2} y2={y+h} stroke="#111" strokeWidth="5"/>}
        {w > 75 && h > 35 && <>
          <text x={x+w/2} y={y+h/2-7} textAnchor="middle" className="print-svg-name">{(item.part.name || `Element ${i+1}`).slice(0,28)}</text>
          <text x={x+w/2} y={y+h/2+13} textAnchor="middle" className="print-svg-dims">{item.part.length} × {item.part.width} mm</text>
        </>}
      </g>;
    })}
    <g transform={`translate(${width-30},${Math.max(40,height*.12)})`}>
      <path d="M-24 0 H16 M16 0 L4 -9 M16 0 L4 9" stroke="#111" strokeWidth="3" fill="none"/>
      <text x="-2" y="22" textAnchor="middle" className="print-svg-grain">SŁOJE</text>
    </g>
  </svg>;
}

function PartRows({ layout }: { layout: BoardLayout }) {
  return <tbody>{layout.parts.map((p,i) => {
    const edges = ([
      p.part.edges.top && 'góra', p.part.edges.right && 'prawa',
      p.part.edges.bottom && 'dół', p.part.edges.left && 'lewa'
    ].filter(Boolean) as string[]);
    return <tr key={`${p.part.id}-${i}`}><td>{p.part.name || `Element ${i+1}`}</td>
      <td>{p.part.length} mm</td><td>{p.part.width} mm</td><td>{edges.length ? edges.join(', ') : '—'}</td></tr>;
  })}</tbody>;
}

export default function PrintReport({ plan, board, material, kerf, projectName }: Props) {
  const nominal = nominalSize(material, board);
  const totalArea = plan.boards.reduce((s,b) => s+b.width*b.height, 0);
  const usedArea = plan.boards.reduce((s,b) => s+b.usedArea, 0);
  const utilization = totalArea ? usedArea/totalArea*100 : 0;
  const grouped = new Map<string,{name:string;length:number;width:number;quantity:number}>();
  for (const layout of plan.boards) for (const placed of layout.parts) {
    const key = `${placed.part.name}|${placed.part.length}|${placed.part.width}`;
    const old = grouped.get(key);
    if (old) old.quantity++;
    else grouped.set(key,{name:placed.part.name,length:placed.part.length,width:placed.part.width,quantity:1});
  }
  return <section className="print-report">
    {plan.boards.map(layout => {
      const waste = Math.max(0,100-layout.usedArea/(layout.width*layout.height)*100);
      return <article className="print-board-page" key={layout.index}>
        <Brand/>
        <div className="print-report-heading"><div><div className="print-overline">KARTA TECHNOLOGICZNA ROZKROJU</div><h1>{projectName || 'Nowy projekt'}</h1></div><b className="print-board-number">PŁYTA {String(layout.index).padStart(2,'0')}</b></div>
        <div className="print-spec-grid">
          <div><span>Materiał</span><b>{materialName(material)}</b></div>
          <div><span>Wymiar nominalny</span><b>{nominal.width} × {nominal.height} mm</b></div>
          <div><span>Pole robocze</span><b>{board.width} × {board.height} mm</b></div>
          <div><span>Rzaz tarczy</span><b>{kerf.toLocaleString('pl-PL')} mm</b></div>
        </div>
        <div className="print-diagram-title"><b>SCHEMAT ROZKROJU</b><span>Wymiary w mm · Bez obrotu formatek</span></div>
        <div className="print-diagram"><BoardSvg layout={layout}/></div>
        <div className="print-drawing-legend"><span><i className="print-edge-sample"/> Krawędź do oklejenia</span><span><b>↑</b> Kierunek słojów</span><span>Puste pole = odpad</span></div>
        <div className="print-table-heading">ELEMENTY NA PŁYCIE ({layout.parts.length} szt.)</div>
        <table className="print-parts-table"><thead><tr><th>Element</th><th>Długość</th><th>Szerokość</th><th>Okleinowanie</th></tr></thead><PartRows layout={layout}/></table>
        <div className="print-board-summary"><div><span>Powierzchnia wykorzystana</span><b>{(layout.usedArea/1e6).toFixed(3)} m²</b></div><div><span>Odpad powierzchniowy</span><b>{waste.toFixed(1)}%</b></div></div>
        {plan.unplaced.length>0 && <p className="print-warning">UWAGA: {plan.unplaced.length} elementów nie zmieściło się w planie. Sprawdź zestawienie końcowe.</p>}
        <footer className="print-page-footer"><b>LEBERCUT · MĄDRE CIĘCIE TEŻ ZAJĘCIE</b><span>Strona {layout.index} / {plan.boards.length+1}</span></footer>
      </article>;
    })}
    <article className="print-board-page print-summary-page">
      <Brand/>
      <div className="print-report-heading"><div><div className="print-overline">ZESTAWIENIE KOŃCOWE</div><h1>{projectName || 'Nowy projekt'}</h1></div><b className="print-board-number">PODSUMOWANIE</b></div>
      <div className="print-spec-grid">
        <div><span>Materiał</span><b>{materialName(material)}</b></div><div><span>Liczba płyt</span><b>{plan.boards.length} szt.</b></div>
        <div><span>Wykorzystanie łączne</span><b>{utilization.toFixed(1)}%</b></div><div><span>Formatki umieszczone</span><b>{plan.placedParts} / {plan.totalParts}</b></div>
      </div>
      <div className="print-table-heading">ZBIORCZE ZESTAWIENIE FORMATEK</div>
      <table className="print-parts-table"><thead><tr><th>Element</th><th>Długość</th><th>Szerokość</th><th>Ilość</th></tr></thead><tbody>
        {Array.from(grouped.values()).map((p,i)=><tr key={i}><td>{p.name || 'Bez nazwy'}</td><td>{p.length} mm</td><td>{p.width} mm</td><td>{p.quantity} szt.</td></tr>)}
      </tbody></table>
      {plan.unplaced.length>0 && <><div className="print-table-heading">ELEMENTY NIEUMIESZCZONE W ROZKROJU</div>
        <table className="print-parts-table"><thead><tr><th>Element</th><th>Długość</th><th>Szerokość</th><th>Ilość</th></tr></thead><tbody>
          {plan.unplaced.map((p,i)=><tr key={i}><td>{p.name || `Element ${i+1}`}</td><td>{p.length} mm</td><td>{p.width} mm</td><td>1 szt.</td></tr>)}
        </tbody></table></>}
      <p className="print-method-note">Wymiary robocze są wymiarami przekazywanymi do optymalizacji. Płyta meblowa: odjęto 20 mm z każdej krawędzi. OSB: bez korekty. Okleinowanie nie zmienia wymiarów formatki. Rzaz uwzględniany jest pomiędzy sąsiednimi elementami i pasami.</p>
      <footer className="print-page-footer"><b>LEBERCUT · MĄDRE CIĘCIE TEŻ ZAJĘCIE</b><span>Strona {plan.boards.length+1} / {plan.boards.length+1}</span></footer>
    </article>
  </section>;
}
