import { useState } from "react";
import { useAuth } from "../context/Auth";
import { useToast } from "../context/Toast";
import { api, errorMessage } from "../api";
import { PageHead, Field, ErrorBox, initials } from "../components/UI";
export default function Settings() {
  const { user, clearUser } = useAuth();
  const notify = useToast();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.patch("/auth/password", {
        currentPassword: current,
        newPassword: password,
      });
      notify("Password changed. Sign in with your new password.");
      clearUser();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        title="Account settings"
        description="Keep your account details and password secure."
      />
      <div className="settings-layout">
        <section className="panel profile-panel">
          <div className="avatar avatar-large">{initials(user.name)}</div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="role-pill">{user.role}</span>
          <p className="muted">
            Contact your administrator to update your name, email, or manager
            assignment.
          </p>
        </section>
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>Change password</h2>
              <p>Changing your password signs out all existing sessions.</p>
            </div>
          </div>
          <form onSubmit={save}>
            <div className="form-body">
              <ErrorBox message={error} />
              <Field label="Current password" required>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </Field>
              <Field
                label="New password"
                required
                hint="Use at least 12 characters; at most 72 UTF-8 bytes."
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Confirm new password" required>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={72}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
            </div>
            <div className="form-footer">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
