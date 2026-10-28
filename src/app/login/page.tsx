"use client";

import { useState } from "react";
import { Wordmark, Eyebrow, VerseText } from "@/components/atoms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Honour ?next= set by the auth guard, but only for in-app paths.
    const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  }

  const bismillahHtml = `بِسۡمِ <rule class=ham_wasl>ٱ</rule>للَّهِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>رَّحۡمَ<rule class=madda_normal>ـٰ</rule>نِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>رَّح<rule class=madda_permissible>ِي</rule>مِ ١`;

  return (
    <div className="hh-split hh-split--even">
      {/* Left — form */}
      <div className="hh-split__main">
        <Link href="/" style={{ textDecoration: "none" }}>
          <Wordmark size={16} />
        </Link>

        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 340,
          }}
        >
          <Eyebrow>Welcome back</Eyebrow>
          <h1 className="hh-display hh-auth-title" style={{ margin: "14px 0 6px" }}>
            <span style={{ fontStyle: "italic" }}>As-salāmu</span> ʿalaykum.
          </h1>
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: 13,
              margin: "0 0 32px",
            }}
          >
            Continue where you left off.
          </p>

          <form onSubmit={handleSubmit}>
            <label
              style={{
                fontSize: 11.5,
                color: "var(--ink-2)",
                marginBottom: 6,
                letterSpacing: "0.02em",
                display: "block",
              }}
            >
              Email
            </label>
            <input
              className="hh-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ marginBottom: 18 }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <label
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-2)",
                  letterSpacing: "0.02em",
                }}
              >
                Password
              </label>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ink-2)",
                  cursor: "pointer",
                }}
              >
                Forgot?
              </span>
            </div>
            <input
              className="hh-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ marginBottom: 28 }}
            />

            {error && (
              <p
                style={{
                  color: "var(--fail)",
                  fontSize: 12,
                  margin: "0 0 16px",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="hh-btn primary lg"
              disabled={loading}
              style={{ justifyContent: "center", width: "100%" }}
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>

          <p
            style={{
              margin: "36px 0 0",
              fontSize: 11.5,
              color: "var(--ink-2)",
            }}
          >
            New here?{" "}
            <Link
              href="/signup"
              style={{
                color: "var(--ink-0)",
                fontWeight: 500,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Create an account
            </Link>
          </p>
        </div>

        <div
          style={{
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          By continuing you accept our terms and privacy notice.
        </div>
      </div>

      {/* Right — quiet verse */}
      <div className="hh-split__aside" style={{ alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <VerseText
            html={bismillahHtml}
            className="hh-verse-hero"
            style={{ textAlign: "center" }}
          />
          <div
            className="hh-serif"
            style={{
              marginTop: 28,
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-1)",
            }}
          >
            In the name of Allah, the Most Gracious, the Most Merciful.
          </div>
        </div>
      </div>
    </div>
  );
}
