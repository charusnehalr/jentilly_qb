import { demoData } from "./demo-data";
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
  return nextRequest;
}

export function countActiveMaintenanceRequests() {
  return getStore().filter((request) => request.status !== "completed" && request.review_status !== "rejected").length;
}

export function updateMaintenanceRequest(
  id: string,
  updates: Partial<Pick<MaintenanceRequest, "assigned_to" | "mn_confirmed_at" | "review_status" | "status">>
) {
  const store = getStore();
  const index = store.findIndex((request) => request.id === id);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...store[index],
    ...updates
  };

  globalThis.propertyMaintenanceRequests = [
    updated,
    ...store.filter((request) => request.id !== id)
  ];

  return updated;
}
