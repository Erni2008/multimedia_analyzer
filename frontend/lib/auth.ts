import { jwtDecode } from "jwt-decode";

type JwtPayload = {
  sub: string;
  exp: number;
};

export type Session = {
  token: string;
  email: string;
  expiresAt: number;
};

export function getSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("access_token");
  if (!token) {
    return null;
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);
    const expiresAt = payload.exp * 1000;
    if (!payload.sub || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      window.localStorage.removeItem("access_token");
      return null;
    }

    return {
      token,
      email: payload.sub,
      expiresAt,
    } satisfies Session;
  } catch {
    window.localStorage.removeItem("access_token");
    return null;
  }
}

export function storeToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("access_token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("access_token");
  }
}
