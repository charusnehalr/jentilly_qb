import { Building2, ClipboardList, Receipt, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { demoData } from "@/lib/demo-data";
import {
  formatDate,
  formatMoney,
  getOutstandingRent,
  getPaymentLease,
  getTenantName,
  getUnitLabel
} from "@/lib/data-utils";
import { LandlordRequestsPanel } from "./requests-panel";
import { LandlordLeasesPanel } from "./leases-panel";

export default function LandlordDashboardPage() {
  const openMaintenance = demoData.maintenanceRequests.filter((item) => item.status !== "completed");

  return (
    <AppShell role="landlord" subtitle="Maya Patel portfolio" title="Landlord Dashboard">
      <div className="grid cols-4">
        <MetricCard detail="Owned properties" icon={<Building2 size={24} />} label="Properties" value={demoData.properties.length} />
        <MetricCard detail="Current tenants" icon={<Users size={24} />} label="Tenants" value={demoData.tenants.length} />
        <MetricCard detail="Not completed" icon={<ClipboardList size={24} />} label="Open requests" value={openMaintenance.length} />
        <MetricCard
          detail="Due or partially paid"
          icon={<Receipt size={24} />}
          label="Outstanding rent"
          value={formatMoney(getOutstandingRent(demoData.rentPayments))}
        />
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <section className="card" id="properties">
          <h2>Properties and Units</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Address</th>
                  <th>Units</th>
                </tr>
              </thead>
              <tbody>
                {demoData.properties.map((property) => (
                  <tr key={property.id}>
                    <td>{property.name}</td>
                    <td>{property.address}</td>
                    <td>{demoData.units.filter((unit) => unit.property_id === property.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <LandlordLeasesPanel />
      </div>

      <LandlordRequestsPanel initialRequests={demoData.maintenanceRequests} />

      <section className="card" id="rent" style={{ marginTop: 16 }}>
        <h2>Rent Tracking</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Due Date</th>
                <th>Amount Due</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {demoData.rentPayments.map((payment) => {
                const lease = getPaymentLease(demoData, payment);
                return (
                  <tr key={payment.id}>
                    <td>{lease ? getTenantName(demoData, lease.tenant_id) : "Unknown tenant"}</td>
                    <td>{formatDate(payment.due_on)}</td>
                    <td>{formatMoney(payment.amount_due)}</td>
                    <td>{formatMoney(payment.amount_paid)}</td>
                    <td>
                      <StatusBadge value={payment.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
