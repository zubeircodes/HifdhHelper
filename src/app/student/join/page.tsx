"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function JoinClass() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_student_slot", {
      code: code.trim().toUpperCase(),
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(data.student_name);
    setTimeout(() => router.push("/student"), 2000);
  }

  if (success) {
    return (
      <div style={{ padding: "16px 22px", flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <Eyebrow>Enrolled</Eyebrow>
        <h1 className="hh-display" style={{ fontSize: 26, margin: "10px 0 8px" }}>
          Welcome, {success}
        </h1>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>
          Redirecting to your lessons...
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 22px 20px", flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 360 }}>
        <Eyebrow>Get started</Eyebrow>
        <h1 className="hh-display" style={{ fontSize: 26, margin: "10px 0 8px" }}>
          Join your class
        </h1>
        <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 28px" }}>
          Enter the personal code your teacher gave you to link your account. You can still use practice mode in the meantime.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>
            Invite code
          </label>
          <input
            className="hh-input hh-num"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A3BF2K"
            required
            maxLength={10}
            style={{
              marginBottom: 20,
              fontSize: 18,
              letterSpacing: "0.12em",
              textAlign: "center",
              textTransform: "uppercase",
            }}
          />

          {error && (
            <p style={{ color: "var(--fail)", fontSize: 12, margin: "0 0 16px" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="hh-btn primary lg"
            disabled={loading || code.trim().length < 4}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "Joining..." : "Join class"}
          </button>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--rule-1)" }}>
          <p style={{ color: "var(--ink-2)", fontSize: 12, lineHeight: 1.6 }}>
            Don&apos;t have a code yet? Ask your teacher for one, or explore practice mode to start reciting on your own.
          </p>
        </div>
      </div>
    </div>
  );
}
