import type { MaintenanceRequest } from "./types";

export const maintenanceStorageKey = "property-maintenance-requests";
export const maintenanceUpdatedEvent = "property-maintenance-updated";

export function readStoredMaintenanceRequests(): MaintenanceRequest[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(maintenanceStorageKey);
    return stored ? (JSON.parse(stored) as MaintenanceRequest[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredMaintenanceRequest(request: MaintenanceRequest) {
  const current = readStoredMaintenanceRequests();
  const next = [request, ...current.filter((item) => item.id !== request.id)];

  window.localStorage.setItem(maintenanceStorageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(maintenanceUpdatedEvent));

  return next;
}

