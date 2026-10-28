import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "error", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      supabase: "connected",
      profiles_accessible: true,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", detail: String(e) },
      { status: 500 }
    );
  }
}
