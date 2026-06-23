"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Wrench } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { demoData } from "@/lib/demo-data";
import { formatDate, getTenantName, getUnitLabel } from "@/lib/data-utils";
import type { MaintenanceRequest } from "@/lib/types";

export function MaintenanceQueue() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const repairQueue = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.review_status === "accepted" &&
          request.assigned_to === "maintenance-1" &&
          request.status !== "completed"
      ),
    [requests]
  );
  const calendarDays = useMemo(() => groupByDay(repairQueue), [repairQueue]);

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

  async function updateRequest(id: string, action: "mn_confirm" | "complete") {
    const response = await fetch("/api/maintenance", {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ id, action })
    });
    const data = (await response.json()) as { request?: MaintenanceRequest };

    if (!response.ok || !data.request) {
      return;
    }

    setRequests((current) => current.map((request) => (request.id === id ? data.request! : request)));
  }

  return (
    <>
      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <MetricCard
          detail="Approved by landlord"
          icon={<Wrench size={24} />}
          label="Repair queue"
          value={repairQueue.length}
        />
        <MetricCard
          detail="Urgent priority"
          icon={<Wrench size={24} />}
          label="Urgent jobs"
          value={repairQueue.filter((request) => request.priority === "urgent").length}
        />
        <MetricCard
          detail="Currently assigned"
          icon={<Wrench size={24} />}
          label="Assigned to MN"
          value={repairQueue.length}
        />
      </div>

      <section className="card schedule-card" style={{ marginTop: 16 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Personalized schedule</p>
            <h2>MN Repair Calendar</h2>
          </div>
          <CalendarDays className="icon" size={24} />
        </div>
        <div className="repair-calendar-grid">
          {calendarDays.length ? (
            calendarDays.map((day) => (
              <article className="repair-calendar-day" key={day.label}>
                <h3>{day.label}</h3>
                <div className="repair-calendar-list">
                  {day.items.map((request) => (
                    <div className="repair-calendar-event" key={request.id}>
                      <time>{formatTime(request.availability_window)}</time>
                      <div>
                        <strong>{request.title}</strong>
                        <span>{getTenantName(demoData, request.tenant_id)} | {shortUnitLabel(request.unit_id)}</span>
                      </div>
                      <StatusBadge value={request.priority} />
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <article className="repair-calendar-day">
              <h3>No repair jobs</h3>
              <p className="table-note">Urgent requests and landlord-approved normal requests will appear here.</p>
            </article>
          )}
        </div>
      </section>

      <section className="card" id="accepted" style={{ marginTop: 16 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Approved repairs</p>
            <h2>Requests To Repair</h2>
          </div>
          <span className="status warn">{repairQueue.length} assigned</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Problem</th>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Submitted</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Best Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {repairQueue.map((request) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.title}</strong>
                    <p className="table-note">{request.description}</p>
                  </td>
                  <td>{getTenantName(demoData, request.tenant_id)}</td>
                  <td>{getUnitLabel(demoData, request.unit_id)}</td>
                  <td>{formatDate(request.created_at)}</td>
                  <td>
                    <StatusBadge value={request.priority} />
                  </td>
                  <td>
                    <StatusBadge value={request.status} />
                  </td>
                  <td>{formatDateTime(request.availability_window)}</td>
                  <td>
                    <div className="request-actions">
                      <button
                        className="action-button accept"
                        disabled={Boolean(request.mn_confirmed_at)}
                        onClick={() => updateRequest(request.id, "mn_confirm")}
                        type="button"
                      >
                        Confirm visit
                      </button>
                      <button
                        className="action-button"
                        onClick={() => updateRequest(request.id, "complete")}
                        type="button"
                      >
                        Complete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function groupByDay(requests: MaintenanceRequest[]) {
  const grouped = new Map<string, MaintenanceRequest[]>();

  for (const request of requests) {
    const key = request.availability_window
      ? new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric"
        }).format(new Date(request.availability_window))
      : "Unscheduled";
    grouped.set(key, [...(grouped.get(key) ?? []), request]);
  }

  return [...grouped.entries()].map(([label, items]) => ({
    label,
    items: items.sort(
      (a, b) => new Date(a.availability_window ?? 0).getTime() - new Date(b.availability_window ?? 0).getTime()
    )
  }));
}

function formatTime(value?: string) {
  if (!value) {
    return "Call";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Call tenant";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortUnitLabel(unitId: string) {
  const label = getUnitLabel(demoData, unitId);
  return label.replace("The Place on Jentilly - ", "");
}
