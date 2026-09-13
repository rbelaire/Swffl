"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Manager, Profile } from "@/lib/types";

export default function AdminMembers() {
  const supabase = useMemo(() => createClient(), []);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [p, m] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("managers").select("*").order("name"),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    setManagers((m.data ?? []) as Manager[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, fields: Partial<Profile>) => {
    if (!supabase) return;
    setSavingId(id);
    setError(null);
    setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, ...fields } : p)));
    const { error } = await supabase.from("profiles").update(fields).eq("id", id);
    if (error) { setError(error.message); await load(); }
    setSavingId(null);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-700 text-navy-950">Members</h1>
      <p className="mt-1 text-sm text-navy-900/60">
        Everyone who has signed up. Flag commissioners as admins, and optionally
        link a member to their league manager profile.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card mt-6 overflow-x-auto">
        {profiles.length === 0 ? (
          <p className="p-8 text-center text-sm text-navy-900/55">
            No members yet. They appear here after signing up at /login.
          </p>
        ) : (
          <table className="stat-table">
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Linked Manager</th>
                <th className="text-center">Admin</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      className="field w-48"
                      value={p.display_name ?? ""}
                      disabled={savingId === p.id}
                      onChange={(e) =>
                        setProfiles((ps) => ps.map((x) => (x.id === p.id ? { ...x, display_name: e.target.value } : x)))
                      }
                      onBlur={(e) => patch(p.id, { display_name: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="field w-48"
                      value={p.manager_id ?? ""}
                      disabled={savingId === p.id}
                      onChange={(e) => patch(p.id, { manager_id: e.target.value || null })}
                    >
                      <option value="">— none —</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-navy-900/30"
                      checked={p.is_admin}
                      disabled={savingId === p.id}
                      onChange={(e) => patch(p.id, { is_admin: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-navy-900/50">
        Tip: the first accounts are auto-flagged as admins when you run the migration.
        Be careful removing your own admin access.
      </p>
    </div>
  );
}
