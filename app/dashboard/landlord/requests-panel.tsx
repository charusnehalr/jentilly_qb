"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, CheckCircle2, ClipboardList, Maximize2, Phone, XCircle } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { demoData } from "@/lib/demo-data";
import { formatDate, getTenantName, getUnitLabel } from "@/lib/data-utils";
import { maintenanceUpdatedEvent } from "@/lib/maintenance-store";
import type { MaintenanceRequest } from "@/lib/types";

type SortMode = "newest" | "priority" | "tenant" | "status";

export function LandlordRequestsPanel({
  initialRequests
}: {
  initialRequests: MaintenanceRequest[];
}) {
  const [storedRequests, setStoredRequests] = useState<MaintenanceRequest[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const requests = useMemo(() => {
    const visible = [...(storedRequests.length ? storedRequests : initialRequests)].filter(
      (request) => request.review_status !== "rejected"
    );

    return visible.sort((a, b) => {
      if (sortMode === "priority") {
        return priorityRank(b.priority) - priorityRank(a.priority);
      }

      if (sortMode === "tenant") {
        return getTenantName(demoData, a.tenant_id).localeCompare(getTenantName(demoData, b.tenant_id));
      }

      if (sortMode === "status") {
        return statusRank(a.review_status) - statusRank(b.review_status);
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [initialRequests, sortMode, storedRequests]);
  const activeCount = requests.filter((request) => request.status !== "completed").length;

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

  async function updateRequest(id: string, action: "accept" | "reject") {
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

    setStoredRequests((current) => {
      if (action === "reject") {
        return current.filter((request) => request.id !== id);
      }

      return current.map((request) => (request.id === id ? data.request! : request));
    });
    window.dispatchEvent(new CustomEvent(maintenanceUpdatedEvent));
  }

  return (
    <section className="card" id="requests" style={{ marginTop: 16 }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Problems and requests</p>
          <h2>Tenant Maintenance Requests</h2>
        </div>
        <div className="request-tools">
          <label htmlFor="request-sort">
            <ArrowUpDown size={16} />
            Sort
          </label>
          <select id="request-sort" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
            <option value="newest">Newest</option>
            <option value="priority">Priority</option>
            <option value="tenant">Tenant</option>
            <option value="status">Review status</option>
          </select>
          <span className="status warn">{activeCount} active</span>
        </div>
      </div>

      <div className="request-board">
        <div className="request-summary">
          <ClipboardList size={28} />
          <strong>{requests.length}</strong>
          <span>Visible requests</span>
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
                <th>Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const tenant = demoData.tenants.find((item) => item.id === request.tenant_id);
                const canAccept = request.review_status !== "accepted";

                return (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.title}</strong>
                      <p className="table-note">{request.description}</p>
                      <p className="table-note">Best time: {formatAvailability(request.availability_window)}</p>
                    </td>
                    <td>{getTenantName(demoData, request.tenant_id)}</td>
                    <td>{getUnitLabel(demoData, request.unit_id)}</td>
                    <td>{formatDate(request.created_at)}</td>
                    <td>
                      <StatusBadge value={request.priority} />
                    </td>
                    <td>
                      <StatusBadge value={request.review_status} />
                    </td>
                    <td>
                      <div className="request-actions">
                        <button
                          aria-label="View request details"
                          className="icon-button"
                          onClick={() => setSelectedRequest(request)}
                          title="Tap to enlarge"
                          type="button"
                        >
                          <Maximize2 size={16} />
                        </button>
                        <a
                          aria-label={`Call ${tenant?.full_name ?? "tenant"}`}
                          className="icon-button call-button"
                          data-phone={tenant?.phone ?? "No phone"}
                          href={`tel:${tenant?.phone ?? ""}`}
                          title={tenant?.phone ?? "No phone"}
                        >
                          <Phone size={16} />
                        </a>
                        <button
                          className="action-button accept"
                          disabled={!canAccept}
                          onClick={() => updateRequest(request.id, "accept")}
                          type="button"
                        >
                          <CheckCircle2 size={16} />
                          Accept
                        </button>
                        <button
                          className="action-button reject"
                          onClick={() => updateRequest(request.id, "reject")}
                          type="button"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest ? (
        <div className="modal-backdrop" onClick={() => setSelectedRequest(null)} role="presentation">
          <section className="request-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Request detail</p>
                <h2>{selectedRequest.title}</h2>
              </div>
              <button className="button secondary" onClick={() => setSelectedRequest(null)} type="button">
                Close
              </button>
            </div>
            <div className="detail-grid">
              <div>
                <span>Tenant</span>
                <strong>{getTenantName(demoData, selectedRequest.tenant_id)}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{demoData.tenants.find((tenant) => tenant.id === selectedRequest.tenant_id)?.phone}</strong>
              </div>
              <div>
                <span>Unit</span>
                <strong>{getUnitLabel(demoData, selectedRequest.unit_id)}</strong>
              </div>
              <div>
                <span>Submitted</span>
                <strong>{formatDate(selectedRequest.created_at)}</strong>
              </div>
              <div>
                <span>Best time home</span>
                <strong>{formatAvailability(selectedRequest.availability_window)}</strong>
              </div>
              <div>
                <span>MN confirmation</span>
                <strong>{selectedRequest.mn_confirmed_at ? formatDate(selectedRequest.mn_confirmed_at) : "Waiting"}</strong>
              </div>
            </div>
            <p className="modal-description">{selectedRequest.description}</p>
            <div className="request-statuses">
              <StatusBadge value={selectedRequest.priority} />
              <StatusBadge value={selectedRequest.review_status} />
              <StatusBadge value={selectedRequest.status} />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function priorityRank(priority: MaintenanceRequest["priority"]) {
  return priority === "urgent" ? 3 : priority === "normal" ? 2 : 1;
}

function statusRank(status: MaintenanceRequest["review_status"]) {
  return status === "pending" ? 1 : status === "accepted" ? 2 : 3;
}

function formatAvailability(value?: string) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
