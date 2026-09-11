import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 30000,
});
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      !["/auth/login", "/auth/me"].includes(error.config?.url)
    )
      window.dispatchEvent(new Event("session-expired"));
    return Promise.reject(error);
  },
);
export const errorMessage = (error) =>
  typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : error.code === "ECONNABORTED"
      ? "The request timed out. Refresh to check its status before trying again."
      : "Unable to connect. Check your internet connection and try again.";
export function useResource(url, poll = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const currentUrl = useRef(url);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    if (currentUrl.current !== url) {
      setLoading(true);
      setData(null);
      currentUrl.current = url;
    }
    api
      .get(url, { signal: controller.signal })
      .then((r) => {
        if (alive) {
          setData(r.data);
          setError("");
        }
      })
      .catch((e) => {
        if (alive && !axios.isCancel(e)) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [url, version]);
  useEffect(() => {
    if (!poll) return;
    const refreshVisible = () => {
      if (!document.hidden) refresh();
    };
    const timer = setInterval(refreshVisible, 20000);
    window.addEventListener("focus", refreshVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
    };
  }, [poll, refresh]);
  return { data, loading, error, refresh };
}
