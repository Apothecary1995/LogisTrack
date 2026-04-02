import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  API_BASE_URL,
  parseApiResponse,
  publicRequest,
} from "../lib/apiClient";

const AUTH_STORAGE_KEY = "logitarget_auth_state";
const AuthContext = createContext(null);

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeAuthState(state) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

function clearAuthState() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const initial = loadStoredAuth();
  const [user, setUser] = useState(initial?.user || null);
  const [accessToken, setAccessToken] = useState(initial?.accessToken || null);
  const [refreshToken, setRefreshToken] = useState(initial?.refreshToken || null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(initial?.accessToken));
  const refreshInFlightRef = useRef(null);

  const commitAuth = useCallback((payload) => {
    const nextState = {
      user: payload.user,
      accessToken: payload.access,
      refreshToken: payload.refresh,
    };

    setUser(nextState.user);
    setAccessToken(nextState.accessToken);
    setRefreshToken(nextState.refreshToken);
    storeAuthState(nextState);
  }, []);

  const updateUser = useCallback(
    (nextUser) => {
      setUser(nextUser);
      if (accessToken || refreshToken) {
        storeAuthState({
          user: nextUser,
          accessToken,
          refreshToken,
        });
      }
    },
    [accessToken, refreshToken]
  );

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    clearAuthState();
  }, []);

  const refreshAccess = useCallback(async () => {
    if (!refreshToken) {
      throw new Error("No refresh token available.");
    }

    if (!refreshInFlightRef.current) {
      refreshInFlightRef.current = publicRequest("/auth/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh: refreshToken }),
      })
        .then((payload) => {
          const nextAccess = payload.access;
          const nextRefresh = payload.refresh || refreshToken;

          const nextState = {
            user,
            accessToken: nextAccess,
            refreshToken: nextRefresh,
          };

          setAccessToken(nextAccess);
          setRefreshToken(nextRefresh);
          storeAuthState(nextState);
          return nextAccess;
        })
        .finally(() => {
          refreshInFlightRef.current = null;
        });
    }

    return refreshInFlightRef.current;
  }, [refreshToken, user]);

  const authRequest = useCallback(
    async (path, options = {}, retry = true) => {
      const headers = {
        ...(options.headers || {}),
      };

      const isFormData = options.body instanceof FormData;
      if (!isFormData) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
      }
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });

      if (response.status === 401 && retry && refreshToken) {
        try {
          const newAccess = await refreshAccess();
          return authRequest(
            path,
            {
              ...options,
              headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${newAccess}`,
              },
            },
            false
          );
        } catch {
          logout();
          throw new Error("Session expired. Please sign in again.");
        }
      }

      return parseApiResponse(response);
    },
    [accessToken, refreshAccess, refreshToken, logout]
  );

  const downloadRequest = useCallback(
    async (path, filename = "export.xlsx") => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Download failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
    [accessToken]
  );

  const signIn = useCallback(
    async (credentials) => {
      const payload = await publicRequest("/auth/login/", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      commitAuth(payload);
      return payload;
    },
    [commitAuth]
  );

  const register = useCallback(
    async (data) => {
      const payload = await publicRequest("/auth/register/", {
        method: "POST",
        body: JSON.stringify(data),
      });
      commitAuth(payload);
      return payload;
    },
    [commitAuth]
  );

  const forgotPassword = useCallback(async (email) => {
    return publicRequest("/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authRequest("/auth/me/");
    updateUser(profile);
    return profile;
  }, [authRequest, updateUser]);

  const changePassword = useCallback(
    async ({ current_password, new_password }) => {
      const response = await authRequest("/auth/change-password/", {
        method: "POST",
        body: JSON.stringify({ current_password, new_password }),
      });

      if (response?.access && response?.refresh) {
        setAccessToken(response.access);
        setRefreshToken(response.refresh);
        storeAuthState({
          user,
          accessToken: response.access,
          refreshToken: response.refresh,
        });
      }

      return response;
    },
    [authRequest, user]
  );

  const updatePreferences = useCallback(
    async (payload) => {
      const updatedUser = await authRequest("/auth/preferences/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      updateUser(updatedUser);
      return updatedUser;
    },
    [authRequest, updateUser]
  );

  useEffect(() => {
    if (!accessToken) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;
    authRequest("/auth/me/")
      .then((profile) => {
        if (cancelled) {
          return;
        }
        setUser(profile);
        storeAuthState({ user: profile, accessToken, refreshToken });
      })
      .catch(() => {
        if (!cancelled) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken, authRequest, logout]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(accessToken && user),
      isBootstrapping,
      signIn,
      register,
      forgotPassword,
      refreshProfile,
      changePassword,
      updatePreferences,
      updateUser,
      logout,
      authRequest,
      downloadRequest,
    }),
    [
      user,
      accessToken,
      isBootstrapping,
      signIn,
      register,
      forgotPassword,
      refreshProfile,
      changePassword,
      updatePreferences,
      updateUser,
      logout,
      authRequest,
      downloadRequest,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
