"use client";

import { useState } from "react";
import { Wordmark, Eyebrow, IcoCheck } from "@/components/atoms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const roles = [
  {
    id: "student",
    title: "Student",
    body: "I'm memorizing — I want my lessons in one place.",
    footer: "Join with the code from your teacher.",
    disabled: false,
  },
  {
    id: "instructor",
    title: "Instructor",
    body: "I teach hifdh — for a class, halaqah, or madrasah.",
    footer: "Add classes, assign lessons, track progress.",
    disabled: false,
  },
];

export default function Signup() {
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState("instructor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          role_intent: picked,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setConfirmEmail(true);
  }

  return (
    <div
      className="hh-signup-page"
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--paper-1)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Wordmark size={16} />
        </Link>
        <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--ink-0)",
              fontWeight: 500,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Sign in
          </Link>
        </span>
      </div>

      {confirmEmail ? (
        /* Email confirmation screen */
        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 440,
            margin: "0 auto",
            textAlign: "center",
            padding: "56px 0",
          }}
        >
          <Eyebrow>Almost there</Eyebrow>
          <h1
            className="hh-display hh-auth-title"
            style={{ margin: "14px 0 16px" }}
          >
            Check your email
          </h1>
          <p
            style={{
              color: "var(--ink-1)",
              fontSize: 14,
              lineHeight: 1.65,
              margin: "0 0 8px",
            }}
          >
            We sent a confirmation link to{" "}
            <strong style={{ fontWeight: 500, color: "var(--ink-0)" }}>{email}</strong>.
          </p>
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: 13,
              lineHeight: 1.6,
              margin: "0 0 36px",
            }}
          >
            Click the link in the email to verify your account, then come back here to sign in.
          </p>
          <Link
            href="/login"
            className="hh-btn primary lg"
            style={{ textDecoration: "none", alignSelf: "center" }}
          >
            Go to sign in
          </Link>
          <p
            style={{
              marginTop: 24,
              fontSize: 11.5,
              color: "var(--ink-3)",
            }}
          >
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </div>
      ) : step === 1 ? (
        /* Step 1: Role selection */
        <>
          <div style={{ maxWidth: 560, margin: "56px 0 0" }}>
            <Eyebrow>Step 1 of 2</Eyebrow>
            <h1
              className="hh-display hh-auth-title"
              style={{ margin: "14px 0 12px" }}
            >
              Who&apos;s joining today?
            </h1>
            <p
              style={{
                color: "var(--ink-1)",
                fontSize: 14,
                lineHeight: 1.6,
                margin: "0 0 36px",
              }}
            >
              Pick the role that fits you best — you can change this later.
            </p>
          </div>

          <div className="hh-role-grid">
            {roles.map((r) => {
              const sel = picked === r.id;
              const disabled = r.disabled;
              return (
                <div
                  key={r.id}
                  onClick={() => !disabled && setPicked(r.id)}
                  className={`hh-role-card${disabled ? " disabled" : ""}`}
                  style={{
                    background: disabled
                      ? "var(--paper-1)"
                      : sel
                        ? "var(--paper-2)"
                        : "var(--paper-1)",
                    padding: "24px 26px",
                    cursor: disabled ? "default" : "pointer",
                    position: "relative",
                    transition: "background 0.12s",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      className="hh-serif"
                      style={{
                        fontSize: 19,
                        fontWeight: 400,
                        flex: "1 1 auto",
                        lineHeight: 1.25,
                      }}
                    >
                      {r.title}
                    </div>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        border: "1px solid var(--rule-3)",
                        background: sel && !disabled ? "var(--ink-0)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        marginTop: 4,
                        color: "var(--paper-1)",
                      }}
                    >
                      {sel && !disabled && <IcoCheck s={9} />}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: disabled ? "var(--ink-3)" : "var(--ink-1)",
                      lineHeight: 1.55,
                      margin: "10px 0 0",
                    }}
                  >
                    {r.body}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: disabled ? "var(--ink-3)" : "var(--ink-2)",
                      lineHeight: 1.5,
                      margin: "14px 0 0",
                    }}
                  >
                    {r.footer}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              alignItems: "center",
              paddingTop: 40,
            }}
          >
            <span
              style={{ fontSize: 11.5, color: "var(--ink-2)", marginRight: 6 }}
            >
              · · ○
            </span>
            <button className="hh-btn primary" onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </>
      ) : (
        /* Step 2: Account details */
        <>
          <div style={{ maxWidth: 400, margin: "56px 0 0" }}>
            <Eyebrow>Step 2 of 2</Eyebrow>
            <h1
              className="hh-display hh-auth-title"
              style={{ margin: "14px 0 12px" }}
            >
              Create your account
            </h1>
            <p
              style={{
                color: "var(--ink-1)",
                fontSize: 14,
                lineHeight: 1.6,
                margin: "0 0 36px",
              }}
            >
              Signing up as{" "}
              <strong style={{ fontWeight: 500 }}>
                {roles.find((r) => r.id === picked)?.title}
              </strong>
              .
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
                Full name
              </label>
              <input
                className="hh-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ marginBottom: 18 }}
              />

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

              <label
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-2)",
                  marginBottom: 6,
                  letterSpacing: "0.02em",
                  display: "block",
                }}
              >
                Password
              </label>
              <input
                className="hh-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  className="hh-btn ghost"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="hh-btn primary"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
