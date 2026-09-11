import { Navigate, Outlet, Route, Routes, Link } from "react-router-dom";
import { useAuth } from "./context/Auth";
import Layout from "./components/Layout";
import { Empty, Spinner } from "./components/UI";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import ExpenseForm from "./pages/ExpenseForm";
import ExpenseDetail from "./pages/ExpenseDetail";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
function Protected({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Opening workspace…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return (
      <Empty
        title="Access restricted"
        description="Your account does not have permission to open this page."
        action={
          <Link to="/dashboard" className="btn btn-primary">
            Back to dashboard
          </Link>
        }
      />
    );
  return <Outlet />;
}
export default function App() {
  const { loading } = useAuth();
  if (loading)
    return (
      <div className="boot-screen">
        <Spinner label="Opening Innovatiview…" />
      </div>
    );
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses key="expenses" />} />
          <Route path="/expenses/:id" element={<ExpenseDetail />} />
          <Route element={<Protected roles={["Employee"]} />}>
            <Route path="/expenses/new" element={<ExpenseForm key="new" />} />
            <Route
              path="/expenses/:id/edit"
              element={<ExpenseForm key="edit" />}
            />
          </Route>
          <Route element={<Protected roles={["Admin"]} />}>
            <Route path="/users" element={<Users />} />
            <Route
              path="/reimbursements"
              element={<Expenses payments key="payments" />}
            />
          </Route>
          <Route path="/settings" element={<Settings />} />
          <Route
            path="*"
            element={
              <Empty
                title="Page not found"
                description="This page may have moved or the link is incorrect."
                action={
                  <Link className="btn btn-primary" to="/dashboard">
                    Back to dashboard
                  </Link>
                }
              />
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
