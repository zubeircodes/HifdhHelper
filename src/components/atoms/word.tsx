// Word — single Arabic token with optional tajweed tinting.

export interface Token {
  a: string;
  t?: string; // tajweed key: "ghunnah" | "madda-2" | "ikhfa" | etc.
}

interface WordProps {
  token: Token;
  size?: number;
}

export function Word({ token, size }: WordProps) {
  const color = token.t ? `var(--tj-${token.t})` : "var(--ink-0)";
  return (
    <span style={{ color, fontSize: size }}>
      {token.a}
    </span>
  );
}
