import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useAuth } from "../context/Auth";
import { useResource } from "../api";
import ExpenseTable from "../components/ExpenseTable";
import { PageHead, ErrorBox, Spinner, Pagination } from "../components/UI";
export default function Expenses({ payments = false }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") || "";
  const paymentStatus = params.get("paymentStatus") || "";
  useEffect(() => setSearch(params.get("search") || ""), [params]);
  const query = new URLSearchParams({ page: String(page), limit: "15" });
  if (params.get("search")) query.set("search", params.get("search"));
  if (payments || status) query.set("status", payments ? "Approved" : status);
  if (paymentStatus) query.set("paymentStatus", paymentStatus);
  const { data, loading, error, refresh } = useResource(`/expenses?${query}`);
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };
  return (
    <>
      <PageHead
        title={
          payments
            ? "Reimbursements"
            : user.role === "Employee"
              ? "My expenses"
              : "Expense requests"
        }
        description={
          payments
            ? "Track approved expenses and record completed reimbursements."
            : user.role === "Employee"
              ? "Submit, track, and manage your business expenses."
              : "Review expenses, inspect receipts, and follow every decision."
        }
      >
        <button className="btn btn-secondary" onClick={refresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
        {user.role === "Employee" && (
          <Link className="btn btn-primary" to="/expenses/new">
            <Plus size={17} />
            New expense
          </Link>
        )}
      </PageHead>
      <section className="panel">
        <div className="table-toolbar">
          {!payments ? (
            <div className="tabs" aria-label="Filter expenses">
              {["", "Pending", "Approved", "Rejected"].map((s) => (
                <button
                  key={s}
                  className={status === s ? "active" : ""}
                  onClick={() => update("status", s)}
                >
                  {s || "All expenses"}
                </button>
              ))}
            </div>
          ) : (
            <div className="tabs" aria-label="Filter payments">
              {["", "Pending Payment", "Paid"].map((s) => (
                <button
                  key={s}
                  className={paymentStatus === s ? "active" : ""}
                  onClick={() => update("paymentStatus", s)}
                >
                  {s || "All approved"}
                </button>
              ))}
            </div>
          )}
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              update("search", search);
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search expenses"
              placeholder="Search expenses or people…"
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
        </div>
        <ErrorBox message={error} onRetry={refresh} />
        {loading ? (
          <Spinner />
        ) : (
          data && (
            <>
              <ExpenseTable items={data.items} />
              <Pagination
                page={page}
                pages={data.pages}
                total={data.total}
                onPage={(p) => update("page", String(p))}
              />
            </>
          )
        )}
      </section>
    </>
  );
}
