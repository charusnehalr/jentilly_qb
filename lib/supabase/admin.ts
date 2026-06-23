import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Convert demo-data string IDs to Supabase UUIDs
export function demoTenantIdToUUID(id: string): string | null {
  const m = id.match(/tenant-record-(\d+)/);
  if (!m) return null;
  return `50000000-0000-0000-0000-${String(parseInt(m[1])).padStart(12, "0")}`;
}

export function demoUnitIdToUUID(id: string): string | null {
  const priv = id.match(/unit-private-(\d+)/);
  if (priv) return `30000000-0000-0000-0000-${String(parseInt(priv[1])).padStart(12, "0")}`;
  const shared = id.match(/unit-shared-([a-j])-(\d)/);
  if (shared) {
    const n = (shared[1].charCodeAt(0) - 97) * 3 + parseInt(shared[2]);
    return `40000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
  }
  return null;
}

// Convert Supabase UUIDs back to demo-data string IDs
export function uuidToTenantId(uuid: string | null): string {
  if (!uuid) return "";
  const m = uuid.match(/^50000000-0000-0000-0000-0*(\d+)$/);
  if (!m) return uuid;
  return `tenant-record-${String(parseInt(m[1])).padStart(3, "0")}`;
}

export function uuidToUnitId(uuid: string | null): string {
  if (!uuid) return "";
  const priv = uuid.match(/^30000000-0000-0000-0000-0*(\d+)$/);
  if (priv) return `unit-private-${String(parseInt(priv[1])).padStart(3, "0")}`;
  const shared = uuid.match(/^40000000-0000-0000-0000-0*(\d+)$/);
  if (shared) {
    const n = parseInt(shared[1]) - 1;
    const house = String.fromCharCode(97 + Math.floor(n / 3));
    const room = (n % 3) + 1;
    return `unit-shared-${house}-${room}`;
  }
  return uuid;
}
