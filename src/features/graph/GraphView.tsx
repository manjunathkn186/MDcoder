import { useEffect, useMemo, useRef, useState } from "react";
import { useIndex } from "@state/index.store";
import { useEditor } from "@state/editor.store";
import { fileCache } from "@/services/cache";
import { basename } from "@/services/fs";

interface Node {
  id: string;       // file path
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
}
interface Edge {
  source: string;
  target: string;
}

/**
 * Lightweight force-directed graph rendered to SVG.
 *
 * The simulation is intentionally minimal — Verlet-style integration with
 * constant repulsion + spring attraction — running for a fixed number of
 * iterations before idling. This avoids a heavy dependency on d3-force and
 * keeps memory predictable on large vaults (we cap the rendered subgraph at
 * the current document's 2-hop neighborhood).
 */
const RADIUS = 280;
const ITERATIONS = 180;

export function GraphView(): JSX.Element {
  const filesMap = useIndex((s) => s.files);
  const titleToPath = useIndex((s) => s.titleToPath);
  const activeId = useEditor((s) => s.activeId);
  const [hover, setHover] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { nodes, edges } = useMemo(
    () => buildSubgraph(filesMap, titleToPath, activeId),
    [filesMap, titleToPath, activeId],
  );

  useEffect(() => {
    if (nodes.length === 0) return;
    simulate(nodes, edges, ITERATIONS);
  }, [nodes, edges]);

  const open = async (path: string) => {
    try {
      const content = await fileCache.read(path);
      useEditor.getState().openDoc({
        id: path,
        path,
        title: basename(path),
        content,
      });
    } catch {
      /* ignored */
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
        Open a note with <code>[[wikilinks]]</code> to explore its graph.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Graph
      </div>
      <div className="relative flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`-${RADIUS} -${RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
          className="h-full w-full"
        >
          <g>
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.source);
              const b = nodes.find((n) => n.id === e.target);
              if (!a || !b) return null;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="currentColor"
                  strokeOpacity={hover && hover !== a.id && hover !== b.id ? 0.1 : 0.35}
                  strokeWidth={0.7}
                  className="text-muted"
                />
              );
            })}
          </g>
          <g>
            {nodes.map((n) => {
              const r = 3 + Math.min(8, n.degree);
              const isActive = activeId === n.id;
              const isHover = hover === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => void open(n.id)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={r}
                    className={isActive ? "fill-accent" : "fill-fg"}
                    fillOpacity={isHover || isActive ? 1 : 0.75}
                  />
                  {(isHover || isActive) && (
                    <text
                      x={r + 4}
                      y={3}
                      className="fill-fg"
                      fontSize="9"
                      style={{ paintOrder: "stroke", stroke: "var(--color-bg)", strokeWidth: 3 }}
                    >
                      {n.title}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

function buildSubgraph(
  files: Map<string, { path: string; title: string; outgoing: string[] }>,
  titleToPath: Map<string, string>,
  focusPath: string | null,
): { nodes: Node[]; edges: Edge[] } {
  if (files.size === 0) return { nodes: [], edges: [] };

  const resolve = (target: string) => titleToPath.get(target.toLowerCase()) ?? null;

  // 2-hop neighborhood around the focus (or the whole graph if no focus).
  let scope: Set<string>;
  if (focusPath && files.has(focusPath)) {
    scope = new Set<string>([focusPath]);
    const expand = (path: string) => {
      const meta = files.get(path);
      if (!meta) return;
      for (const t of meta.outgoing) {
        const r = resolve(t);
        if (r) scope.add(r);
      }
    };
    expand(focusPath);
    const neighbors = Array.from(scope);
    for (const p of neighbors) expand(p);
    if (scope.size > 80) {
      scope = new Set(Array.from(scope).slice(0, 80));
      scope.add(focusPath);
    }
  } else {
    scope = new Set(Array.from(files.keys()).slice(0, 80));
  }

  const nodeIds = Array.from(scope);
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  for (const id of nodeIds) {
    const meta = files.get(id);
    if (!meta) continue;
    for (const t of meta.outgoing) {
      const r = resolve(t);
      if (r && scope.has(r) && r !== id) {
        const key = `${id}→${r}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: id, target: r });
        }
      }
    }
  }

  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const nodes: Node[] = nodeIds.map((id, i) => {
    const angle = (i / nodeIds.length) * Math.PI * 2;
    return {
      id,
      title: files.get(id)?.title ?? basename(id),
      x: Math.cos(angle) * RADIUS * 0.6,
      y: Math.sin(angle) * RADIUS * 0.6,
      vx: 0,
      vy: 0,
      degree: degree.get(id) ?? 0,
    };
  });

  return { nodes, edges };
}

function simulate(nodes: Node[], edges: Edge[], iterations: number): void {
  const index = new Map(nodes.map((n) => [n.id, n] as const));
  const REPULSION = 1200;
  const SPRING = 0.02;
  const REST = 60;
  const DAMP = 0.82;
  const MAX = RADIUS - 16;

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy + 0.01;
        const f = REPULSION / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }
    for (const e of edges) {
      const a = index.get(e.source)!;
      const b = index.get(e.target)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = (d - REST) * SPRING;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
    for (const n of nodes) {
      n.vx *= DAMP;
      n.vy *= DAMP;
      n.x += n.vx;
      n.y += n.vy;
      const r = Math.sqrt(n.x * n.x + n.y * n.y);
      if (r > MAX) {
        n.x = (n.x / r) * MAX;
        n.y = (n.y / r) * MAX;
      }
    }
  }
}
