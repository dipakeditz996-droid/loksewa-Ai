const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  constructor(public status: number, public data: any) {
    super(data?.detail || data?.message || "An API error occurred");
    this.name = "ApiError";
  }
}

export const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
};

export const setAuthToken = (access: string, refresh: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
};

export const clearAuthToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

async function refreshToken(): Promise<string | null> {
  try {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;

    const response = await fetch(`${API_URL}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      clearAuthToken();
      return null;
    }

    const data = await response.json();
    localStorage.setItem("access_token", data.access);
    return data.access;
  } catch (err) {
    clearAuthToken();
    return null;
  }
}

export interface ApiClientOptions extends RequestInit {
  skipRedirect?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  let token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  // Handle Token Expiration or Missing Token
  if (response.status === 401) {
    if (token) {
      const newToken = await refreshToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        response = await fetch(url, { ...config, headers });
      }
    }
    
    if (response.status === 401 && !options.skipRedirect) {
      // Force logout if refresh failed or no token was present
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const isAdminRoute = path.startsWith("/admin-dashboard") || path.startsWith("/admin-login");
        const loginPath = isAdminRoute ? "/admin-login" : "/login";
        if (!path.includes("/login")) {
          window.location.href = `${loginPath}?expired=true`;
          return new Promise(() => {}); // never resolve to prevent further execution
        }
      }
    }
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiError(response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
