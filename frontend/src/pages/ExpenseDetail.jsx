import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Check,
  X,
  Pencil,
  Trash2,
  Download,
  FileText,
  CheckCircle2,
  Clock3,
  Wallet,
  UserRound,
  ArrowRightLeft,
} from "lucide-react";
import { api, errorMessage, useResource } from "../api";
import { useAuth } from "../context/Auth";
import { useToast } from "../context/Toast";
import {
  Badge,
  ErrorBox,
  Field,
  Modal,
  PageHead,
  Spinner,
  money,
  dateLabel,
  timeLabel,
  refLabel,
} from "../components/UI";
function Receipt({ expense }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true,
      objectUrl;
    setBusy(true);
    setError("");
    setUrl("");
    api
      .get(`/expenses/${expense._id}/receipt`, { responseType: "blob" })
      .then((r) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(
          new Blob([r.data], { type: expense.receipt.mimeType }),
        );
        setUrl(objectUrl);
      })
      .catch(() => {
        if (alive) setError("Could not load receipt. Please try again.");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [expense._id, expense.revision, expense.receipt.mimeType, version]);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Supporting receipt</h2>
          <p>
            {expense.receipt.filename} ·{" "}
            {(expense.receipt.size / 1024).toFixed(0)} KB
          </p>
        </div>
      </div>
      <div className="receipt-view">
        <ErrorBox message={error} onRetry={() => setVersion((v) => v + 1)} />
        {busy ? (
          <Spinner label="Loading receipt…" />
        ) : (
          url && (
            <>
              {expense.receipt.mimeType.startsWith("image/") ? (
                <a href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Receipt for ${expense.title}`} />
                </a>
              ) : (
                <div className="pdf-preview">
                  <FileText size={48} />
                  <strong>PDF receipt</strong>
                  <p>Open the original document to review the bill.</p>
                </div>
              )}
              <div className="receipt-links">
                <a
                  className="btn btn-secondary"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open receipt
                </a>
                <a
                  className="btn btn-secondary"
                  href={url}
                  download={expense.receipt.filename}
                >
                  <Download size={16} />
                  Download
                </a>
              </div>
            </>
          )
        )}
      </div>
    </section>
  );
}
export default function ExpenseDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useResource(
    `/expenses/${id}`,
    false,
  );
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [managers, setManagers] = useState([]);
  const [managerId, setManagerId] = useState("");
  const expense = data?.expense;
  useEffect(() => {
    const intent = params.get("action");
    if (
      expense?.status === "Pending" &&
      user.role !== "Employee" &&
      ["approve", "reject"].includes(intent)
    ) {
      setAction(intent);
      setNote("");
      setActionError("");
      setParams({}, { replace: true });
    }
  }, [expense, params, setParams, user.role]);
  const openAction = async (type) => {
    setAction(type);
    setNote("");
    setActionError("");
    if (type === "reassign") {
      setManagerId(expense.managerId?._id || "");
      try {
        setManagers((await api.get("/users/managers")).data.items);
      } catch (e) {
        setActionError(errorMessage(e));
      }
    }
  };
  async function commit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (action === "withdraw") {
        await api.delete(`/expenses/${id}`, {
          data: { revision: expense.revision },
        });
        notify("Expense withdrawn.");
        navigate("/expenses");
        return;
      }
      if (action === "paid")
        await api.patch(`/expenses/${id}/payment`, {
          reference: note,
          revision: expense.revision,
        });
      else if (action === "reassign")
        await api.patch(`/expenses/${id}/manager`, {
          managerId,
          revision: expense.revision,
        });
      else
        await api.patch(`/expenses/${id}/review`, {
          status: action === "approve" ? "Approved" : "Rejected",
          reason: note,
          revision: expense.revision,
        });
      notify(
        action === "paid"
          ? "Reimbursement marked as paid."
          : action === "reassign"
            ? "Request reassigned."
            : `Expense ${action === "approve" ? "approved" : "rejected"}.`,
      );
      setAction(null);
      refresh();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Spinner label="Loading expense details…" />;
  if (!expense)
    return (
      <>
        <Link className="back-link" to="/expenses">
          <ArrowLeft size={16} />
          Back to expenses
        </Link>
        <ErrorBox message={error} onRetry={refresh} />
      </>
    );
  const pending = expense.status === "Pending";
  const actionTitles = {
    approve: "Approve expense",
    reject: "Reject expense",
    paid: "Record reimbursement",
    withdraw: "Withdraw expense",
    reassign: "Reassign request",
  };
  return (
    <>
      <Link className="back-link" to="/expenses">
        <ArrowLeft size={16} />
        Back to expenses
      </Link>
      <PageHead
        eyebrow={refLabel(expense._id)}
        title={expense.title}
        description={`Submitted ${dateLabel(expense.createdAt)} by ${expense.employeeId?.name || "Unavailable user"}`}
      >
        <button className="btn btn-secondary" onClick={refresh}>
          Refresh
        </button>
        {pending && user.role === "Employee" && (
          <>
            <Link className="btn btn-secondary" to={`/expenses/${id}/edit`}>
              <Pencil size={16} />
              Edit
            </Link>
            <button
              className="btn btn-danger-outline"
              onClick={() => openAction("withdraw")}
            >
              <Trash2 size={16} />
              Withdraw
            </button>
          </>
        )}
        {pending && user.role !== "Employee" && (
          <>
            <button
              className="btn btn-danger-outline"
              onClick={() => openAction("reject")}
            >
              <X size={17} />
              Reject
            </button>
            <button
              className="btn btn-primary"
              onClick={() => openAction("approve")}
            >
              <Check size={17} />
              Approve
            </button>
          </>
        )}
        {user.role === "Admin" &&
          expense.paymentStatus === "Pending Payment" && (
            <button
              className="btn btn-primary"
              onClick={() => openAction("paid")}
            >
              <Wallet size={17} />
              Mark as paid
            </button>
          )}
      </PageHead>
      <ErrorBox message={error} onRetry={refresh} />
      <div className="detail-layout">
        <div>
          <section className="panel">
            <div className="detail-summary">
              <div>
                <span className="eyebrow">EXPENSE AMOUNT</span>
                <h2>{money(expense.amount)}</h2>
              </div>
              <div className="detail-badges">
                <Badge status={expense.status} />
                {expense.status === "Approved" && (
                  <Badge status={expense.paymentStatus} />
                )}
              </div>
            </div>
            <dl className="detail-fields">
              <div>
                <dt>Category</dt>
                <dd>{expense.category}</dd>
              </div>
              <div>
                <dt>Expense date</dt>
                <dd>{dateLabel(expense.date)}</dd>
              </div>
              <div>
                <dt>Employee</dt>
                <dd>
                  {expense.employeeId?.name}
                  <small>{expense.employeeId?.email}</small>
                </dd>
              </div>
              <div>
                <dt>Assigned manager</dt>
                <dd>
                  {expense.managerId?.name}
                  <small>{expense.managerId?.email}</small>
                </dd>
              </div>
              <div className="full">
                <dt>Description</dt>
                <dd className="preserve-lines">{expense.description}</dd>
              </div>
            </dl>
            {expense.status === "Rejected" && (
              <div className="feedback rejection">
                <strong>Reason for rejection</strong>
                <p>{expense.rejectionReason}</p>
                <small>
                  Reviewed by {expense.reviewedBy?.name} ·{" "}
                  {timeLabel(expense.reviewedAt)}
                </small>
              </div>
            )}
            {expense.status === "Approved" && (
              <div className="feedback approval">
                <strong>Approved by {expense.reviewedBy?.name}</strong>
                <p>{expense.reviewNote || "Expense reviewed and approved."}</p>
                <small>{timeLabel(expense.reviewedAt)}</small>
              </div>
            )}
            {expense.paymentStatus === "Paid" && (
              <div className="feedback payment">
                <strong>Reimbursement recorded</strong>
                <p>Reference: {expense.paymentReference}</p>
                <small>
                  Recorded by {expense.paidBy?.name} ·{" "}
                  {timeLabel(expense.paidAt)}
                </small>
              </div>
            )}
            {pending && user.role === "Admin" && (
              <div className="form-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => openAction("reassign")}
                >
                  <ArrowRightLeft size={16} />
                  Reassign manager
                </button>
              </div>
            )}
          </section>
          <section className="panel timeline-panel">
            <div className="panel-heading">
              <div>
                <h2>Activity history</h2>
                <p>A record of this request’s progress</p>
              </div>
            </div>
            <ol className="timeline">
              {expense.history?.map((event, index) => (
                <li key={index}>
                  <div className="timeline-dot">
                    {["Approved", "Paid"].includes(event.action) ? (
                      <CheckCircle2 size={16} />
                    ) : event.action === "Submitted" ? (
                      <UserRound size={16} />
                    ) : (
                      <Clock3 size={16} />
                    )}
                  </div>
                  <div>
                    <strong>{event.action}</strong>
                    <p>
                      {event.actorName} · {timeLabel(event.at)}
                    </p>
                    {event.note && (
                      <span className="preserve-lines">{event.note}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <Receipt expense={expense} />
      </div>
      {action && (
        <Modal
          title={actionTitles[action]}
          description={`${expense.title} · ${money(expense.amount)}`}
          onClose={() => setAction(null)}
          busy={busy}
        >
          <form onSubmit={commit}>
            <ErrorBox message={actionError} />
            {action === "withdraw" ? (
              <p className="dialog-copy">
                This will remove the pending request from active expenses and
                dashboard totals. Its audit record is retained. You can submit a
                new request later.
              </p>
            ) : action === "reassign" ? (
              <Field
                label="New manager"
                required
                hint="This changes this pending request only. Employee assignments are managed in People & teams."
              >
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  required
                >
                  <option value="">Select a manager</option>
                  {managers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <>
                <p className="dialog-copy">
                  {action === "approve"
                    ? "Confirm that you have reviewed the details and supporting receipt. The expense will move to Pending Payment."
                    : action === "reject"
                      ? "Tell the employee why this request cannot be approved."
                      : "Confirm the reimbursement has already been completed outside this system. This action records payment; it does not transfer money."}
                </p>
                <Field
                  label={
                    action === "paid"
                      ? "Payment reference / note"
                      : action === "reject"
                        ? "Rejection reason"
                        : "Approval note (optional)"
                  }
                  required={action !== "approve"}
                >
                  <textarea
                    autoFocus
                    rows={3}
                    required={action !== "approve"}
                    minLength={
                      action === "reject"
                        ? 5
                        : action === "paid"
                          ? 3
                          : undefined
                    }
                    maxLength={action === "paid" ? 120 : 1000}
                    placeholder={
                      action === "paid"
                        ? "e.g. Bank transfer reference or payroll batch"
                        : "Add a clear note…"
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
              </>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Cancel
              </button>
              <button
                className={`btn ${["reject", "withdraw"].includes(action) ? "btn-danger" : "btn-primary"}`}
                disabled={busy}
              >
                {busy ? "Saving…" : actionTitles[action]}
              </button>
            </div>
            {actionError && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setAction(null);
                  refresh();
                }}
              >
                Close and refresh request
              </button>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
