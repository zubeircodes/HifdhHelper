"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { IcoBack, IcoFwd, IcoPlay, IcoPause, Eyebrow, VerseText } from "@/components/atoms";
import { useVerseLoop, formatTime } from "@/components/practice/use-verse-loop";
import { getVerseRange } from "@/lib/quran-text";
import { rangeLabel } from "@/lib/quran-meta";
import { RECITERS, DEFAULT_RECITER } from "@/lib/audio";
import { createClient } from "@/lib/supabase";
import { normalizeItem, ITEM_FIELDS, type AssignmentItem } from "@/lib/assignments";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function LessonPlayer() {
  const params = useSearchParams();
  const router = useRouter();
  const itemId = params.get("item");

  const [item, setItem] = useState<AssignmentItem | null>(null);
  const [listens, setListens] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Record one listen per completed pass of the whole range. Keyed by item so
  // a stale callback can't credit the wrong lesson.
  const itemRef = useRef<string | null>(null);
  const loop = useVerseLoop({
    onPassComplete: async () => {
      const id = itemRef.current;
      if (!id) return;
      const supabase = createClient();
      const { data, error } = await supabase.rpc("increment_listen", { item_id: id });
      if (!error && data?.listens_completed != null) setListens(data.listens_completed);
    },
  });
  const { verses, currentRepeat, repeats, playing, currentVerse, currentTime, duration, audioError, activeVerseRef } = loop;

  useEffect(() => {
    if (!itemId) { router.replace("/student"); return; }
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("assignment_items")
        .select(ITEM_FIELDS)
        .eq("id", itemId)
        .single();
      if (!data) { setError("That lesson isn't available."); setLoading(false); return; }
      const it = normalizeItem(data);
      setItem(it);
      setListens(it.listens);
      setSubmitted(!!it.submitted_at);
      itemRef.current = it.id;

      const v = await getVerseRange(it.surah, it.start_ayah, it.end_surah, it.end_ayah);
      // Play the whole range once per "repeat" the teacher asked for, minus
      // what's already been done, but at least once so they can keep practising.
      const remaining = Math.max(it.repetitions - it.listens, 1);
      loop.start(v, remaining, it.reciter_ref || DEFAULT_RECITER);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function handleSubmit() {
    if (!item) return;
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("submit_item", { item_id: item.id });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
    loop.stop();
  }

  if (loading) {
    return (
      <div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading lesson...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: "22px" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>{error || "Lesson not found."} <Link href="/student">Back</Link></p>
      </div>
    );
  }

  const label = rangeLabel({ surah: item.surah, startAyah: item.start_ayah, endSurah: item.end_surah, endAyah: item.end_ayah });
  const reciterName = RECITERS.find((r) => r.id === (item.reciter_ref || DEFAULT_RECITER))?.name ?? "";
  const canSubmit = listens >= item.repetitions && !submitted;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div style={{ flex: "0 0 auto", padding: "12px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Link href="/student" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-1)", fontSize: 12, flex: "0 0 auto", textDecoration: "none" }}>
          <IcoBack s={12} /> Lessons
        </Link>
        <span className="hh-eyebrow" style={{ flex: "1 1 auto", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.lesson_type_name} · {label}
        </span>
        <span style={{ width: 56 }} />
      </div>

      <div style={{ flex: "1 1 auto", padding: "12px 22px", overflow: "auto", minHeight: 0 }}>
        {verses.map((v, idx) => {
          const active = idx === currentVerse;
          return (
            <div
              key={`${v.surah}:${v.verse}`}
              ref={active ? activeVerseRef : null}
              onClick={() => loop.goTo(idx)}
              style={{ padding: "var(--space-md)", borderBottom: "1px solid var(--rule-1)", opacity: active ? 1 : 0.55, transition: "opacity 0.2s", cursor: "pointer" }}
            >
              <VerseText html={v.text} style={active ? { fontSize: "2rem" } : { fontSize: "1.6rem" }} />
            </div>
          );
        })}
      </div>

      <div style={{ flex: "0 0 auto", padding: "16px 22px 18px", background: "var(--paper-3)", borderTop: "1px solid var(--rule-1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <Eyebrow>Ayah {currentVerse + 1} of {verses.length}</Eyebrow>
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>
              This session: pass <span className="hh-num">{currentRepeat}</span> of {repeats} · {reciterName}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="hh-display hh-num" style={{ fontSize: 22, lineHeight: 1 }}>
              {Math.min(listens, item.repetitions)}<span style={{ fontSize: 13, color: "var(--ink-2)" }}>/{item.repetitions}</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ink-2)", marginTop: 2 }}>listens done</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>{formatTime(currentTime)}</span>
          <div style={{ flex: 1, height: 2, background: "var(--rule-2)", borderRadius: 1, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${progress}%`, background: "var(--ink-0)", transition: "width 0.1s" }} />
          </div>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>{formatTime(duration)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 36, marginTop: 18 }}>
          <button onClick={() => loop.goTo(currentVerse - 1)} className="hh-btn ghost" aria-label="Previous ayah" style={{ padding: 0, width: 36, height: 36, justifyContent: "center" }}>
            <IcoBack s={18} />
          </button>
          <button
            onClick={loop.togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            style={{ width: 56, height: 56, borderRadius: 28, background: "var(--ink-0)", color: "var(--paper-1)", border: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            {playing ? <IcoPause s={18} /> : <IcoPlay s={18} />}
          </button>
          <button onClick={() => loop.goTo(currentVerse + 1)} className="hh-btn ghost" aria-label="Next ayah" style={{ padding: 0, width: 36, height: 36, justifyContent: "center" }}>
            <IcoFwd s={18} />
          </button>
        </div>

        {audioError && (
          <p style={{ color: "var(--fail)", fontSize: 11.5, textAlign: "center", margin: "14px 0 0" }}>
            Couldn&apos;t load audio for this ayah. Check your connection and try again.
          </p>
        )}
        {error && (
          <p style={{ color: "var(--fail)", fontSize: 11.5, textAlign: "center", margin: "14px 0 0" }}>{error}</p>
        )}

        <div style={{ marginTop: 16 }}>
          {submitted ? (
            <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--pass)" }}>
              Submitted — your teacher will hear it in class.
            </div>
          ) : (
            <button className="hh-btn primary lg" disabled={!canSubmit || submitting} onClick={handleSubmit}
              style={{ width: "100%", justifyContent: "center" }}>
              {submitting ? "Submitting..." : canSubmit ? "Mark as ready" : `${item.repetitions - listens} more listen${item.repetitions - listens === 1 ? "" : "s"} to go`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function QuranPlayer() {
  return (
    <Suspense fallback={<div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p></div>}>
      <LessonPlayer />
    </Suspense>
  );
}
