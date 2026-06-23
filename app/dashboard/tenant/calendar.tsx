"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { MaintenanceRequest } from "@/lib/types";

export function TenantCalendar({ tenantId }: { tenantId: string }) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const calendarItems = useMemo(
    () =>
      requests
        .filter((request) => request.tenant_id === tenantId && request.availability_window)
        .sort((a, b) => new Date(a.availability_window ?? 0).getTime() - new Date(b.availability_window ?? 0).getTime()),
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

  return (
    <section className="card tenant-calendar" id="calendar">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your repair availability</p>
          <h2>Maintenance Calendar</h2>
        </div>
        <CalendarDays className="icon" size={24} />
      </div>
      <div className="calendar-list">
        {calendarItems.length ? (
          calendarItems.map((request) => (
            <article className="calendar-item" key={request.id}>
              <time>{formatDateTime(request.availability_window)}</time>
              <div>
                <strong>{request.title}</strong>
                <span>{request.mn_confirmed_at ? "MN confirmed this time" : "Waiting for MN confirmation"}</span>
              </div>
              <StatusBadge value={request.review_status} />
            </article>
          ))
        ) : (
          <p className="table-note">No maintenance times selected yet.</p>
        )}
      </div>
    </section>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "No time";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

