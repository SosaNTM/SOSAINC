import { useState, useEffect, useRef, useCallback } from "react";
import { fmtEurShort } from "@/lib/financialCalculations";

interface BlockDef {
  id: string; label: string; value: number; color: string;
  type: "main" | "sub"; margin?: number; scrollTo?: string; highlights?: string[];
}

interface FormulaProps {
  totalRevenue: number; directCosts: number; grossProfit: number; grossMargin: number;
  indirectCosts: number; ebit: number; ebitMargin: number; taxes: number; taxRate: number;
  netProfit: number; netMargin: number;
}

function AnimatedValue({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef(0);
  const fromRef = useRef(0);
  useEffect(() => {
    fromRef.current = display; startRef.current = performance.now();
    const duration = 600;
    const tick = (now: number) => {
      const t = Math.min((now - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);
  return <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{fmtEurShort(Math.round(display))}</span>;
}

function Connector({ isMinus, vertical }: { isMinus?: boolean; vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="flex justify-center py-1">
        <div className="relative flex flex-col items-center">
          <div style={{ width: 1, height: 20, background: "var(--divider-strong)" }} />
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: "var(--surface-hover)", border: "0.5px solid var(--divider-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isMinus && <span style={{ fontSize: 7, color: "var(--text-quaternary)", lineHeight: 1, marginTop: -1 }}>−</span>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex items-center" style={{ width: 16, flexShrink: 0 }}>
      <div style={{ width: "100%", height: 1, background: "var(--divider-strong)" }} />
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 6, height: 6, borderRadius: "50%", background: "var(--surface-hover)", border: "0.5px solid var(--divider-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isMinus && <span style={{ fontSize: 7, color: "var(--text-quaternary)", lineHeight: 1, marginTop: -1 }}>−</span>}
      </div>
    </div>
  );
}

function MainBlock({ block, index, hoveredId, onHover, onClick }: { block: BlockDef; index: number; hoveredId: string | null; onHover: (id: string | null) => void; onClick: (id: string) => void; }) {
  const isHighlighted = hoveredId === block.id || (hoveredId && block.highlights?.includes(hoveredId));
  const isDimmed = hoveredId && !isHighlighted && hoveredId !== block.id;
  return (
    <div className="cursor-pointer transition-all duration-300" style={{
      padding: "16px 18px", background: "var(--glass-bg-active)", backdropFilter: "var(--glass-blur-light)",
      borderRadius: "var(--radius-xl)", border: "0.5px solid var(--glass-border)",
      boxShadow: "var(--glass-shadow)", opacity: isDimmed ? 0.4 : 1, transform: isHighlighted ? "scale(1.03)" : "scale(1)",
      animation: `plBlockIn 0.4s ${index * 0.08}s both ease-out`, textAlign: "center", whiteSpace: "nowrap",
    }} onMouseEnter={() => onHover(block.id)} onMouseLeave={() => onHover(null)} onClick={() => onClick(block.id)}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: block.color, opacity: 0.5, marginBottom: 5 }}>{block.label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}><AnimatedValue value={block.value} color="var(--text-primary)" /></div>
      {block.margin !== undefined && <div style={{ fontSize: 11, fontWeight: 500, color: block.color, opacity: 0.6, marginTop: 3 }}>{block.margin.toFixed(1)}% margin</div>}
    </div>
  );
}

function SubBlock({ block, index, hoveredId, onHover, onClick }: { block: BlockDef; index: number; hoveredId: string | null; onHover: (id: string | null) => void; onClick: (id: string) => void; }) {
  const isDimmed = hoveredId && hoveredId !== block.id;
  const isSelfHovered = hoveredId === block.id;
  return (
    <div className="cursor-pointer transition-all duration-300" style={{
      padding: "12px 14px", background: isSelfHovered ? "var(--glass-bg-hover)" : "var(--glass-bg-subtle)",
      borderRadius: "var(--radius-lg)", border: "0.5px dashed var(--glass-border)",
      opacity: isDimmed ? 0.4 : isSelfHovered ? 0.6 : 1, animation: `plBlockIn 0.4s ${index * 0.08}s both ease-out`,
      textAlign: "center", whiteSpace: "nowrap",
    }} onMouseEnter={() => onHover(block.id)} onMouseLeave={() => onHover(null)} onClick={() => onClick(block.id)}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-quaternary)", marginBottom: 3 }}>− {block.label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: block.color, opacity: 0.8 }}><AnimatedValue value={block.value} color={block.color} /></div>
    </div>
  );
}

function ScaledRow({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const outer = outerRef.current; const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const availableWidth = outer.clientWidth; const contentWidth = inner.scrollWidth;
      setScale(contentWidth > availableWidth ? Math.max(0.55, availableWidth / contentWidth) : 1);
    };
    const ro = new ResizeObserver(update); ro.observe(outer); ro.observe(inner); update();
    const t = setTimeout(update, 500);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);
  return (
    <div ref={outerRef} style={{ width: "100%", overflow: "hidden" }}>
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.3s ease", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", gap: 6, width: "max-content", margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

export function PLFormulaFlow(props: FormulaProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const blocks: BlockDef[] = [
    { id: "revenue", label: "Revenue", value: props.totalRevenue, color: "var(--chart-emerald)", type: "main", scrollTo: "section-revenue", highlights: [] },
    { id: "cogs", label: "COGS", value: props.directCosts, color: "var(--chart-orange)", type: "sub", scrollTo: "section-cogs", highlights: [] },
    { id: "gross-profit", label: "Gross Profit", value: props.grossProfit, color: "var(--chart-emerald)", type: "main", margin: props.grossMargin, scrollTo: "section-cogs", highlights: ["revenue", "cogs"] },
    { id: "opex", label: "OPEX", value: props.indirectCosts, color: "var(--chart-amber)", type: "sub", scrollTo: "section-opex", highlights: [] },
    { id: "ebit", label: "EBIT", value: props.ebit, color: "var(--chart-blue)", type: "main", margin: props.ebitMargin, scrollTo: "section-opex", highlights: ["revenue", "cogs", "gross-profit", "opex"] },
    { id: "tax", label: `Tax ${props.taxRate}%`, value: props.taxes, color: "var(--chart-rose)", type: "sub", scrollTo: "section-tax", highlights: [] },
    { id: "net-profit", label: "Net Profit", value: props.netProfit, color: "var(--chart-violet)", type: "main", margin: props.netMargin, scrollTo: "section-tax", highlights: ["revenue", "cogs", "gross-profit", "opex", "ebit", "tax"] },
  ];

  const handleClick = useCallback((id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block?.scrollTo) document.getElementById(block.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const renderBlock = (block: BlockDef, idx: number) => {
    const Component = block.type === "main" ? MainBlock : SubBlock;
    return <Component key={block.id} block={block} index={idx} hoveredId={hoveredId} onHover={setHoveredId} onClick={handleClick} />;
  };

  const isSubNext = (idx: number) => blocks[idx + 1]?.type === "sub";

  return (
    <div className="glass-card" style={{ padding: "32px 40px", width: "100%", boxSizing: "border-box", overflow: "visible", cursor: "default" }}>
      <div className="hidden lg:block">
        <ScaledRow>
          {blocks.map((block, i) => (
            <div key={block.id} className="flex items-center" style={{ gap: 6 }}>
              {renderBlock(block, i)}
              {i < blocks.length - 1 && <Connector isMinus={isSubNext(i)} />}
            </div>
          ))}
        </ScaledRow>
      </div>
      <div className="hidden md:flex lg:hidden flex-col items-center gap-4">
        <ScaledRow>{blocks.slice(0, 3).map((block, i) => (<div key={block.id} className="flex items-center" style={{ gap: 6 }}>{renderBlock(block, i)}{i < 2 && <Connector isMinus={i === 0} />}</div>))}</ScaledRow>
        <Connector vertical isMinus={false} />
        <ScaledRow>{blocks.slice(3).map((block, i) => (<div key={block.id} className="flex items-center" style={{ gap: 6 }}>{renderBlock(block, i + 3)}{i < blocks.slice(3).length - 1 && <Connector isMinus={blocks.slice(3)[i + 1]?.type === "sub"} />}</div>))}</ScaledRow>
      </div>
      <div className="flex md:hidden flex-col items-center gap-0">
        {blocks.map((block, i) => (<div key={block.id} className="flex flex-col items-center w-full"><div className="w-full">{renderBlock(block, i)}</div>{i < blocks.length - 1 && <Connector vertical isMinus={isSubNext(i)} />}</div>))}
      </div>
    </div>
  );
}
