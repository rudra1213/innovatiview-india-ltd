import { useState } from "react";
import { Plus, Search, Pencil, KeyRound } from "lucide-react";
import { api, errorMessage, useResource } from "../api";
import { useToast } from "../context/Toast";
import {
  Badge,
  ErrorBox,
  Field,
  Modal,
  PageHead,
  Pagination,
  Spinner,
  Empty,
  initials,
} from "../components/UI";
const blank = {
  name: "",
  email: "",
  role: "Employee",
  managerId: "",
  password: "",
  active: true,
};
export default function Users() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { data, loading, error, refresh } = useResource(
    `/users?${new URLSearchParams({ page: String(page), search: query, ...(role ? { role } : {}) })}`,
  );
  const [modal, setModal] = useState(null);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState(blank);
  const [managers, setManagers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const notify = useToast();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  async function open(type, user = null) {
    setTarget(user);
    setForm(
      user
        ? {
            ...blank,
            name: user.name,
            email: user.email,
            role: user.role,
            managerId: user.managerId?._id || "",
            active: user.active,
          }
        : { ...blank },
    );
    setFormError("");
    setModal(type);
    if (type !== "reset")
      try {
        setManagers((await api.get("/users/managers")).data.items);
      } catch (e) {
        setFormError(errorMessage(e));
      }
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError("");
    try {
      if (modal === "reset")
        await api.patch(`/users/${target._id}/password`, {
          password: form.password,
        });
      else if (target)
        await api.patch(`/users/${target._id}`, {
          name: form.name,
          email: form.email,
          managerId: form.role === "Employee" ? form.managerId : null,
          active: form.active,
        });
      else
        await api.post("/users", {
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password,
          managerId: form.role === "Employee" ? form.managerId : null,
        });
      notify(
        modal === "reset"
          ? "Password reset. Share it securely with the user."
          : target
            ? "User updated."
            : "User created.",
      );
      setModal(null);
      refresh();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        title="People & teams"
        description="Manage company accounts and connect employees with their managers."
      >
        <button className="btn btn-primary" onClick={() => open("create")}>
          <Plus size={17} />
          Add user
        </button>
      </PageHead>
      <section className="panel">
        <div className="table-toolbar">
          <div className="tabs">
            {["", "Employee", "Manager", "Admin"].map((r) => (
              <button
                key={r}
                className={role === r ? "active" : ""}
                onClick={() => {
                  setRole(r);
                  setPage(1);
                }}
              >
                {r ? `${r}s` : "All people"}
              </button>
            ))}
          </div>
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search);
              setPage(1);
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search users"
              placeholder="Search by name or email…"
              maxLength={100}
              value={search}
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
              {data.items.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Assigned manager</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((u) => (
                        <tr key={u._id}>
                          <td>
                            <div className="person-cell">
                              <div className="avatar">{initials(u.name)}</div>
                              <div>
                                <strong>{u.name}</strong>
                                <span className="table-sub">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="role-pill">{u.role}</span>
                          </td>
                          <td>
                            {u.managerId?.name || (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            <Badge status={u.active ? "Active" : "Inactive"} />
                          </td>
                          <td>
                            <div className="row-actions">
                              {u.role !== "Admin" ? (
                                <>
                                  <button
                                    className="icon-button"
                                    aria-label={`Edit ${u.name}`}
                                    title="Edit account"
                                    onClick={() => open("edit", u)}
                                  >
                                    <Pencil size={17} />
                                  </button>
                                  <button
                                    className="icon-button"
                                    aria-label={`Reset password for ${u.name}`}
                                    title="Reset password"
                                    onClick={() => open("reset", u)}
                                  >
                                    <KeyRound size={17} />
                                  </button>
                                </>
                              ) : (
                                <span className="muted">Protected</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="No matching people"
                  description="Add a new user or adjust your search."
                />
              )}
              <Pagination
                page={page}
                pages={data.pages}
                total={data.total}
                noun="people"
                onPage={setPage}
              />
            </>
          )
        )}
      </section>
      <div className="info-card">
        <UsersInfo />
        <div>
          <strong>Assignments apply to new requests</strong>
          <p>
            Existing requests keep their assigned manager and review history. To
            transfer a pending request, open the expense and choose Reassign
            manager. Accounts can be deactivated without deleting their records.
          </p>
        </div>
      </div>
      {modal && (
        <Modal
          title={
            modal === "reset"
              ? "Reset password"
              : target
                ? "Edit user"
                : "Add a team member"
          }
          description={
            modal === "reset"
              ? target.email
              : "Create a manager first, then assign employees to them."
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          <form onSubmit={save}>
            <ErrorBox message={formError} />
            {modal !== "reset" && (
              <>
                <div className="form-row">
                  <Field label="Full name" required>
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      value={form.name}
                      onChange={set("name")}
                    />
                  </Field>
                  <Field label="Role" required>
                    <select
                      value={form.role}
                      onChange={set("role")}
                      disabled={!!target}
                    >
                      <option>Employee</option>
                      <option>Manager</option>
                    </select>
                  </Field>
                </div>
                <Field label="Email address" required>
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={set("email")}
                  />
                </Field>
                {form.role === "Employee" && (
                  <Field label="Assigned manager" required>
                    <select
                      required
                      value={form.managerId}
                      onChange={set("managerId")}
                    >
                      <option value="">Select a manager</option>
                      {managers.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {target && (
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, active: e.target.checked }))
                      }
                    />
                    <span>Active account — can sign in</span>
                  </label>
                )}
              </>
            )}
            {(!target || modal === "reset") && (
              <Field
                label={modal === "reset" ? "New password" : "Initial password"}
                required
                hint="At least 12 characters; at most 72 UTF-8 bytes. Share this securely with the user."
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={72}
                  value={form.password}
                  onChange={set("password")}
                />
              </Field>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : modal === "reset"
                    ? "Reset password"
                    : target
                      ? "Save changes"
                      : "Create account"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function UsersInfo() {
  return <KeyRound size={20} />;
}
