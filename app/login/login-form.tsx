"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn } from "lucide-react";

import { findProfileByCredentials } from "@/lib/demo-data";
import type { UserRole } from "@/lib/types";

const roleRoutes: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  landlord: "/dashboard/landlord",
  maintenance: "/dashboard/maintenance",
  tenant: "/dashboard/tenant"
};

export function LoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const profile = findProfileByCredentials(loginId, password);

    if (!profile) {
      setError("Invalid login ID or password.");
      return;
    }

    window.localStorage.setItem(
      "property-session",
      JSON.stringify({
        loginId: profile.login_id,
        role: profile.role,
        profileId: profile.id
      })
    );

    const route =
      profile.role === "tenant" ? `${roleRoutes.tenant}?tenantId=${profile.id}` : roleRoutes[profile.role];
    router.push(route);
  }

  return (
    <form className="auth-card card" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="login">Login ID</label>
        <input id="login" onChange={(event) => setLoginId(event.target.value)} value={loginId} />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </div>

      <p className="form-error">{error}</p>

      <button className="button" type="submit">
        <LogIn size={18} />
        Login
      </button>

      <div className="login-help">
        <KeyRound size={18} />
        <div>
          <strong>Default accounts</strong>
          <span>admin / admin</span>
          <span>landlord / landlord</span>
          <span>MN / MN</span>
          <span>tenant001 / pass001 through tenant100 / pass100</span>
        </div>
      </div>
    </form>
  );
}
