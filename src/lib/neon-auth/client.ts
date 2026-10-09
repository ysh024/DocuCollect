"use client";

import { useEffect, useState } from "react";

export interface NeonUser {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  image?: string;
  createdAt?: string;
}

export interface NeonSession {
  user: NeonUser;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
    token: string;
  };
}

class NeonAuthClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "/api/auth";
  }

  get signUp() {
    return {
      email: async ({
        email,
        password,
        name,
      }: {
        email: string;
        password: string;
        name?: string;
      }) => {
        try {
          const res = await fetch(`${this.baseUrl}/sign-up/email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ email, password, name }),
            credentials: "include",
          });

          let data: any = {};
          try {
            data = await res.json();
          } catch {
            const text = await res.text();
            data = { message: text };
          }

          if (!res.ok) {
            return {
              data: null,
              error: {
                message:
                  data.message ||
                  data.error ||
                  `Sign up failed with status ${res.status}`,
              },
            };
          }
          return { data, error: null };
        } catch (err: any) {
          console.error("Neon signUp error:", err);
          return { data: null, error: { message: err.message || "Network request failed" } };
        }
      },
    };
  }

  get signIn() {
    return {
      email: async ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) => {
        try {
          const res = await fetch(`${this.baseUrl}/sign-in/email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ email, password }),
            credentials: "include",
          });

          let data: any = {};
          try {
            data = await res.json();
          } catch {
            const text = await res.text();
            data = { message: text };
          }

          if (!res.ok) {
            return {
              data: null,
              error: {
                message:
                  data.message ||
                  data.error ||
                  "Invalid email or password. Please verify your credentials.",
              },
            };
          }
          return { data, error: null };
        } catch (err: any) {
          console.error("Neon signIn error:", err);
          return { data: null, error: { message: err.message || "Network request failed" } };
        }
      },
    };
  }

  async signOut() {
    try {
      const res = await fetch(`${this.baseUrl}/sign-out`, {
        method: "POST",
        credentials: "include",
      });
      return { ok: res.ok };
    } catch {
      return { ok: false };
    }
  }

  async getSession(): Promise<{ data: NeonSession | null; error: any }> {
    try {
      const res = await fetch(`${this.baseUrl}/get-session`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) return { data: null, error: null };
      const data = await res.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }
}

export const authClient = new NeonAuthClient();

export function useSession() {
  const [data, setData] = useState<NeonSession | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    authClient
      .getSession()
      .then((res) => {
        if (!isMounted) return;
        setData(res.data);
        setError(res.error);
        setIsPending(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err);
        setIsPending(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isPending, error };
}
