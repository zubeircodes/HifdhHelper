// VerseText — renders a verse exactly like the old app.
// Injects the raw HTML from the Quran JSON (with <rule> tags)
// into a div with the .hh-arabic class so Arabic renders as
// one continuous connected block with proper ligatures.

interface VerseTextProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

export function VerseText({ html, className, style }: VerseTextProps) {
  return (
    <div
      className={`hh-arabic ${className || ""}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
