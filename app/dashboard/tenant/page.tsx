import { CalendarDays, ClipboardList, Home, KeyRound, Receipt } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { demoData } from "@/lib/demo-data";
import { formatDate, formatMoney, getOutstandingRent, getTenantViewData, getUnitLabel } from "@/lib/data-utils";
import { MaintenanceRequestPanel } from "./maintenance-request-panel";
import { TenantNotifications } from "./notifications";
import { TenantCalendar } from "./calendar";

export default async function TenantDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenantView = getTenantViewData(params.tenantId ?? "tenant-profile-001");
  const activeLease = tenantView.leases[0];
  const requestCount = tenantView.maintenanceRequests.length;

  return (
    <AppShell role="tenant" subtitle={tenantView.tenant.full_name} title="Tenant Dashboard">
      <TenantNotifications tenantId={tenantView.tenant.id} />

      <section className="tenant-hero">
        <div>
          <p className="eyebrow">Rent snapshot</p>
          <h2>{formatMoney(getOutstandingRent(tenantView.rentPayments))} due now</h2>
          <p>
            Your current lease, rent history, and maintenance requests are all tracked here. New requests appear immediately in this demo view.
          </p>
        </div>
        <div className="tenant-hero-actions">
          <span className="status">Autopay not enabled</span>
          <button className="button" type="button">
            <Receipt size={18} />
            View payments
          </button>
        </div>
      </section>

      <div className="grid cols-4" style={{ marginTop: 16 }}>
        <MetricCard
          detail={activeLease ? getUnitLabel(demoData, activeLease.unit_id) : "No active lease"}
          icon={<Home size={24} />}
          label="Current home"
          value={tenantView.units[0]?.unit_label ?? "None"}
        />
        <MetricCard
          detail={activeLease ? `Ends ${formatDate(activeLease.ends_on)}` : "No lease found"}
          icon={<KeyRound size={24} />}
          label="Lease"
          value={activeLease?.status.replace("_", " ") ?? "Missing"}
        />
        <MetricCard
          detail="Current balance"
          icon={<Receipt size={24} />}
          label="Rent due"
          value={formatMoney(getOutstandingRent(tenantView.rentPayments))}
        />
        <MetricCard
          detail="Open and completed"
          icon={<ClipboardList size={24} />}
          label="Requests"
          value={requestCount}
        />
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <section className="card" id="lease">
          <h2>Lease Details</h2>
          {activeLease ? (
            <div className="table-wrap">
              <table>
                <tbody>
                  <tr>
                    <th>Unit</th>
                    <td>{getUnitLabel(demoData, activeLease.unit_id)}</td>
                  </tr>
                  <tr>
                    <th>Start Date</th>
                    <td>{formatDate(activeLease.starts_on)}</td>
                  </tr>
                  <tr>
                    <th>End Date</th>
                    <td>{formatDate(activeLease.ends_on)}</td>
                  </tr>
                  <tr>
                    <th>Next Renewal</th>
                    <td>
                      <CalendarDays size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                      30 days before lease end
                    </td>
                  </tr>
                  <tr>
                    <th>Monthly Rent</th>
                    <td>{formatMoney(activeLease.monthly_rent)}</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>
                      <StatusBadge value={activeLease.status} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="card rent-card" id="rent">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Tenant ledger</p>
              <h2>Rent Payments</h2>
            </div>
            <StatusBadge value={getOutstandingRent(tenantView.rentPayments) > 0 ? "partial" : "paid"} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Due Date</th>
                  <th>Amount Due</th>
                  <th>Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenantView.rentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.due_on)}</td>
                    <td>{formatMoney(payment.amount_due)}</td>
                    <td>{formatMoney(payment.amount_paid)}</td>
                    <td>
                      <StatusBadge value={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <MaintenanceRequestPanel
        initialRequests={tenantView.maintenanceRequests}
        tenantId={tenantView.tenant.id}
        unitId={activeLease?.unit_id ?? tenantView.units[0]?.id ?? ""}
      />

      <TenantCalendar tenantId={tenantView.tenant.id} />
    </AppShell>
  );
}
