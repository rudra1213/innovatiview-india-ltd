import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Inbox,
  Loader2,
  X,
} from "lucide-react";
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
export const dateLabel = (value) =>
  value
    ? new Date(
        value.length === 10 ? `${value}T12:00:00` : value,
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";
export const timeLabel = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export const initials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
export const refLabel = (id) => `EXP-${id?.slice(-6).toUpperCase()}`;
export function Brand({ light = false }) {
  return (
    <div className={`brand ${light ? "light" : ""}`}>
      <div className="brand-mark">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div>
        <strong>Innovatiview</strong>
        <small>INDIA LTD.</small>
      </div>
    </div>
  );
}
export function Spinner({ label = "Loading…" }) {
  return (
    <div className="loading" role="status">
      <Loader2 size={23} className="spin" />
      <span>{label}</span>
    </div>
  );
}
export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={19} />
      <span>{message}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
export function Badge({ status }) {
  return (
    <span
      className={`badge badge-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {status}
    </span>
  );
}
export function PageHead({ eyebrow, title, description, children }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow || "EXPENSE WORKSPACE"}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
export function Empty({
  title = "No expenses yet",
  description = "Your expense requests will appear here.",
  action,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Inbox size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Field({ label, children, hint, required }) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Pagination({ page, pages, total, onPage, noun = "requests" }) {
  return (
    <div className="pagination">
      <span>
        {total} {noun} · Page {page} of {Math.max(1, pages)}
      </span>
      <div>
        <button
          className="icon-button"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPage(page - 1)}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          className="icon-button"
          disabled={page >= pages}
          aria-label="Next page"
          onClick={() => onPage(page + 1)}
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function Modal({ title, description, children, onClose, busy = false }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prior = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape" && !busy) close.current();
      if (e.key === "Tab") {
        const elements = ref.current?.querySelectorAll(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
        );
        const first = elements?.[0],
          last = elements?.[elements.length - 1];
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key);
      prior?.focus();
    };
  }, [busy]);
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
