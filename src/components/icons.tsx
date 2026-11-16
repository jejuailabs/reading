import type { CSSProperties } from "react";

const paths = {
  book: <><path d="M12 5c-3-2-7-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Z"/><path d="M12 5v15"/></>,
  map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/></>,
  library: <><path d="M3 4h4v16H3zM10 4h4v16h-4zM16 5l4-1 3 15-4 1z"/></>,
  question: <><path d="M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0Z"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4M12 16h.01"/></>,
  theater: <><path d="M3 3c4 2 7 2 11 0v8c0 5-5.5 8-5.5 8S3 16 3 11V3Z"/><path d="M16 8c2 0 4 0 6-1v8c0 3-3 6-5 7l-4-3M6 8h1m3 0h1M6 12c2 2 3 2 5 0M16 13h1m2 0h1"/></>,
  pencil: <><path d="m16 3 5 5L8 21H3v-5L16 3Z"/><path d="m13 6 5 5"/></>,
  folder: <path d="M3 5h6l2 3h10v12H3V5Z"/>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  back: <><path d="M20 12H4m6-6-6 6 6 6"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/></>,
  moon: <path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>,
  headphones: <><path d="M3 15v-4a9 9 0 0 1 18 0v4M3 13h4v8H3zM17 13h4v8h-4z"/></>,
  print: <><path d="M6 8V2h12v6M6 17H3V8h18v9h-3M6 14h12v8H6z"/><path d="M17 11h1"/></>,
  check: <path d="m5 12 4 4L20 5"/>,
  plus: <path d="M12 4v16M4 12h16"/>,
  search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
  settings: <><path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/></>,
  users: <><circle cx="9" cy="7" r="4"/><path d="M2 22v-3a7 7 0 0 1 14 0v3M17 3a4 4 0 0 1 0 8m2 3c3 1 3 4 3 8"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
  leaf: <><path d="M20 3C8 2 1 9 5 16s16 1 15-13Z"/><path d="m3 21 12-12"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  list: <><path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/></>,
  shield: <><path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/></>,
  close: <path d="m5 5 14 14M5 19 19 5"/>,
  play: <path d="m8 4 13 8-13 8V4Z"/>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2"/>,
  sparkle: <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
};
export type IconName = keyof typeof paths;
const drawings:Partial<Record<IconName,string>> = {
  book:"reader",map:"journey",library:"library",question:"question",theater:"theater",
  pencil:"studio",folder:"records",headphones:"listen",print:"print",users:"team",
  settings:"classroom",sparkle:"ideas",leaf:"home",
};
export function Icon({name, size = 20, className, style}: {name: IconName; size?: number; className?: string; style?: CSSProperties}) {
  const drawing=drawings[name];
  if(drawing)return <img src={`/illustrations/icons-v1/${drawing}.webp`} width={size} height={size} alt="" aria-hidden="true" className={["illustrated-icon",className].filter(Boolean).join(" ")} style={style}/>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}

export function BookToolIcon({name,size=28}:{name:"bookmark"|"upload"|"pdf";size?:number}) {
  return <img src={`/illustrations/icons-v1/${name}.webp`} width={size} height={size} alt="" aria-hidden="true" className="illustrated-icon"/>;
}
