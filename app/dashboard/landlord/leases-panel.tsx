"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { demoData } from "@/lib/demo-data";
import { formatDate, getLeaseTenant, getUnitLabel } from "@/lib/data-utils";

type LeaseSort = "tenant" | "unit" | "leaseEnds" | "status";

export function LandlordLeasesPanel() {
  const [sortMode, setSortMode] = useState<LeaseSort>("tenant");
  const leases = useMemo(
    () =>
      [...demoData.leases].sort((a, b) => {
        if (sortMode === "unit") {
          return getUnitLabel(demoData, a.unit_id).localeCompare(getUnitLabel(demoData, b.unit_id));
        }

        if (sortMode === "leaseEnds") {
          return new Date(a.ends_on).getTime() - new Date(b.ends_on).getTime();
        }

        if (sortMode === "status") {
          return a.status.localeCompare(b.status);
        }

        return (getLeaseTenant(demoData, a)?.full_name ?? "").localeCompare(
          getLeaseTenant(demoData, b)?.full_name ?? ""
        );
      }),
    [sortMode]
  );

  return (
    <section className="card" id="tenants">
      <div className="section-heading">
        <h2>Tenants and Leases</h2>
        <div className="request-tools">
          <label htmlFor="lease-sort">
            <ArrowUpDown size={16} />
            Sort
          </label>
          <select id="lease-sort" onChange={(event) => setSortMode(event.target.value as LeaseSort)} value={sortMode}>
            <option value="tenant">Tenant</option>
            <option value="unit">Unit</option>
            <option value="leaseEnds">Lease end date</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>
      <div className="table-wrap tall-table">
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Unit</th>
              <th>Lease Ends</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leases.map((lease) => (
              <tr key={lease.id}>
                <td>{getLeaseTenant(demoData, lease)?.full_name}</td>
                <td>{getUnitLabel(demoData, lease.unit_id)}</td>
                <td>{formatDate(lease.ends_on)}</td>
                <td>
                  <StatusBadge value={lease.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

