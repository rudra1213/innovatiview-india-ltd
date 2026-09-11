import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  WalletCards,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/Auth";
import { useToast } from "../context/Toast";
import { errorMessage } from "../api";
import { Brand, initials } from "./UI";
export default function Layout() {
  const { user, logout } = useAuth();
  const notify = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const nav = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    {
      to: "/expenses",
      label: user.role === "Employee" ? "My expenses" : "Expense requests",
      icon: ReceiptText,
    },
    ...(user.role === "Admin"
      ? [
          { to: "/reimbursements", label: "Reimbursements", icon: WalletCards },
          { to: "/users", label: "People & teams", icon: Users },
        ]
      : []),
    { to: "/settings", label: "Settings", icon: Settings },
  ];
  const current =
    nav.find((n) => location.pathname.startsWith(n.to))?.label ||
    "Expense requests";
  async function signOut() {
    setLeaving(true);
    try {
      await logout();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setLeaving(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand light />
          <button
            className="mobile-only icon-button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">COMPANY WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={24} />
          <strong>Every expense. Accounted for.</strong>
          <p>A clear path from submission to reimbursement.</p>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role} account</span>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            title="Sign out"
            disabled={leaving}
            onClick={signOut}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            <span className="workspace-chip">
              <i />
              {user.role} workspace
            </span>
            <div className="avatar avatar-small">{initials(user.name)}</div>
          </div>
        </header>
        <main id="main">
          <Outlet />
        </main>
        <footer className="footer">
          <span>© {new Date().getFullYear()} Innovatiview India Ltd.</span>
          <span>Expense Management System · INR</span>
        </footer>
      </div>
    </div>
  );
}
