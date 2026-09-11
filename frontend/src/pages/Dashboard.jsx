import { Link } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  Clock3,
  CheckCircle2,
  XCircle,
  ReceiptText,
  Users,
  BriefcaseBusiness,
  IndianRupee,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/Auth";
import { useResource } from "../api";
import { PageHead, Spinner, ErrorBox, money, Empty } from "../components/UI";
import ExpenseTable from "../components/ExpenseTable";
export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useResource("/dashboard");
  if (loading) return <Spinner label="Loading your workspace…" />;
  if (!data) return <ErrorBox message={error} onRetry={refresh} />;
  const s = data.stats;
  const cards =
    user.role === "Admin"
      ? [
          {
            label: "Total employees",
            value: s.employees,
            note: `${s.activeEmployees} active`,
            icon: Users,
            color: "blue",
          },
          {
            label: "Total managers",
            value: s.managers,
            note: `${s.activeManagers} active`,
            icon: BriefcaseBusiness,
            color: "purple",
          },
          {
            label: "Total requests",
            value: s.total,
            note: "Across the company",
            icon: ReceiptText,
            color: "blue",
          },
          {
            label: "Pending requests",
            value: s.pending,
            note: money(s.pendingAmount),
            icon: Clock3,
            color: "amber",
          },
          {
            label: "Approved requests",
            value: s.approved,
            note: money(s.approvedAmount),
            icon: CheckCircle2,
            color: "green",
          },
          {
            label: "Rejected requests",
            value: s.rejected,
            note: money(s.rejectedAmount),
            icon: XCircle,
            color: "red",
          },
        ]
      : [
          {
            label:
              user.role === "Employee" ? "Total expenses" : "Total requests",
            value: s.total,
            note: "All submissions",
            icon: ReceiptText,
            color: "blue",
          },
          {
            label: user.role === "Employee" ? "Pending" : "Pending requests",
            value: s.pending,
            note: "Awaiting review",
            icon: Clock3,
            color: "amber",
          },
          {
            label: "Approved",
            value: s.approved,
            note: "Ready for reimbursement",
            icon: CheckCircle2,
            color: "green",
          },
          {
            label: "Rejected",
            value: s.rejected,
            note: "Review the feedback",
            icon: XCircle,
            color: "red",
          },
        ];
  const firstName = user.name.split(" ")[0];
  return (
    <>
      <PageHead
        eyebrow={`${user.role.toUpperCase()} OVERVIEW`}
        title={`Welcome back, ${firstName}`}
        description={
          user.role === "Employee"
            ? "Your expenses, approvals, and reimbursements at a glance."
            : user.role === "Manager"
              ? "Keep your team’s expense approvals moving."
              : "A clear view of company spending and team activity."
        }
      >
        <button className="btn btn-secondary" onClick={refresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
        {user.role === "Employee" && (
          <Link className="btn btn-primary" to="/expenses/new">
            <Plus size={18} />
            New expense
          </Link>
        )}
      </PageHead>
      <ErrorBox message={error} onRetry={refresh} />
      <div className="overview-grid">
        <section className="balance-card">
          <div className="balance-heading">
            <span>
              {user.role === "Manager"
                ? "TOTAL APPROVED AMOUNT"
                : "TOTAL EXPENSE AMOUNT"}
            </span>
            <IndianRupee size={21} />
          </div>
          <div className="balance-value">
            {money(user.role === "Manager" ? s.approvedAmount : s.totalAmount)}
          </div>
          <p>
            {user.role === "Employee"
              ? "Every business expense, in one place."
              : "All-time expenses · Indian Rupee (INR)"}
          </p>
          <div className="balance-bottom">
            <div>
              <span>Pending payment</span>
              <strong>{money(s.unpaidAmount)}</strong>
            </div>
            <div>
              <span>Reimbursed</span>
              <strong>{money(s.paidAmount)}</strong>
            </div>
          </div>
        </section>
        <section className="next-card">
          <div className="next-icon">
            <Clock3 size={23} />
          </div>
          <span className="eyebrow">NEXT IN LINE</span>
          <h2>
            {s.pending === 0
              ? "You’re all caught up"
              : `${s.pending} ${s.pending === 1 ? "request awaits" : "requests await"} review`}
          </h2>
          <p>
            {user.role === "Employee"
              ? "Track the progress of your submitted requests and view feedback from your manager."
              : "Review receipts and expense details to give every request a clear next step."}
          </p>
          <Link className="text-link" to="/expenses?status=Pending">
            View pending expenses
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div
        className={`stat-grid ${user.role === "Admin" ? "admin-stats" : ""}`}
      >
        {cards.map(({ label, value, note, icon: Icon, color }) => (
          <section className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <div className={`stat-icon ${color}`}>
                <Icon size={18} />
              </div>
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </section>
        ))}
      </div>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent expenses</h2>
              <p>The latest activity in your workspace</p>
            </div>
            <Link className="text-link" to="/expenses">
              View all
              <ArrowRight size={15} />
            </Link>
          </div>
          <ExpenseTable items={data.recent} compact />
        </section>
        <section className="panel spending-panel">
          <div className="panel-heading">
            <div>
              <h2>Spending breakdown</h2>
              <p>All requests by category</p>
            </div>
          </div>
          {data.categories.length ? (
            <div className="category-list">
              {data.categories.map((c, i) => (
                <div key={c.category}>
                  <div className="category-label">
                    <span>
                      <i
                        style={{
                          background: [
                            "#397eec",
                            "#35a995",
                            "#aa82d7",
                            "#dfae5a",
                            "#83a3b8",
                            "#c88493",
                          ][i % 6],
                        }}
                      />
                      {c.category}
                    </span>
                    <strong>{money(c.amount)}</strong>
                  </div>
                  <div className="bar-track">
                    <i
                      style={{
                        width: `${s.totalAmount ? (c.amount / s.totalAmount) * 100 : 0}%`,
                        background: [
                          "#397eec",
                          "#35a995",
                          "#aa82d7",
                          "#dfae5a",
                          "#83a3b8",
                          "#c88493",
                        ][i % 6],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="A fresh start"
              description="Category totals appear after the first submission."
            />
          )}
          <div className="spending-total">
            <Wallet size={17} />
            <span>Approved total</span>
            <strong>{money(s.approvedAmount)}</strong>
          </div>
        </section>
      </div>
      <p className="refresh-note">
        Totals refresh every 20 seconds and when you return to this window.
      </p>
    </>
  );
}
