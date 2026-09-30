export type Vars = Record<string, string | number>;
type O = { over?: boolean }; // `over` items are drawn outside the panel clip, so they can break the frame
export type Item = O & (
  | { k: 'actor'; s: string; alt: string; x: number; b: number; h: number; from: Vars; to: Vars; at: number; d: number }
  | { k: 'sfx'; t: string; x: number; y: number; c: string; r: number; at: number }
  | { k: 'box'; t: string; x: number; y: number; w: number; at: number }
  | { k: 'type'; l: string[]; x: number; y: number; w: number; at: number; d: number; tone: 'green' | 'red' }
  | { k: 'title'; n: string; t: string }
  | { k: 'climb'; s: string; at: number; d: number }
  | { k: 'legend' }
  | { k: 'cta'; t: string }
);
export type Mark = { i: string; l: string; f: number };
export type PanelDef = { a: string; bg?: string; f?: [number, number]; z?: [number, number]; at: number; jag?: boolean; tone?: string; tint?: string; fx?: string; sh?: number; items: Item[] };
export type PageDef = { id: string; cols: string; rows: string; d: string; scroll: number; marks?: Mark[]; panels: PanelDef[] };
