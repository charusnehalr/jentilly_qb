import type {
  ActivityLog,
  DashboardData,
  Lease,
  MaintenanceRequest,
  Profile,
  Property,
  RentPayment,
  Tenant,
  Unit
} from "./types";

export const propertyName = "The Place on Jentilly";

const adminProfile: Profile = {
  id: "admin-1",
  login_id: "admin",
  password: "admin",
  email: "admin@theplaceonjentilly.com",
  full_name: "Admin User",
  role: "admin"
};

const landlordProfile: Profile = {
  id: "landlord-1",
  login_id: "landlord",
  password: "landlord",
  email: "landlord@theplaceonjentilly.com",
  full_name: "Maya Patel",
  role: "landlord"
};

const maintenanceProfile: Profile = {
  id: "maintenance-1",
  login_id: "MN",
  password: "MN",
  email: "maintenance@theplaceonjentilly.com",
  full_name: "Maintenance Team",
  role: "maintenance"
};

const firstNames = [
  "Aarav",
  "Abigail",
  "Adrian",
  "Aisha",
  "Amelia",
  "Andre",
  "Anika",
  "Arjun",
  "Bella",
  "Caleb",
  "Camila",
  "Carlos",
  "Chloe",
  "Daniel",
  "Diego",
  "Elena",
  "Ethan",
  "Fatima",
  "Gabriel",
  "Grace",
  "Hannah",
  "Ibrahim",
  "Isabella",
  "Jasmine",
  "Jordan",
  "Kai",
  "Layla",
  "Leo",
  "Liam",
  "Maya",
  "Mia",
  "Nadia",
  "Noah",
  "Olivia",
  "Omar",
  "Priya",
  "Rafael",
  "Riya",
  "Sam",
  "Sarah"
];

const lastNames = [
  "Adams",
  "Ahmed",
  "Baker",
  "Brooks",
  "Chen",
  "Davis",
  "Diaz",
  "Garcia",
  "Gupta",
  "Harris",
  "Johnson",
  "Khan",
  "Kim",
  "Lee",
  "Lopez",
  "Martin",
  "Miller",
  "Nair",
  "Nguyen",
  "Patel",
  "Ramirez",
  "Rivera",
  "Robinson",
  "Shah",
  "Singh",
  "Smith",
  "Taylor",
  "Thomas",
  "Walker",
  "Wilson"
];

const privateUnits: Unit[] = Array.from({ length: 70 }, (_, index) => {
  const number = index + 1;
  return {
    id: `unit-private-${number.toString().padStart(3, "0")}`,
    property_id: "property-jentilly",
    unit_label: `Private Suite ${number.toString().padStart(3, "0")}`,
    housing_type: "private",
    bedrooms: number % 5 === 0 ? 2 : 1,
    bathrooms: number % 6 === 0 ? 2 : 1
  };
});

const sharedUnits: Unit[] = Array.from({ length: 10 }, (_, houseIndex) =>
  Array.from({ length: 3 }, (_, roomIndex) => {
    const house = String.fromCharCode(65 + houseIndex);
    const room = roomIndex + 1;
    return {
      id: `unit-shared-${house.toLowerCase()}-${room}`,
      property_id: "property-jentilly",
      unit_label: `Shared House ${house} - Room ${room}`,
      housing_type: "shared" as const,
      bedrooms: 1,
      bathrooms: 1
    };
  })
).flat();

const units: Unit[] = [...privateUnits, ...sharedUnits];

const tenantProfiles: Profile[] = Array.from({ length: 100 }, (_, index) => {
  const number = index + 1;
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[(index * 7) % lastNames.length];
  const loginNumber = number.toString().padStart(3, "0");

  return {
    id: `tenant-profile-${loginNumber}`,
    login_id: `tenant${loginNumber}`,
    password: `pass${loginNumber}`,
    email: `tenant${loginNumber}@theplaceonjentilly.com`,
    full_name: `${firstName} ${lastName}`,
    role: "tenant"
  };
});

const tenants: Tenant[] = tenantProfiles.map((profile, index) => ({
  id: `tenant-record-${(index + 1).toString().padStart(3, "0")}`,
  profile_id: profile.id,
  full_name: profile.full_name,
  email: profile.email,
  phone: `480-555-${(1000 + index).toString().slice(-4)}`
}));

