import { NextResponse } from "next/server";

import {
  createMaintenanceRequest,
  listMaintenanceRequests,
  updateMaintenanceRequest
} from "@/lib/server-maintenance-store";
import type { MaintenanceRequest } from "@/lib/types";

type CreateMaintenanceBody = {
  tenantId: string;
  unitId: string;
  title: string;
  description: string;
  availabilityWindow?: string;
  priority: MaintenanceRequest["priority"];
};

type UpdateMaintenanceBody = {
  id: string;
  action: "accept" | "reject" | "mn_confirm" | "complete";
};

export async function GET() {
  return NextResponse.json({
    requests: listMaintenanceRequests()
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateMaintenanceBody;

  if (!body.tenantId || !body.unitId || !body.title || !body.description) {
    return NextResponse.json(
      {
        ok: false,
        error: "tenantId, unitId, title, and description are required."
      },
      { status: 400 }
    );
  }

  const created = createMaintenanceRequest({
    tenant_id: body.tenantId,
    unit_id: body.unitId,
    title: body.title,
    description: body.description,
    availability_window: body.availabilityWindow,
    priority: body.priority ?? "normal"
  });

  return NextResponse.json({
    ok: true,
    request: created
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as UpdateMaintenanceBody;

  if (!body.id || !body.action) {
    return NextResponse.json(
      {
        ok: false,
        error: "id and action are required."
      },
      { status: 400 }
    );
  }

  const updates =
    body.action === "accept"
      ? { review_status: "accepted" as const, assigned_to: "maintenance-1", status: "open" as const }
      : body.action === "reject"
        ? { review_status: "rejected" as const }
        : body.action === "mn_confirm"
          ? { status: "in_progress" as const, mn_confirmed_at: new Date().toISOString() }
          : { status: "completed" as const };

  const updated = updateMaintenanceRequest(body.id, updates);

  if (!updated) {
    return NextResponse.json(
      {
        ok: false,
        error: "Request not found."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    request: updated
  });
}
