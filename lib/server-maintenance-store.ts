import { demoData } from "./demo-data";
import { createAdminClient, demoTenantIdToUUID, demoUnitIdToUUID, uuidToTenantId, uuidToUnitId } from "./supabase/admin";
import type { MaintenanceRequest } from "./types";

declare global {
  var propertyMaintenanceRequests: MaintenanceRequest[] | undefined;
}

function getStore() {
  if (!globalThis.propertyMaintenanceRequests) {
    globalThis.propertyMaintenanceRequests = [...demoData.maintenanceRequests];
  }
  return globalThis.propertyMaintenanceRequests;
}

// ── Supabase row mapper ───────────────────────────────────────────────────────

function rowToRequest(row: Record<string, unknown>): MaintenanceRequest {
  return {
    id: row.id as string,
    tenant_id: uuidToTenantId(row.tenant_id as string | null),
    unit_id: uuidToUnitId(row.unit_id as string | null),
    title: row.title as string,
    description: row.description as string,
    availability_window: row.availability_window as string | undefined,
    priority: row.priority as MaintenanceRequest["priority"],
    status: row.status as MaintenanceRequest["status"],
    review_status: row.review_status as MaintenanceRequest["review_status"],
    assigned_to: row.assigned_to as string | undefined,
    mn_confirmed_at: row.mn_confirmed_at as string | undefined,
    created_at: row.created_at as string
  };
}

// ── Supabase async helpers (fire-and-forget for voice agent) ─────────────────

async function saveToSupabase(request: MaintenanceRequest) {
  try {
    const db = createAdminClient();
    if (!db) return;
    await db.from("maintenance_requests").insert({
      tenant_id: demoTenantIdToUUID(request.tenant_id),
      unit_id: demoUnitIdToUUID(request.unit_id),
      title: request.title,
      description: request.description,
      availability_window: request.availability_window ?? null,
      priority: request.priority,
      status: request.status,
      review_status: request.review_status,
      assigned_to: request.assigned_to ? "00000000-0000-0000-0000-000000000004" : null,
      mn_confirmed_at: request.mn_confirmed_at ?? null,
      created_at: request.created_at
    });
  } catch (err) {
    console.error("[maintenance] Supabase save failed:", err);
  }
}

// ── Async API-route functions (Supabase first, memory fallback) ───────────────

export async function listMaintenanceRequestsFromDB(): Promise<MaintenanceRequest[]> {
  try {
    const db = createAdminClient();
    if (db) {
      const { data, error } = await db
        .from("maintenance_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return (data as Record<string, unknown>[]).map(rowToRequest);
      }
    }
  } catch (err) {
    console.error("[maintenance] Supabase list failed:", err);
  }
  return listMaintenanceRequests();
}

export async function updateMaintenanceRequestInDB(
  id: string,
  updates: Partial<Pick<MaintenanceRequest, "assigned_to" | "mn_confirmed_at" | "review_status" | "status">>
): Promise<MaintenanceRequest | null> {
  try {
    const db = createAdminClient();
    if (db) {
      const patch: Record<string, unknown> = {};
      if (updates.status !== undefined) patch.status = updates.status;
      if (updates.review_status !== undefined) patch.review_status = updates.review_status;
      if (updates.mn_confirmed_at !== undefined) patch.mn_confirmed_at = updates.mn_confirmed_at;
      if (updates.assigned_to !== undefined) patch.assigned_to = "00000000-0000-0000-0000-000000000004";

      const { data, error } = await db
        .from("maintenance_requests")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        updateMaintenanceRequest(id, updates); // keep memory in sync
        return rowToRequest(data as Record<string, unknown>);
      }
    }
  } catch (err) {
    console.error("[maintenance] Supabase update failed:", err);
  }
  return updateMaintenanceRequest(id, updates);
}

// ── Sync in-memory functions (used by voice agent) ───────────────────────────

export function listMaintenanceRequests() {
  return [...getStore()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function createMaintenanceRequest(
  request: Omit<MaintenanceRequest, "id" | "status" | "review_status" | "assigned_to" | "created_at">
) {
  const autoAssign = request.priority === "urgent";
  const nextRequest: MaintenanceRequest = {
    ...request,
    id: `request-${Date.now()}`,
    status: "open",
    review_status: autoAssign ? "accepted" : "pending",
    assigned_to: autoAssign ? "maintenance-1" : undefined,
    created_at: new Date().toISOString()
  };

  globalThis.propertyMaintenanceRequests = [nextRequest, ...getStore()];
  // Persist to Supabase without blocking the voice response
  saveToSupabase(nextRequest).catch(() => {});
  return nextRequest;
}

export function countActiveMaintenanceRequests() {
  return getStore().filter((r) => r.status !== "completed" && r.review_status !== "rejected").length;
}

export function updateMaintenanceRequest(
  id: string,
  updates: Partial<Pick<MaintenanceRequest, "assigned_to" | "mn_confirmed_at" | "review_status" | "status">>
) {
  const store = getStore();
  const index = store.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const updated = { ...store[index], ...updates };
  globalThis.propertyMaintenanceRequests = [updated, ...store.filter((r) => r.id !== id)];
  return updated;
}
