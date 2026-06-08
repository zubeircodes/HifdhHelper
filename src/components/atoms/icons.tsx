// Hifdh Helper — 8 line icons. 1.25px stroke, used sparingly.
// Only in: nav crumbs, player transport, search, selection checks, "New" buttons.

interface IcoProps {
  s?: number;
}

export function IcoBack({ s = 14 }: IcoProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{ flex: "0 0 auto" }}>
      <path d="M10 3 L5 8 L10 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IcoFwd({ s = 14 }: IcoProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{ flex: "0 0 auto" }}>
      <path d="M6 3 L11 8 L6 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IcoPlay({ s = 14 }: IcoProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" style={{ flex: "0 0 auto" }}>
      <path d="M5 3 L13 8 L5 13 Z" />
    </svg>
  );
}

export function IcoPause({ s = 14 }: IcoProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" style={{ flex: "0 0 auto" }}>
      <rect x="4" y="3" width="3" height="10" />
      <rect x="9" y="3" width="3" height="10" />
    </svg>
  );
}

export function IcoSearch({ s = 14 }: IcoProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{ flex: "0 0 auto" }}>
      <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.25" />
      <path d="M10 10 L13 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IcoPlus({ s = 14 }: IcoProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{ flex: "0 0 auto" }}>
      <path d="M8 3 L8 13 M3 8 L13 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IcoCheck({ s = 12 }: IcoProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flex: "0 0 auto" }}>
      <path d="M2.5 6.5 L4.8 8.8 L9.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IcoMore({ s = 14 }: IcoProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" style={{ flex: "0 0 auto" }}>
      <circle cx="3" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="13" cy="8" r="1" />
    </svg>
  );
}
