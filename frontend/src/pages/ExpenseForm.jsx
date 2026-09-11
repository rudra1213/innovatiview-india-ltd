import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UploadCloud, FileCheck2, Send, Info } from "lucide-react";
import { api, errorMessage } from "../api";
import { useToast } from "../context/Toast";
import { PageHead, Field, ErrorBox, Spinner } from "../components/UI";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export default function ExpenseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const [form, setForm] = useState({
    title: "",
    category: "Travel",
    amount: "",
    date: today(),
    description: "",
  });
  const [categories, setCategories] = useState([]);
  const [existing, setExisting] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/expenses/categories"),
      id ? api.get(`/expenses/${id}`) : Promise.resolve(null),
    ])
      .then(([c, e]) => {
        if (!alive) return;
        setCategories(c.data.categories);
        if (e) {
          const expense = e.data.expense;
          setExisting(expense);
          setForm({
            title: expense.title,
            category: expense.category,
            amount: String(expense.amount),
            date: expense.date,
            description: expense.description,
          });
        }
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, version]);
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));
  function selectFile(e) {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setError("Receipt must be 3 MB or smaller.");
      e.target.value = "";
      setFile(null);
      return;
    }
    if (
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        f.type,
      )
    ) {
      setError("Choose a PDF, JPG, PNG, or WebP receipt.");
      e.target.value = "";
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  }
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!file && !id) {
      setError("Please attach a receipt.");
      return;
    }
    setBusy(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (file) data.append("receipt", file);
    if (id) data.append("revision", existing.revision);
    try {
      const r = id
        ? await api.patch(`/expenses/${id}`, data)
        : await api.post("/expenses", data);
      notify(id ? "Expense updated." : "Expense submitted to your manager.");
      navigate(`/expenses/${r.data.expense._id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Spinner label="Preparing your expense form…" />;
  if (!categories.length || (id && !existing))
    return (
      <ErrorBox
        message={error || "Unable to load form."}
        onRetry={() => setVersion((v) => v + 1)}
      />
    );
  if (existing && existing.status !== "Pending")
    return <ErrorBox message="Only pending requests can be edited." />;
  return (
    <>
      <Link className="back-link" to={id ? `/expenses/${id}` : "/expenses"}>
        <ArrowLeft size={16} />
        Back to expenses
      </Link>
      <PageHead
        title={id ? "Edit expense" : "Create an expense"}
        description="Add the details and attach your receipt. We’ll take it from there."
      />
      <form className="form-layout" onSubmit={submit}>
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>Expense details</h2>
              <p>Fields marked with * are required.</p>
            </div>
            <span className="step-pill">01 / DETAILS</span>
          </div>
          <div className="form-body">
            <ErrorBox message={error} />
            <Field label="Expense title" required>
              <input
                required
                minLength={3}
                maxLength={120}
                placeholder="e.g. Client visit to Delhi"
                value={form.title}
                onChange={set("title")}
              />
            </Field>
            <div className="form-row">
              <Field label="Category" required>
                <select value={form.category} onChange={set("category")}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (INR)" required>
                <input
                  type="number"
                  required
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set("amount")}
                />
              </Field>
            </div>
            <Field label="Expense date" required>
              <input
                type="date"
                required
                max={today()}
                value={form.date}
                onChange={set("date")}
              />
            </Field>
            <Field
              label="Description"
              required
              hint={`${form.description.length}/2000 characters`}
            >
              <textarea
                required
                minLength={5}
                maxLength={2000}
                rows={5}
                placeholder="Explain the business purpose of this expense…"
                value={form.description}
                onChange={set("description")}
              />
            </Field>
          </div>
          <div className="form-footer">
            <Link
              className="btn btn-secondary"
              to={id ? `/expenses/${id}` : "/expenses"}
            >
              Cancel
            </Link>
            <button className="btn btn-primary" disabled={busy}>
              <Send size={16} />
              {busy ? "Saving…" : id ? "Save changes" : "Submit expense"}
            </button>
          </div>
        </section>
        <aside>
          <section className="panel receipt-upload-panel">
            <div className="panel-heading">
              <div>
                <h2>Bill / receipt</h2>
                <p>
                  {id
                    ? "Replace the receipt if needed."
                    : "Attach one supporting document."}
                </p>
              </div>
            </div>
            <label className="upload-zone">
              <div className="upload-icon">
                {file ? <FileCheck2 size={28} /> : <UploadCloud size={28} />}
              </div>
              <strong>{file ? file.name : "Choose a receipt"}</strong>
              <span>PDF, JPG, PNG or WebP</span>
              <small>Maximum file size: 3 MB</small>
              <input
                aria-label="Bill or receipt"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={selectFile}
              />
            </label>
            {existing && (
              <p className="existing-receipt">
                Current file: <strong>{existing.receipt.filename}</strong>
              </p>
            )}
          </section>
          <div className="info-card">
            <Info size={19} />
            <div>
              <strong>What happens next?</strong>
              <p>
                Your expense will be sent to your assigned manager. You can
                track its status and review their feedback from My expenses.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}
