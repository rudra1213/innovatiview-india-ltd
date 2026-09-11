import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ReceiptText,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/Auth";
import { errorMessage } from "../api";
import { Brand, Field, ErrorBox } from "../components/UI";
export default function Login() {
  const { user, login, initialError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="login-story-body">
          <div className="login-kicker">
            <span /> EXPENSES, SIMPLIFIED
          </div>
          <h1>
            Less paperwork.
            <br />
            More progress.
          </h1>
          <p>
            One workspace for your expenses, approvals, and reimbursements.
            Built around the way your team works.
          </p>
          <div className="workflow-visual">
            <div>
              <ReceiptText />
              <span>Submit</span>
              <small>Add your expense</small>
            </div>
            <ArrowRight className="workflow-arrow" />
            <div>
              <CheckCircle2 />
              <span>Approve</span>
              <small>Review with clarity</small>
            </div>
            <ArrowRight className="workflow-arrow" />
            <div>
              <Wallet />
              <span>Reimburse</span>
              <small>Track every rupee</small>
            </div>
          </div>
        </div>
        <div className="login-story-foot">
          <Check size={16} /> Clear records. Confident decisions.
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <div className="login-form-wrap">
          <div className="login-icon">
            <LockKeyhole size={25} />
          </div>
          <div className="eyebrow">WELCOME TO YOUR WORKSPACE</div>
          <h2>Sign in to continue</h2>
          <p>Use your company account to manage expenses.</p>
          <ErrorBox message={error || initialError} />
          <form onSubmit={submit}>
            <Field label="Email address" required>
              <input
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" required>
              <div className="password-input">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <button className="btn btn-primary login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-help">
            Need an account or a password reset?
            <br />
            <strong>Contact your company administrator.</strong>
          </div>
        </div>
        <span className="login-copyright">
          Innovatiview India Ltd. · Employee Expense Management
        </span>
      </section>
    </div>
  );
}
