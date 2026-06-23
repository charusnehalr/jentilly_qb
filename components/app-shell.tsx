import Link from "next/link";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Gauge,
  Home,
  KeyRound,
  LogOut,
  Receipt,
  Wrench,
  Users
} from "lucide-react";

import type { UserRole } from "@/lib/types";
import { propertyName } from "@/lib/demo-data";

const navByRole: Record<UserRole, { href: string; label: string; icon: React.ReactNode }[]> = {
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: <Gauge size={18} /> },
    { href: "/dashboard/admin#users", label: "Users", icon: <Users size={18} /> },
    { href: "/dashboard/admin#properties", label: "Properties", icon: <Building2 size={18} /> },
    { href: "/dashboard/admin#maintenance", label: "Maintenance", icon: <ClipboardList size={18} /> }
  ],
  landlord: [
    { href: "/dashboard/landlord", label: "Overview", icon: <Gauge size={18} /> },
    { href: "/dashboard/landlord#properties", label: "Properties", icon: <Building2 size={18} /> },
    { href: "/dashboard/landlord#tenants", label: "Tenants", icon: <Users size={18} /> },
    { href: "/dashboard/landlord#requests", label: "Requests", icon: <ClipboardList size={18} /> },
    { href: "/dashboard/landlord#rent", label: "Rent", icon: <Receipt size={18} /> }
  ],
  maintenance: [
    { href: "/dashboard/maintenance", label: "Repair Queue", icon: <Wrench size={18} /> },
    { href: "/dashboard/maintenance#accepted", label: "Accepted Jobs", icon: <ClipboardList size={18} /> }
  ],
  tenant: [
    { href: "/dashboard/tenant", label: "Overview", icon: <Gauge size={18} /> },
    { href: "/dashboard/tenant#lease", label: "Lease", icon: <KeyRound size={18} /> },
    { href: "/dashboard/tenant#rent", label: "Rent", icon: <Receipt size={18} /> },
    { href: "/dashboard/tenant#maintenance", label: "Maintenance", icon: <ClipboardList size={18} /> },
    { href: "/dashboard/tenant#calendar", label: "Calendar", icon: <CalendarDays size={18} /> }
  ]
};

export function AppShell({
  children,
  role,
  title,
  subtitle
}: {
  children: React.ReactNode;
  role: UserRole;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Home size={20} />
          </span>
          <span>{propertyName}</span>
        </div>
        <nav className="nav" aria-label={`${role} navigation`}>
          {navByRole[role].map((item, index) => (
            <Link className={index === 0 ? "active" : ""} href={item.href} key={item.href}>
              {item.icon}
              {item.label}
            </Link>
          ))}
          <Link href="/login">
            <LogOut size={18} />
            Sign out
          </Link>
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{subtitle}</p>
            <h1>{title}</h1>
          </div>
          <span className="status">{role}</span>
        </header>
        {children}
      </main>
    </div>
  );
}
