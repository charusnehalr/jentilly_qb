export type UserRole = "admin" | "landlord" | "maintenance" | "tenant";

export type Profile = {
  id: string;
  login_id: string;
  password: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
};

export type Property = {
  id: string;
  landlord_id: string;
  name: string;
  address: string;
};

export type Unit = {
  id: string;
  property_id: string;
  unit_label: string;
  housing_type: "private" | "shared";
  bedrooms: number;
  bathrooms: number;
};

export type Tenant = {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
};

export type Lease = {
  id: string;
  tenant_id: string;
  unit_id: string;
  starts_on: string;
  ends_on: string;
  monthly_rent: number;
  status: "active" | "ending_soon" | "expired";
};

export type RentPayment = {
  id: string;
  lease_id: string;
  due_on: string;
  amount_due: number;
  amount_paid: number;
  status: "paid" | "partial" | "overdue" | "upcoming";
};

export type MaintenanceRequest = {
  id: string;
  tenant_id: string;
  unit_id: string;
  title: string;
  description: string;
  availability_window?: string;
  priority: "low" | "normal" | "urgent";
  status: "open" | "in_progress" | "completed";
  review_status: "pending" | "accepted" | "rejected";
  assigned_to?: string;
  mn_confirmed_at?: string;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  actor: string;
  summary: string;
  created_at: string;
};

export type DashboardData = {
  profiles: Profile[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  rentPayments: RentPayment[];
  maintenanceRequests: MaintenanceRequest[];
  activityLogs: ActivityLog[];
};
