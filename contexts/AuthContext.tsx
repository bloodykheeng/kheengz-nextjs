"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { AxiosError, AxiosResponse } from "axios";
import {
  persistAuthSession,
  clearAuthCookies,
  getStoredToken,
} from "@/services/axiosApi";
import {
  getAuthProfile,
  postToLogout,
} from "@/services/auth/auth-service";
import type { UserResource, ProfileResponse } from "@/services/types/auth";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { disconnectEcho } from "@/lib/echo";
import { useHydrated } from "@/hooks/useHydrated";

// Types

interface AuthContextValue {
  getUserQuery: UseQueryResult<AxiosResponse<ProfileResponse>>;
  logoutMutation: UseMutationResult<
    AxiosResponse<{ message: string }>,
    Error,
    void
  >;
  user: UserResource | null;
  permissions: string[];
  isAuthenticated: boolean;
  /**
   * True while the signed-in profile (and its permissions) is still loading. Gate the
   * shell on it, or a permission-driven UI paints empty for a frame and then fills in.
   */
  isProfileLoading: boolean;
  login: (user: UserResource, token: string) => void;
}

interface AuthContextProps {
  children: ReactNode;
}

// Context

const AuthCtx = createContext<AuthContextValue | undefined>(undefined);

export function AuthContext({ children }: AuthContextProps) {
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const primeReactToast = usePrimeReactToast();
  const hydrated = useHydrated();

  // Token is reactive state, NOT a one-off cookie read. `login()` calls setToken() so the
  // profile query's `enabled` flips true immediately after sign-in: writing a cookie does
  // not re-render, so deriving this from getStoredToken() alone left the query disabled
  // until a full reload. Seeded from the cookie in the browser (null on the server, where
  // nothing renders a user: the shell waits for useHydrated, see DashboardLayout).
  const [token, setToken] = useState<string | null>(getStoredToken);
  const hasToken = !!token;

  // Profile query
  // Deliberately NO cookie-backed `placeholderData`. Reading the cookie during render is a
  // client-only operation, so the server rendered a signed-out shell while the client's
  // first pass rendered the cached user. React saw "A" vs "JD" in the avatar and threw a
  // hydration error. The shell waits on `isProfileLoading` instead of guessing.
  /**
   * A token the API no longer knows is not a session.
   *
   * The cookies outlive the server: a database rebuilt, a token revoked, a session expired.
   * When the profile comes back 401 the session is over: the socket and the cookies go, the
   * state flips, and the nav says "Sign in" again. Only 401: a network blip is not a sign-out.
   * Handled where the answer arrives, so no effect has to watch for it afterwards.
   */
  const getUserQuery = useQuery<AxiosResponse<ProfileResponse>>({
    queryKey: ["auth-profile"],
    queryFn: async () => {
      try {
        return await getAuthProfile();
      } catch (error) {
        if ((error as AxiosError).response?.status === 401) {
          disconnectEcho();
          clearAuthCookies();
          setToken(null);
        }
        throw error;
      }
    },
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  /**
   * Signing out cancels; it does not clear. `queryClient.clear()` removes every
   * query, and removing one with a mounted observer makes it refetch at once, so
   * clearing here runs the whole dashboard again with the cookie gone. `login()`
   * clears before the next session starts, which is the moment something depends
   * on the cache being empty.
   *
   * `cancelQueries` silences only requests already in flight when the session
   * ended: the token is revoked server side, so they would 401 for a reason
   * nobody can act on. Every other error still reports through `handleApiError`
   * in `TanstackContext`, so no request can fail in silence.
   */
  const endSession = useCallback(() => {
    queryClient.cancelQueries();
    router.push("/login");
  }, [queryClient, router]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: postToLogout,
    onSuccess: () => {
      // Drop the websocket too, otherwise the socket stays authenticated as the
      // old user and they linger in the `online` presence list.
      disconnectEcho();
      setToken(null);
      clearAuthCookies();
      primeReactToast.success("Signed out");
      endSession();
    },
    onError: () => {
      // Token may already be revoked: clear local state regardless
      disconnectEcho();
      setToken(null);
      clearAuthCookies();
      endSession();
    },
  });

  // Login
  // Called after a successful login API response. Persists the session and
  // seeds the profile query cache so no extra network request is needed.
  const login = useCallback(
    (user: UserResource, newToken: string) => {
      persistAuthSession(newToken, user);
      // Drop everything cached under the *previous* session, including any query left in a
      // 401 state. Without this the dashboard's first refetch can bounce straight back to
      // /login, the "signs in then instantly signs out" bug.
      queryClient.clear();
      // Flip auth state reactively so the profile query becomes enabled. Nothing is seeded,
      // so the query is genuinely pending until the real profile (with permissions) lands
      // and the shell holds its loader until then, no UI renders with empty permissions.
      setToken(newToken);
    },
    [queryClient]
  );

  // Derived state
  // `auth/profile` nests the UserResource in a plain JSON response, so it arrives flat. Nothing
  // renders a user before it lands: the dashboard shell waits on `isProfileLoading`, on the
  // server and in the browser alike, so both passes agree without a cookie-made stand-in.
  const user: UserResource | null = getUserQuery.data?.data?.user ?? null;
  const permissions = getUserQuery.data?.data?.permissions ?? [];
  const isAuthenticated = hydrated && hasToken && !!user;
  // `isPending` is the honest signal: true only on the first fetch, false afterwards (a
  // background refetch is `isFetching`), so the shell shows its loader once on load and
  // never flickers on later refetches.
  // Also true until the browser has hydrated: the server cannot read the session cookie, so
  // "loading" is the one answer the server and the browser's first render can agree on.
  const isProfileLoading = !hydrated || (hasToken && getUserQuery.isPending);

  return (
    <AuthCtx.Provider
      value={{
        getUserQuery,
        logoutMutation,
        user,
        permissions,
        isAuthenticated,
        isProfileLoading,
        login,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthContext");
  return ctx;
}
