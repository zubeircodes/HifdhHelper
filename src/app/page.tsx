import { Wordmark, Eyebrow, VerseText } from "@/components/atoms";
import { eastern } from "@/components/atoms/verse-mark";
import { getVerseTextSync } from "@/lib/quran-text-server";
import Link from "next/link";

export default function Landing() {
  const verse6Html = getVerseTextSync(1, 6);

  return (
    <div className="hh-split">
      {/* Left — editorial column */}
      <div className="hh-split__main">
        {/* Nav */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ flex: "0 0 auto" }}>
            <Wordmark size={17} />
          </div>
          <nav className="hh-landing-nav-links">
            <span className="hh-landing-nav-secondary">For schools</span>
            <span className="hh-landing-nav-secondary">For families</span>
            <span className="hh-landing-nav-secondary">Pricing</span>
            <Link
              href="/login"
              style={{
                color: "var(--ink-0)",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </nav>
        </div>

        {/* Hero */}
        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 460,
            marginTop: -20,
          }}
        >
          <Eyebrow>A companion for the journey</Eyebrow>
          <h1 className="hh-display hh-hero-title">
            A quiet place
            <br />
            <span style={{ fontStyle: "italic", color: "var(--sage-deep)" }}>
              to memorize
            </span>{" "}
            the Qur&apos;an,
            <br />
            together.
          </h1>
          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.65,
              color: "var(--ink-1)",
              maxWidth: 380,
              margin: "0 0 32px",
            }}
          >
            Hifdh Helper joins teachers, students, and families around the same
            daily <em style={{ fontStyle: "italic" }}>sabaq</em>. Assign verses,
            listen back, and keep track of progress — without the noise of a
            dashboard.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href="/signup"
              className="hh-btn primary lg"
              style={{ textDecoration: "none" }}
            >
              Begin
            </Link>
          </div>

          {/* Stats */}
          <div className="hh-landing-stats">
            <span>
              <span style={{ color: "var(--ink-0)", fontWeight: 500 }}>
                2,400
              </span>{" "}
              students
            </span>
            <span>
              <span style={{ color: "var(--ink-0)", fontWeight: 500 }}>38</span>{" "}
              madāris
            </span>
            <span>
              <span style={{ color: "var(--ink-0)", fontWeight: 500 }}>14</span>{" "}
              reciters
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          Built with care · For your family or your madrasah
        </div>
      </div>

      {/* Right — single verse, mushaf-like */}
      <div className="hh-split__aside" style={{ alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <VerseText
            html={verse6Html}
            style={{ fontSize: 44, lineHeight: 2.0, textAlign: "center" }}
          />

          <div
            className="hh-serif"
            style={{
              margin: "36px auto 0",
              maxWidth: 320,
              textAlign: "center",
              fontSize: 15,
              fontStyle: "italic",
              color: "var(--ink-1)",
              lineHeight: 1.5,
            }}
          >
            &ldquo;Guide us to the straight path.&rdquo;
          </div>
          <div
            style={{
              margin: "10px auto 0",
              textAlign: "center",
              fontSize: 11,
              color: "var(--ink-2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Al-Fātiḥah · Verse 6
          </div>
        </div>
      </div>
    </div>
  );
}
