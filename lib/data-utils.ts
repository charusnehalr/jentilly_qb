import { demoData } from "./demo-data";
import type { DashboardData, Lease, MaintenanceRequest, RentPayment, Tenant, Unit } from "./types";

export function getUnitLabel(data: DashboardData, unitId: string) {
  const unit = data.units.find((item) => item.id === unitId);
  const property = unit ? data.properties.find((item) => item.id === unit.property_id) : undefined;
  return [property?.name, unit?.unit_label].filter(Boolean).join(" - ") || "Unknown unit";
}

export function getTenantName(data: DashboardData, tenantId: string) {
  return data.tenants.find((tenant) => tenant.id === tenantId)?.full_name ?? "Unknown tenant";
}

export function getLeaseTenant(data: DashboardData, lease: Lease): Tenant | undefined {
  return data.tenants.find((tenant) => tenant.id === lease.tenant_id);
}

export function getLeaseUnit(data: DashboardData, lease: Lease): Unit | undefined {
  return data.units.find((unit) => unit.id === lease.unit_id);
}

export function getPaymentLease(data: DashboardData, payment: RentPayment): Lease | undefined {
  return data.leases.find((lease) => lease.id === payment.lease_id);
}

export function getTenantViewData(profileId: string) {
  const tenant = demoData.tenants.find((item) => item.profile_id === profileId) ?? demoData.tenants[0];
  const leases = demoData.leases.filter((lease) => lease.tenant_id === tenant.id);
  const leaseIds = new Set(leases.map((lease) => lease.id));
  const unitIds = new Set(leases.map((lease) => lease.unit_id));

  return {
    tenant,
    leases,
    rentPayments: demoData.rentPayments.filter((payment) => leaseIds.has(payment.lease_id)),
    maintenanceRequests: demoData.maintenanceRequests.filter((request) => request.tenant_id === tenant.id),
    units: demoData.units.filter((unit) => unitIds.has(unit.id))
  };
}

export function getOpenMaintenanceCount(requests: MaintenanceRequest[]) {
  return requests.filter((request) => request.status !== "completed").length;
}

export function getOutstandingRent(payments: RentPayment[]) {
  return payments.reduce((total, payment) => total + Math.max(payment.amount_due - payment.amount_paid, 0), 0);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
