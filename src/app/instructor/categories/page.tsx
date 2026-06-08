"use client";

import { useState, useEffect, useCallback } from "react";
import { Eyebrow, IcoPlus } from "@/components/atoms";
import { createClient } from "@/lib/supabase";

interface LessonType {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

function Chevron({ dir = "up", s = 13 }: { dir?: "up" | "down"; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{ flex: "0 0 auto" }}>
      <path d={dir === "up" ? "M4 10 L8 6 L12 10" : "M4 6 L8 10 L12 6"}
        stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Close({ s = 13 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{ flex: "0 0 auto" }}>
      <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconBtn({ children, disabled, onClick, title }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; title: string }) {
  return (
    <button onClick={disabled ? undefined : onClick} title={title} disabled={disabled}
      style={{
        width: 28, height: 28, padding: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: 0,
        color: disabled ? "var(--ink-4)" : "var(--ink-2)",
        cursor: disabled ? "default" : "pointer",
      }}>
      {children}
    </button>
  );
}

export default function CategorySettings() {
  const [cats, setCats] = useState<LessonType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("lesson_types")
      .select("id, name, description, sort_order")
      .eq("instructor_id", user.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) setCats(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  async function updateCat(id: string, field: "name" | "description", val: string) {
    setCats((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
    const supabase = createClient();
    await supabase.from("lesson_types").update({ [field]: val }).eq("id", id);
  }

  async function removeCat(id: string) {
    setCats((cs) => cs.filter((c) => c.id !== id));
    const supabase = createClient();
    await supabase.from("lesson_types").update({ is_active: false }).eq("id", id);
  }

  async function moveCat(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const next = cats.slice();
    [next[i], next[j]] = [next[j], next[i]];
    // Update sort_order for both
    const supabase = createClient();
    await Promise.all([
      supabase.from("lesson_types").update({ sort_order: j }).eq("id", next[j].id),
      supabase.from("lesson_types").update({ sort_order: i }).eq("id", next[i].id),
    ]);
    setCats(next.map((c, idx) => ({ ...c, sort_order: idx })));
  }

  async function addCat() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newOrder = cats.length;
    const { data, error } = await supabase
      .from("lesson_types")
      .insert({ instructor_id: user.id, name: "", description: "", sort_order: newOrder })
      .select()
      .single();

    if (data) setCats((cs) => [...cs, data]);
  }

  if (loading) {
    return (
      <div style={{ padding: "22px 36px" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{
        padding: "22px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule-1)", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--ink-2)", fontSize: 12.5 }}>
          <span>Setup</span><span>/</span>
          <span style={{ color: "var(--ink-0)" }}>Lesson categories</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Changes save automatically</div>
      </div>

      <div className="hh-page-padding" style={{ maxWidth: 720 }}>
        <Eyebrow>Setup</Eyebrow>
        <h1 className="hh-display" style={{ fontSize: 32, margin: "6px 0 12px" }}>Lesson categories</h1>
        <p className="hh-serif" style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-1)", margin: "0 0 4px", maxWidth: 560 }}>
          The lesson types you assign and grade each day. Rename, reorder, or add your own to match your halaqah.
        </p>

        <hr className="hh-rule" style={{ margin: "28px 0 4px" }} />

        <div>
          {cats.map((c, i) => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 18,
              padding: "18px 0", borderTop: "1px solid var(--rule-1)",
            }}>
              <span className="hh-num" style={{ fontSize: 12, color: "var(--ink-3)", width: 22, flexShrink: 0, letterSpacing: "0.04em" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={c.name}
                  placeholder="Category name"
                  onChange={(e) => updateCat(c.id, "name", e.target.value)}
                  className="hh-serif"
                  style={{ width: "100%", background: "transparent", border: 0, outline: "none", padding: "2px 0", color: "var(--ink-0)", fontSize: 18 }}
                />
                <input
                  value={c.description || ""}
                  placeholder="Short descriptor — e.g. new lesson"
                  onChange={(e) => updateCat(c.id, "description", e.target.value)}
                  style={{ width: "100%", background: "transparent", border: 0, outline: "none", padding: "2px 0", color: "var(--ink-2)", fontSize: 12.5, marginTop: 2 }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                <IconBtn title="Move up" disabled={i === 0} onClick={() => moveCat(i, -1)}><Chevron dir="up" /></IconBtn>
                <IconBtn title="Move down" disabled={i === cats.length - 1} onClick={() => moveCat(i, +1)}><Chevron dir="down" /></IconBtn>
                <IconBtn title="Remove" disabled={cats.length <= 1} onClick={() => removeCat(c.id)}><Close /></IconBtn>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--rule-1)", paddingTop: 20 }}>
          <button className="hh-btn" onClick={addCat} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IcoPlus s={12} /> Add category
          </button>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: 14 }}>
            <span className="hh-num">{cats.length}</span> categor{cats.length === 1 ? "y" : "ies"}
          </span>
        </div>
      </div>
    </>
  );
}
