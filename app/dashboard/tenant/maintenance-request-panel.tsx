"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Send, Wrench } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { formatDate, getUnitLabel } from "@/lib/data-utils";
import { demoData } from "@/lib/demo-data";
import { maintenanceUpdatedEvent } from "@/lib/maintenance-store";
import type { MaintenanceRequest } from "@/lib/types";
import { AvailabilityCalendar } from "./availability-calendar";

type DraftRequest = {
  title: string;
  description: string;
  availabilityWindow: string;
  priority: MaintenanceRequest["priority"];
};

export function MaintenanceRequestPanel({
  initialRequests,
  tenantId,
  unitId
}: {
  initialRequests: MaintenanceRequest[];
  tenantId: string;
  unitId: string;
}) {
  const [storedRequests, setStoredRequests] = useState<MaintenanceRequest[]>([]);
  const [draft, setDraft] = useState<DraftRequest>({
    title: "",
    description: "",
    availabilityWindow: "",
    priority: "normal"
  });
  const [message, setMessage] = useState("");
  const requests = useMemo(
    () => (storedRequests.length ? storedRequests : initialRequests).filter((request) => request.tenant_id === tenantId),
    [initialRequests, storedRequests, tenantId]
  );

  useEffect(() => {
    async function syncRequests() {
      const response = await fetch("/api/maintenance", { cache: "no-store" });
      const data = (await response.json()) as { requests: MaintenanceRequest[] };
      setStoredRequests(data.requests);
    }

    syncRequests();
    const interval = window.setInterval(syncRequests, 3000);
    window.addEventListener(maintenanceUpdatedEvent, syncRequests);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(maintenanceUpdatedEvent, syncRequests);
    };
  }, []);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.description.trim() || !draft.availabilityWindow.trim()) {
      setMessage("Add an issue, details, and your best availability.");
      return;
    }

    const response = await fetch("/api/maintenance", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        tenantId,
        unitId,
        title: draft.title,
        description: draft.description,
        availabilityWindow: draft.availabilityWindow,
        priority: draft.priority
      })
    });

    const data = (await response.json()) as { request?: MaintenanceRequest };

    if (!response.ok || !data.request) {
      setMessage("Could not submit the request. Please try again.");
      return;
    }

    setStoredRequests((current) => [data.request!, ...current]);
    window.dispatchEvent(new CustomEvent(maintenanceUpdatedEvent));
    setDraft({ title: "", description: "", availabilityWindow: "", priority: "normal" });
    setMessage(
      data.request.priority === "urgent"
        ? "Urgent request submitted directly to maintenance."
        : "Request submitted and sent to the landlord dashboard."
    );
  }

  const approvedNotifications = requests.filter(
    (request) => request.review_status === "accepted" && request.status !== "completed"
  );

  return (
    <section className="card tenant-maintenance" id="maintenance">
      {approvedNotifications.length ? (
        <div className="notification-stack">
          {approvedNotifications.map((request) => (
            <div className="tenant-notification" key={request.id}>
              <strong>{request.title} was approved</strong>
              <span>
                Maintenance has this request. Best time noted: {request.availability_window ?? "availability not provided"}.
                {request.mn_confirmed_at ? " MN confirmed the visit." : " Waiting for MN confirmation."}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="section-heading">
        <div>
          <p className="eyebrow">Tenant service desk</p>
          <h2>Maintenance Requests</h2>
        </div>
        <span className="status warn">{requests.filter((request) => request.status !== "completed").length} active</span>
      </div>

      <div className="maintenance-layout">
        <form className="request-form" onSubmit={submitRequest}>
          <div className="request-form-title">
            <Wrench size={20} />
            <h3>Submit a new request</h3>
          </div>
          <div className="field">
            <label htmlFor="request-title">Issue</label>
            <input
              id="request-title"
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Leaking faucet"
              value={draft.title}
            />
          </div>
          <div className="field">
            <label htmlFor="request-priority">Priority</label>
            <select
              id="request-priority"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority: event.target.value as MaintenanceRequest["priority"]
                }))
              }
              value={draft.priority}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <AvailabilityCalendar
            busyRequests={storedRequests}
            onChange={(availabilityWindow) => setDraft((current) => ({ ...current, availabilityWindow }))}
            value={draft.availabilityWindow}
          />
          <div className="field">
            <label htmlFor="request-description">Details</label>
            <textarea
              id="request-description"
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe what is happening and where it is located."
              rows={5}
              value={draft.description}
            />
          </div>
          <button className="button" type="submit">
            <Send size={18} />
            Submit request
          </button>
          <p className="form-error">{message}</p>
        </form>

        <div className="request-list">
          {requests.map((request) => (
            <article className="request-item" key={request.id}>
              <div>
                <h3>{request.title}</h3>
                <p>{request.description}</p>
                <span>{getUnitLabel(demoData, request.unit_id)} | {formatDate(request.created_at)}</span>
                <span>Best time: {formatAvailability(request.availability_window)}</span>
              </div>
              <div className="request-statuses">
                <StatusBadge value={request.priority} />
                <StatusBadge value={request.review_status} />
                <StatusBadge value={request.status} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatAvailability(value?: string) {
  if (!value) {
    return "not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
