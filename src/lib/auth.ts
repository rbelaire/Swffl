import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** The signed-in user's id (or null). */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** The signed-in user's profile (or null). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return Boolean(profile?.is_admin);
}
