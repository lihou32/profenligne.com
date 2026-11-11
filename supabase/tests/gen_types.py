#!/usr/bin/env python3
"""
Génère src/integrations/supabase/types.ts à partir d'une base Postgres
(même format que `supabase gen types typescript`), sans Docker.

Usage : python3 supabase/tests/gen_types.py "<psql connection args>" > types.ts
Exemple : python3 supabase/tests/gen_types.py "-h /tmp -p 5499 -U postgres -d t"

En production, préférer : npx supabase gen types typescript --project-id <id>
"""
import json
import subprocess
import sys

CONN = sys.argv[1].split()

PG_TO_TS = {
    "uuid": "string", "text": "string", "character varying": "string", "character": "string",
    "timestamp with time zone": "string", "timestamp without time zone": "string", "date": "string",
    "time without time zone": "string", "integer": "number", "bigint": "number", "smallint": "number",
    "numeric": "number", "real": "number", "double precision": "number", "boolean": "boolean",
    "jsonb": "Json", "json": "Json", "tstzrange": "unknown",
}


def q(sql):
    out = subprocess.run(["psql", *CONN, "-At", "-c", sql], capture_output=True, text=True, check=True).stdout
    return json.loads(out) if out.strip() else []


enums = q("""
select coalesce(json_agg(json_build_object('name', t.typname, 'values',
  (select json_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid))
  order by t.typname), '[]')
from pg_type t join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typtype = 'e'
""")
enum_names = {e["name"] for e in enums}

cols = q("""
select coalesce(json_agg(json_build_object(
  'table', c.table_name, 'name', c.column_name, 'type', c.data_type, 'udt', c.udt_name,
  'nullable', c.is_nullable = 'YES', 'has_default', c.column_default is not null or c.is_identity = 'YES')
  order by c.table_name, c.column_name), '[]')
from information_schema.columns c
join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
""")

fks = q("""
select coalesce(json_agg(json_build_object('name', con.conname, 'table', cl.relname,
  'columns', (select json_agg(a.attname) from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k),
  'ref', rcl.relname,
  'refcols', (select json_agg(a.attname) from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k),
  'one', exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indisunique and i.indkey::int2[] @> con.conkey and array_length(i.indkey::int2[],1) = array_length(con.conkey,1)))
  order by cl.relname, con.conname), '[]')
from pg_constraint con
join pg_class cl on cl.oid = con.conrelid join pg_namespace n on n.oid = cl.relnamespace
join pg_class rcl on rcl.oid = con.confrelid
where con.contype = 'f' and n.nspname = 'public'
""")

funcs = q("""
select coalesce(json_agg(json_build_object(
  'name', p.proname,
  'args', coalesce((select json_agg(json_build_object('name', a.name, 'type', format_type(a.type, null), 'has_default', a.ord > p.pronargs - p.pronargdefaults) order by a.ord)
           from unnest(p.proargnames[1:p.pronargs], p.proargtypes::oid[]) with ordinality a(name, type, ord)), '[]'),
  'ret', format_type(p.prorettype, null), 'retset', p.proretset,
  'outs', coalesce((select json_agg(json_build_object('name', o.name, 'type', format_type(o.type, null)) order by o.ord)
           from unnest(p.proargnames, p.proallargtypes, p.proargmodes) with ordinality o(name, type, mode, ord)
           where o.mode in ('t', 'o')), '[]'))
  order by p.proname), '[]')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and p.proname not like '\\_%'
  and p.prorettype <> 'trigger'::regtype
  and has_function_privilege('authenticated', p.oid, 'execute')
""")


def ts_type(c):
    if c["type"] == "ARRAY":
        base = c["udt"].lstrip("_")
        inner = f'Database["public"]["Enums"]["{base}"]' if base in enum_names else {
            "text": "string", "uuid": "string", "int4": "number", "int8": "number", "numeric": "number", "bool": "boolean"}.get(base, "unknown")
        return f"{inner}[]"
    if c["type"] == "USER-DEFINED":
        return f'Database["public"]["Enums"]["{c["udt"]}"]' if c["udt"] in enum_names else "unknown"
    return PG_TO_TS.get(c["type"], "unknown")


def pg_fn_type(t):
    if t.endswith("[]"):
        return pg_fn_type(t[:-2]) + "[]"
    if t in enum_names:
        return f'Database["public"]["Enums"]["{t}"]'
    simple = {"timestamp with time zone": "string", "integer": "number", "numeric": "number", "text": "string",
              "uuid": "string", "boolean": "boolean", "void": "undefined", "jsonb": "Json", "bigint": "number"}
    return simple.get(t, None)


tables = {}
for c in cols:
    tables.setdefault(c["table"], []).append(c)


def row_type(table_cols, indent):
    pad = " " * indent
    return "\n".join(f'{pad}{c["name"]}: {ts_type(c)}{" | null" if c["nullable"] else ""}' for c in table_cols)


out = []
w = out.append
w("""export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {""")
for t, tc in tables.items():
    w(f"      {t}: {{")
    w("        Row: {")
    w(row_type(tc, 10))
    w("        }")
    for kind in ("Insert", "Update"):
        w(f"        {kind}: {{")
        for c in tc:
            opt = "?" if kind == "Update" or c["nullable"] or c["has_default"] else ""
            w(f'          {c["name"]}{opt}: {ts_type(c)}{" | null" if c["nullable"] else ""}')
        w("        }")
    rels = [f for f in fks if f["table"] == t]
    if not rels:
        w("        Relationships: []")
    else:
        w("        Relationships: [")
        for f in rels:
            w("          {")
            w(f'            foreignKeyName: "{f["name"]}"')
            w(f'            columns: {json.dumps(f["columns"])}')
            w(f'            isOneToOne: {"true" if f["one"] else "false"}')
            w(f'            referencedRelation: "{f["ref"]}"')
            w(f'            referencedColumns: {json.dumps(f["refcols"])}')
            w("          },")
        w("        ]")
    w("      }")
w("""    }
    Views: {
      [_ in never]: never
    }
    Functions: {""")
for f in funcs:
    w(f'      {f["name"]}: {{')
    if not f["args"]:
        w("        Args: never")
    else:
        w("        Args: {")
        for a in f["args"]:
            w(f'          {a["name"]}{"?" if a["has_default"] else ""}: {pg_fn_type(a["type"]) or "unknown"}')
        w("        }")
    ret = f["ret"]
    if f["outs"]:
        fields = "\n".join(f'          {o["name"]}: {pg_fn_type(o["type"]) or "unknown"}' for o in f["outs"])
        w("        Returns: {\n" + fields + "\n        }" + ("[]" if f["retset"] else ""))
    elif ret in tables:
        rt = "{\n" + row_type(tables[ret], 10) + "\n        }"
        w(f"        Returns: {rt}" + ("[]" if f["retset"] else ""))
        w("        SetofOptions: {")
        w('          from: "*"')
        w(f'          to: "{ret}"')
        w(f'          isOneToOne: {"false" if f["retset"] else "true"}')
        w('          isSetofReturn: ' + ("true" if f["retset"] else "false"))
        w("        }")
    else:
        w(f"        Returns: {pg_fn_type(ret) or 'unknown'}")
    w("      }")
w("""    }
    Enums: {""")
for e in enums:
    w(f'      {e["name"]}: {" | ".join(json.dumps(v) for v in e["values"])}')
w("""    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}""")
print("\n".join(out))
