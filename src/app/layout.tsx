import type { Metadata, Viewport } from "next";
// Fonts are bundled from npm (@fontsource) rather than fetched from Google at
// build time, so a Google Fonts hiccup can't fail a deployment. Family names
// match what globals.css already uses.
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/newsreader/300.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/300-italic.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/newsreader/500-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/amiri-quran/arabic-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hifdh Helper",
  description:
    "A quiet place to memorize the Quran, together. For instructors, students, and families.",
};

export const viewport: Viewport = {
  themeColor: "#1f1c14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