const leases: Lease[] = tenants.map((tenant, index) => {
  const unit = units[index];
  const isShared = unit.housing_type === "shared";
  const month = (index % 12) + 1;
  const startMonth = month.toString().padStart(2, "0");
  const status = index % 19 === 0 ? "ending_soon" : "active";

  return {
    id: `lease-${(index + 1).toString().padStart(3, "0")}`,
    tenant_id: tenant.id,
    unit_id: unit.id,
    starts_on: `2025-${startMonth}-01`,
    ends_on: status === "ending_soon" ? "2026-07-31" : `2026-${startMonth}-28`,
    monthly_rent: isShared ? 725 + (index % 4) * 75 : 1150 + (index % 8) * 90,
    status
  };
});

const rentPayments: RentPayment[] = leases.map((lease, index) => {
  const remainder = index % 10;
  const amountPaid =
    remainder === 0 ? 0 : remainder === 1 || remainder === 2 ? Math.round(lease.monthly_rent / 2) : lease.monthly_rent;

  return {
    id: `rent-${(index + 1).toString().padStart(3, "0")}`,
    lease_id: lease.id,
    due_on: "2026-06-01",
    amount_due: lease.monthly_rent,
    amount_paid: amountPaid,
    status: amountPaid === 0 ? "overdue" : amountPaid < lease.monthly_rent ? "partial" : "paid"
  };
});

const maintenanceTemplates = [
  ["Leaking faucet", "Bathroom faucet is leaking under the sink.", "normal"],
  ["AC not cooling", "Room is not cooling properly in the afternoon.", "urgent"],
  ["Washer issue", "Shared laundry washer stops mid-cycle.", "normal"],
  ["Light fixture", "Bedroom light flickers and needs inspection.", "low"],
  ["Window lock", "Window lock is loose and does not latch fully.", "normal"],
  ["Garbage disposal", "Kitchen garbage disposal is jammed.", "normal"],
  ["Internet outlet", "Ethernet outlet is not working in the room.", "low"],
  ["Shower drain", "Shower drain is slow and backs up.", "normal"]
] as const;

const maintenanceRequests: MaintenanceRequest[] = tenants.slice(0, 28).map((tenant, index) => {
  const template = maintenanceTemplates[index % maintenanceTemplates.length];
  const isUrgent = template[2] === "urgent";

  return {
    id: `maintenance-${(index + 1).toString().padStart(3, "0")}`,
    tenant_id: tenant.id,
    unit_id: leases[index].unit_id,
    title: template[0],
    description: template[1],
    availability_window: `2026-06-${(24 + (index % 5)).toString().padStart(2, "0")}T${index % 2 === 0 ? "17:00" : "10:00"}`,
    priority: template[2],
    status: index % 5 === 0 ? "completed" : index % 3 === 0 ? "in_progress" : "open",
    review_status: isUrgent ? "accepted" : "pending",
    assigned_to: isUrgent ? maintenanceProfile.id : undefined,
    mn_confirmed_at: isUrgent && index % 3 === 0 ? `2026-06-${(2 + (index % 22)).toString().padStart(2, "0")}T12:00:00.000Z` : undefined,
    created_at: `2026-06-${(1 + (index % 22)).toString().padStart(2, "0")}T16:12:00.000Z`
  };
});

const activityLogs: ActivityLog[] = [
  {
    id: "activity-1",
    actor: "System",
    summary: "Loaded 100 tenant accounts for The Place on Jentilly.",
    created_at: "2026-06-22T08:00:00.000Z"
  },
  {
    id: "activity-2",
    actor: "Maintenance",
    summary: "Queued open maintenance requests for landlord review.",
    created_at: "2026-06-22T09:30:00.000Z"
  },
  {
    id: "activity-3",
    actor: "Rent Ledger",
    summary: "Calculated paid, partial, and overdue June rent balances.",
    created_at: "2026-06-22T10:15:00.000Z"
  }
];

const properties: Property[] = [
  {
    id: "property-jentilly",
    landlord_id: landlordProfile.id,
    name: propertyName,
    address: "Jentilly Lane, Tempe, AZ"
  }
];

export const demoProfiles: Profile[] = [adminProfile, landlordProfile, maintenanceProfile, ...tenantProfiles];

export const demoData: DashboardData = {
  profiles: demoProfiles,
  properties,
  units,
  tenants,
  leases,
  rentPayments,
  maintenanceRequests,
  activityLogs
};

export function findProfileByCredentials(loginId: string, password: string) {
  return demoProfiles.find(
    (profile) =>
      profile.login_id.toLowerCase() === loginId.trim().toLowerCase() &&
      profile.password === password
  );
}
