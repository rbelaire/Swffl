"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type FieldType =
  | "text"
  | "number"
  | "textarea"
  | "boolean"
  | "select"
  | "ref"
  | "json";

export type FieldDef = {
  key: string;
  label: string;
  type?: FieldType;
  /** For type "select" */
  options?: { value: string; label: string }[];
  /** For type "ref" — the reference table to pull options from. */
  refTable?: string;
  required?: boolean;
  placeholder?: string;
  /** Hide from the summary table (still editable in the form). */
  hideInTable?: boolean;
  /** Default value used when creating a new row. */
  default?: string | number | boolean | null;
};

export type RefConfig = {
  table: string;
  /** Build the option label from a reference row. */
  label: (row: any, refs: Record<string, any[]>) => string;
  orderBy?: { column: string; ascending?: boolean };
  /** Column used as the stored value (defaults to "id"). */
  valueField?: string;
};

type Props = {
  table: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  orderBy?: { column: string; ascending?: boolean };
  /** Reference tables used by "ref" fields. */
  references?: RefConfig[];
  /** Primary key column. Defaults to "id". */
  idField?: string;
};

export function AdminTable({
  table,
  title,
  description,
  fields,
  orderBy,
  references = [],
  idField = "id",
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<any[]>([]);
  const [refs, setRefs] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null); // row or {} for new
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // reference tables
      const refData: Record<string, any[]> = {};
      for (const r of references) {
        let q = supabase.from(r.table).select("*");
        if (r.orderBy)
          q = q.order(r.orderBy.column, {
            ascending: r.orderBy.ascending ?? true,
          });
        const { data } = await q;
        refData[r.table] = data ?? [];
      }
      setRefs(refData);

      // main rows
      let q = supabase.from(table).select("*");
      if (orderBy)
        q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      const { data, error } = await q;
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [supabase, table, orderBy, references]);

  useEffect(() => {
    load();
  }, [load]);

  const refLabel = (refTable: string | undefined, id: any) => {
    if (!refTable || id == null) return "—";
    const conf = references.find((r) => r.table === refTable);
    const vf = conf?.valueField ?? "id";
    const row = refs[refTable]?.find((x) => x[vf] === id);
    if (!row || !conf) return "—";
    return conf.label(row, refs);
  };

  const optionsFor = (f: FieldDef) => {
    if (f.type === "select") return f.options ?? [];
    if (f.type === "ref" && f.refTable) {
      const conf = references.find((r) => r.table === f.refTable);
      const vf = conf?.valueField ?? "id";
      return (refs[f.refTable] ?? []).map((row) => ({
        value: row[vf],
        label: conf ? conf.label(row, refs) : row[vf],
      }));
    }
    return [];
  };

  const startNew = () => {
    const blank: any = {};
    for (const f of fields) {
      blank[f.key] =
        f.default !== undefined
          ? f.default
          : f.type === "boolean"
          ? false
          : f.type === "number"
          ? ""
          : "";
    }
    setEditing({ __new: true, ...blank });
  };

  const save = async () => {
    if (!editing || !supabase) return;
    setSaving(true);
    setError(null);
    try {
      const payload: any = {};
      for (const f of fields) {
        let v = editing[f.key];
        if (f.type === "number") v = v === "" || v == null ? null : Number(v);
        if ((f.type === "ref" || f.type === "select") && v === "") v = null;
        if (f.type === "json") {
          if (typeof v === "string") {
            const trimmed = v.trim();
            v = trimmed === "" ? null : JSON.parse(trimmed); // throws -> caught below
          }
        } else if (typeof v === "string") {
          v = v.trim() === "" ? null : v;
        }
        payload[f.key] = v;
      }
      if (editing.__new) {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table)
          .update(payload)
          .eq(idField, editing[idField]);
        if (error) throw error;
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    if (!supabase) return;
    if (!confirm(`Delete this row? This can't be undone.`)) return;
    setError(null);
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idField, row[idField]);
    if (error) {
      setError(error.message);
      return;
    }
    await load();
  };

  const tableFields = fields.filter((f) => !f.hideInTable);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700 text-navy-950">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-navy-900/60">{description}</p>
          )}
        </div>
        <button onClick={startNew} disabled={!supabase} className="btn-primary">
          + Add new
        </button>
      </div>

      {!supabase && (
        <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-[#7a611b]">
          Supabase isn&apos;t connected yet. Add your project keys to{" "}
          <code>.env.local</code> to load and edit data here.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card mt-6 overflow-x-auto">
        {loading ? (
          <p className="p-8 text-center text-sm text-navy-900/55">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-navy-900/55">
            Nothing here yet. Click “Add new” to create the first entry.
          </p>
        ) : (
          <table className="stat-table">
            <thead>
              <tr>
                {tableFields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id ?? row.key}>
                  {tableFields.map((f) => (
                    <td key={f.key}>
                      <CellValue f={f} value={row[f.key]} refLabel={refLabel} />
                    </td>
                  ))}
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing({ ...row })}
                        className="text-sm font-semibold text-navy-600 hover:text-navy-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(row)}
                        className="text-sm font-semibold text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EditDrawer
          title={editing.__new ? `New ${title.replace(/s$/, "")}` : `Edit ${title.replace(/s$/, "")}`}
          fields={fields}
          values={editing}
          setValues={setEditing}
          optionsFor={optionsFor}
          onCancel={() => setEditing(null)}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
  );
}

function CellValue({
  f,
  value,
  refLabel,
}: {
  f: FieldDef;
  value: any;
  refLabel: (t: string | undefined, id: any) => string;
}) {
  if (f.type === "boolean")
    return (
      <span className={value ? "badge-navy" : "text-navy-900/40"}>
        {value ? "Yes" : "No"}
      </span>
    );
  if (f.type === "ref") return <>{refLabel(f.refTable, value)}</>;
  if (f.type === "json")
    return value ? (
      <span className="badge-navy">Custom</span>
    ) : (
      <span className="text-navy-900/40">Default</span>
    );
  if (value == null || value === "")
    return <span className="text-navy-900/30">—</span>;
  if (f.type === "textarea") {
    const s = String(value);
    return <>{s.length > 60 ? s.slice(0, 60) + "…" : s}</>;
  }
  return <>{String(value)}</>;
}

function EditDrawer({
  title,
  fields,
  values,
  setValues,
  optionsFor,
  onCancel,
  onSave,
  saving,
}: {
  title: string;
  fields: FieldDef[];
  values: any;
  setValues: (v: any) => void;
  optionsFor: (f: FieldDef) => { value: string; label: string }[];
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const set = (key: string, v: any) => setValues({ ...values, [key]: v });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-900/10 bg-white px-6 py-4">
          <h2 className="font-display text-lg font-700 text-navy-950">{title}</h2>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-navy-900/60 hover:bg-navy-900/[0.05]"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label" htmlFor={f.key}>
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </label>

              {f.type === "textarea" || f.type === "json" ? (
                <textarea
                  id={f.key}
                  className={`field min-h-[120px] ${f.type === "json" ? "font-mono text-xs" : ""}`}
                  placeholder={f.placeholder}
                  value={
                    typeof values[f.key] === "object" && values[f.key] !== null
                      ? JSON.stringify(values[f.key], null, 2)
                      : values[f.key] ?? ""
                  }
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : f.type === "boolean" ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-navy-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-navy-900/30"
                    checked={!!values[f.key]}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                  {f.placeholder || "Enabled"}
                </label>
              ) : f.type === "select" || f.type === "ref" ? (
                <select
                  id={f.key}
                  className="field"
                  value={values[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                >
                  <option value="">— none —</option>
                  {optionsFor(f).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={f.key}
                  type={f.type === "number" ? "number" : "text"}
                  step="any"
                  className="field"
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 border-t border-navy-900/10 bg-white px-6 py-4">
          <button onClick={onSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
