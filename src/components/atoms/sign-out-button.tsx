"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface SignOutButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SignOutButton({ className = "hh-btn ghost sm", style }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <button className={className} style={style} onClick={handleSignOut}>
      Sign out
    </button>
  );
}
