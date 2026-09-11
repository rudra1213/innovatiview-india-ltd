import { Link } from "react-router-dom";
import { ArrowUpRight, Check, X, Paperclip } from "lucide-react";
import { useAuth } from "../context/Auth";
import { Badge, Empty, initials, money, dateLabel, refLabel } from "./UI";
export default function ExpenseTable({ items, compact = false }) {
  const { user } = useAuth();
  if (!items?.length)
    return (
      <Empty
        title="No requests to show"
        description="New requests and matching results will appear here."
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Expense</th>
            {user.role !== "Employee" && <th>Employee</th>}
            <th>Amount</th>
            <th>Status</th>
            {!compact && <th>Payment</th>}
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e._id}>
              <td>
                <Link className="expense-title" to={`/expenses/${e._id}`}>
                  {e.title}
                </Link>
                <span className="table-sub">
                  <Paperclip size={12} />
                  {e.category}
                  <span>·</span>
                  {dateLabel(e.date)}
                </span>
              </td>
              {user.role !== "Employee" && (
                <td>
                  <div className="person-cell">
                    <div className="avatar avatar-small">
                      {initials(e.employeeId?.name)}
                    </div>
                    <div>
                      <strong>
                        {e.employeeId?.name || "Unavailable user"}
                      </strong>
                      <span className="table-sub">{refLabel(e._id)}</span>
                    </div>
                  </div>
                </td>
              )}
              <td className="amount-cell">{money(e.amount)}</td>
              <td>
                <Badge status={e.status} />
              </td>
              {!compact && (
                <td>
                  {e.status === "Approved" ? (
                    <Badge status={e.paymentStatus} />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              )}
              <td>
                <div className="row-actions">
                  {e.status === "Pending" &&
                    user.role !== "Employee" &&
                    !compact && (
                      <>
                        <Link
                          className="icon-button approve"
                          title="Review and approve"
                          aria-label={`Approve ${e.title}`}
                          to={`/expenses/${e._id}?action=approve`}
                        >
                          <Check size={17} />
                        </Link>
                        <Link
                          className="icon-button reject"
                          title="Review and reject"
                          aria-label={`Reject ${e.title}`}
                          to={`/expenses/${e._id}?action=reject`}
                        >
                          <X size={17} />
                        </Link>
                      </>
                    )}
                  <Link
                    className="icon-button"
                    aria-label={`View ${e.title}`}
                    to={`/expenses/${e._id}`}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
