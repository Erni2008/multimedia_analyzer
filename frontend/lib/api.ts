import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  config.headers.Accept = "application/json";
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Request failed.";
  }

  if (error.code === "ECONNABORTED") {
    return "The request timed out. Try again.";
  }
  if (!error.response) {
    return "The server is unavailable right now.";
  }

  const detail = error.response?.data;
  if (typeof detail === "string") {
    return detail;
  }
  if (detail && typeof detail === "object" && "detail" in detail) {
    const message = detail.detail;
    if (typeof message === "string") {
      return message;
    }
    if (Array.isArray(message)) {
      const joined = message
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (item && typeof item === "object" && "msg" in item && typeof item.msg === "string") {
            return item.msg;
          }
          return null;
        })
        .filter(Boolean)
        .join(", ");
      if (joined) {
        return joined;
      }
    }
  }

  return error.message || "Request failed.";
}

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export default api;
