import { Building2, ClipboardList, Receipt, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { demoData } from "@/lib/demo-data";
import { formatMoney, getOutstandingRent, getTenantName, getUnitLabel } from "@/lib/data-utils";

export default function AdminDashboardPage() {
  const openMaintenance = demoData.maintenanceRequests.filter((item) => item.status !== "completed");
  const tenantUsers = demoData.profiles.filter((profile) => profile.role === "tenant");

  return (
    <AppShell role="admin" subtitle="The Place on Jentilly" title="Admin Dashboard">
      <div className="grid cols-4">
        <MetricCard detail="Admin, landlord, and tenants" icon={<Users size={24} />} label="Users" value={demoData.profiles.length} />
        <MetricCard detail="The Place on Jentilly" icon={<Building2 size={24} />} label="Properties" value={demoData.properties.length} />
        <MetricCard detail="Private and shared residents" icon={<Users size={24} />} label="Tenants" value={tenantUsers.length} />
        <MetricCard detail="Needs attention" icon={<ClipboardList size={24} />} label="Open requests" value={openMaintenance.length} />
      </div>

      <section className="card" id="users" style={{ marginTop: 16 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Account manager</p>
            <h2>Users and Login Details</h2>
          </div>
          <span className="status">{demoData.profiles.length} accounts</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Login ID</th>
                <th>Password</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {demoData.profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>{profile.login_id}</td>
                  <td>{profile.password}</td>
                  <td>{profile.full_name}</td>
                  <td>{profile.email}</td>
                  <td>
                    <StatusBadge value={profile.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" id="properties" style={{ marginTop: 16 }}>
        <h2>Property Dataset</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Address</th>
                <th>Units</th>
                <th>Outstanding Rent</th>
              </tr>
            </thead>
            <tbody>
              {demoData.properties.map((property) => (
                <tr key={property.id}>
                  <td>{property.name}</td>
                  <td>{property.address}</td>
                  <td>{demoData.units.filter((unit) => unit.property_id === property.id).length}</td>
                  <td>{formatMoney(getOutstandingRent(demoData.rentPayments))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" id="maintenance" style={{ marginTop: 16 }}>
        <h2>Maintenance Requests</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {demoData.maintenanceRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.title}</td>
                  <td>{getTenantName(demoData, request.tenant_id)}</td>
                  <td>{getUnitLabel(demoData, request.unit_id)}</td>
                  <td>
                    <StatusBadge value={request.priority} />
                  </td>
                  <td>
                    <StatusBadge value={request.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
