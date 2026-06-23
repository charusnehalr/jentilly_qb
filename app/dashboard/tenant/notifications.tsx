"use client";

import { useEffect, useMemo, useState } from "react";

import type { MaintenanceRequest } from "@/lib/types";

export function TenantNotifications({ tenantId }: { tenantId: string }) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const notifications = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.tenant_id === tenantId &&
          request.review_status === "accepted" &&
          request.status !== "completed"
      ),
    [requests, tenantId]
  );

  useEffect(() => {
    async function syncRequests() {
      const response = await fetch("/api/maintenance", { cache: "no-store" });
      const data = (await response.json()) as { requests: MaintenanceRequest[] };
      setRequests(data.requests);
    }

    syncRequests();
    const interval = window.setInterval(syncRequests, 3000);

    return () => window.clearInterval(interval);
  }, []);

  if (!notifications.length) {
    return null;
  }

  return (
    <section className="notification-stack page-notifications" aria-label="Maintenance notifications">
      {notifications.map((request) => (
        <div className="tenant-notification" key={request.id}>
          <strong>{request.title} was approved</strong>
          <span>
            Maintenance has your request. Best time noted: {formatAvailability(request.availability_window)}.
            {request.mn_confirmed_at ? " MN confirmed the visit." : " Waiting for MN confirmation."}
          </span>
        </div>
      ))}
    </section>
  );
}

function formatAvailability(value?: string) {
  if (!value) return "availability not provided";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
