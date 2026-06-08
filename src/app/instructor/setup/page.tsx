"use client";

import { useState, useEffect } from "react";
import { Eyebrow, Wordmark } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function InstructorSetup() {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const router = useRouter();

  // Pre-fill name from signup metadata if available
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.display_name) {
        setDisplayName(user.user_metadata.display_name);
      }
    });
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Update display name in auth metadata
    const { error: authErr } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    // Update display name in profiles table
    await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);

    setLoading(false);
    setStep(2);
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Create halaqa
    const { data: halaqa, error: hErr } = await supabase
      .from("halaqat")
      .insert({ name: className, instructor_id: user.id })
      .select()
      .single();

    if (hErr) {
      setError(hErr.message);
      setLoading(false);
      return;
    }

    // Generate invite code
    const { data: codeData, error: cErr } = await supabase
      .rpc("generate_invite_code", { halaqa_uuid: halaqa.id });

    if (cErr) {
      setError(cErr.message);
      setLoading(false);
      return;
    }

    setInviteCode(codeData.code);
    setLoading(false);
  }

  // Step 3: Show invite code
  if (inviteCode) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 22px" }}>
          <Eyebrow>Your class is ready</Eyebrow>
          <h1 className="hh-display" style={{ fontSize: 32, margin: "12px 0 8px" }}>
            Share this code
          </h1>
          <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>
            Give this invite code to your students so they can join your class.
          </p>

          <div style={{ padding: "24px 32px", background: "var(--paper-3)", marginBottom: 24 }}>
            <div
              className="hh-num"
              style={{
                fontSize: 36,
                letterSpacing: "0.2em",
                fontWeight: 500,
                color: "var(--ink-0)",
                userSelect: "all",
              }}
            >
              {inviteCode}
            </div>
          </div>

          <button
            className="hh-btn primary lg"
            onClick={() => navigator.clipboard.writeText(inviteCode)}
            style={{ marginBottom: 12 }}
          >
            Copy code
          </button>
          <br />
          <button
            className="hh-btn ghost"
            onClick={() => router.push("/instructor")}
            style={{ marginTop: 8 }}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 400, padding: "0 22px", width: "100%" }}>
        <Wordmark size={17} />

        <div style={{ marginTop: 48 }}>
          <Eyebrow>Step {step} of 2</Eyebrow>

          {step === 1 ? (
            <>
              <h1 className="hh-display" style={{ fontSize: 32, margin: "12px 0 8px" }}>
                What should we call you?
              </h1>
              <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>
                This is how your students and their families will see you.
              </p>

              <form onSubmit={handleSaveName}>
                <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>
                  Your name
                </label>
                <input
                  className="hh-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ustadh Yusuf, Sr. Mariam"
                  required
                  style={{ marginBottom: 24 }}
                />

                {error && (
                  <p style={{ color: "var(--fail)", fontSize: 12, margin: "0 0 16px" }}>{error}</p>
                )}

                <button
                  type="submit"
                  className="hh-btn primary lg"
                  disabled={loading || !displayName.trim()}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {loading ? "Saving..." : "Continue"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="hh-display" style={{ fontSize: 32, margin: "12px 0 8px" }}>
                Name your class
              </h1>
              <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>
                This is what your students will see when they join, {displayName.split(" ")[0]}.
              </p>

              <form onSubmit={handleCreateClass}>
                <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>
                  Class name
                </label>
                <input
                  className="hh-input"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Boys 6–8, Sunday Halaqah"
                  required
                  style={{ marginBottom: 24 }}
                />

                {error && (
                  <p style={{ color: "var(--fail)", fontSize: 12, margin: "0 0 16px" }}>{error}</p>
                )}

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    className="hh-btn ghost"
                    onClick={() => { setStep(1); setError(""); }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="hh-btn primary lg"
                    disabled={loading || !className.trim()}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    {loading ? "Creating..." : "Create class"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
