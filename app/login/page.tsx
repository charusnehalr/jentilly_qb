import { LoginForm } from "./login-form";
import { propertyName } from "@/lib/demo-data";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-hero-top">
          <div className="brand">
            <span className="brand-mark">J</span>
            <span>{propertyName}</span>
          </div>
          <span className="auth-pill">Single property portal</span>
        </div>
        <div className="auth-hero-copy">
          <p className="eyebrow">Jentilly resident management</p>
          <h1>Rent, leases, tenants, and maintenance for The Place on Jentilly.</h1>
          <p>
            One login routes each account to the right dashboard. Admins see every user, landlords manage the property, and tenants view rent or submit maintenance.
          </p>
          <div className="auth-stats" aria-label="Property dashboard highlights">
            <div>
              <strong>100</strong>
              <span>tenant accounts</span>
            </div>
            <div>
              <strong>70</strong>
              <span>private suites</span>
            </div>
            <div>
              <strong>30</strong>
              <span>shared rooms</span>
            </div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-header">
          <p className="eyebrow">Welcome back</p>
          <h2>Login to your property account.</h2>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
