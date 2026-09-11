import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
const Context = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const notify = (message, type = "success") => {
    const id = crypto.randomUUID();
    setToasts((v) => [...v, { id, message, type }]);
    timers.current.push(
      setTimeout(() => setToasts((v) => v.filter((t) => t.id !== id)), 5500),
    );
  };
  return (
    <Context.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div className={`toast ${t.type}`} key={t.id}>
            {t.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{t.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToasts((v) => v.filter((x) => x.id !== t.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
export const useToast = () => useContext(Context);
