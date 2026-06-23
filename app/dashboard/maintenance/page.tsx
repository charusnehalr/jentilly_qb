import { Wrench } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MaintenanceQueue } from "./queue";

export default function MaintenanceDashboardPage() {
  return (
    <AppShell role="maintenance" subtitle="The Place on Jentilly" title="Maintenance Dashboard">
      <section className="tenant-hero">
        <div>
          <p className="eyebrow">Approved repair queue</p>
          <h2>Urgent jobs first, approved normal jobs after</h2>
          <p>
            Urgent requests appear here immediately. Normal requests join this calendar only after the landlord accepts them.
          </p>
        </div>
        <div className="tenant-hero-actions">
          <span className="status warn">
            <Wrench size={16} />
            MN account
          </span>
        </div>
      </section>

      <MaintenanceQueue />
    </AppShell>
  );
}
