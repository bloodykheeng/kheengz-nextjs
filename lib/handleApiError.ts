import { clearAuthCookies } from "@/services/axiosApi";
import { isDashboardRoute } from "@/lib/routeAccess";

/** What an axios (or fetch) failure may carry. Every part is optional: the error arrives as unknown. */
type FailedRequest = {
  code?: string;
  name?: string;
  __CANCEL__?: boolean;
  response?: {
    status?: number;
    data?: { message?: string; error?: string; errors?: Record<string, string[] | string> };
  };
};

interface Toast {
  error: (summary: string, detail?: string) => void;
  warn: (summary: string, detail?: string) => void;
}

export interface HandleApiErrorDeps {
  toast: Toast;
  router: { push: (href: string) => void };
}

/**
 * The one API error handler. Wired into the QueryClient's `QueryCache.onError`
 * (every query) and `MutationCache.onError` (every mutation), so nothing can be
 * left unhandled by forgetting a hook call at the call site, which is what the
 * old per-component `useHandleQueryError(query)` allowed.
 *
 * Behaviour:
 *   401                          clear the session and send them to /login
 *   `{ message, errors }`        toast the message, or the field errors
 *   no response at all           offline / unreachable warning
 *
 * A call that wants to report failure itself opts out with
 * `meta: { skipGlobalError: true }`. The sign-in and password-reset forms do
 * this: they render the server message inline, and a toast on top of that says
 * the same thing twice.
 */
export function handleApiError(
  error: unknown,
  { toast, router }: HandleApiErrorDeps,
): void {
  if (!error) return;
  // Read now, when the error arrives: the page the person is on at that moment.
  const pathname = window.location.pathname;

  const isOnline =
    typeof navigator === "undefined" ||
    !("onLine" in navigator) ||
    navigator.onLine;
  if (!isOnline) {
    toast.warn("You are offline. Please check your internet connection.");

    return;
  }

  // `error` is unknown: read it as a failed request whose every part may be missing.
  const err = (error ?? {}) as FailedRequest;

  /*
   * A CANCELLED REQUEST IS NOT A FAILURE, and it must not reach the reader.
   *
   * TanStack aborts an in-flight request whenever its key changes, which on a
   * list happens on every page, filter and search change.
   * An aborted request carries no `response`, so it fell through to the
   * "Unable to connect to the server" warning below and accused the network of
   * something the app did deliberately.
   *
   * Three spellings because they come from different layers: axios's own flag,
   * its error code, and the DOM exception the fetch adapter throws.
   */
  const cancelled =
    err?.code === "ERR_CANCELED" ||
    err?.name === "CanceledError" ||
    err?.name === "AbortError" ||
    err?.__CANCEL__ === true;

  if (cancelled) return;
  const httpStatus: number | undefined = err?.response?.status;
  const responseData = err?.response?.data;

  const handle401 = () => {
    clearAuthCookies();
    // The cache is deliberately left alone here. Clearing or removing a query from
    // inside an error handler makes React Query refetch it straight away for any
    // still-mounted observer, that refetch 401s as well, and this handler runs
    // again: an endless loop rather than a redirect. The session is dropped by the
    // cookie clear, and `login()` calls queryClient.clear() on the way back in.
    // The public pages may call `optional_auth` endpoints, so a stale token 401s there
    // too. Bouncing a buyer off the storefront, or off the login form they are
    // typing into, would be wrong.
    if (isDashboardRoute(pathname)) router.push("/login");
  };

  // Every API failure answers `{ message, errors: { field: [...] } }`.
  if (httpStatus === 401) {
    handle401();

    return;
  }

  const errorMessage: string | undefined = responseData?.message;
  const errorDetails = responseData?.errors;

  // `message` wins. A 422 carries both, and reporting each one puts two toasts
  // on screen for a single validation failure.
  if (errorMessage) {
    const extra = responseData?.error ? ` Error: ${responseData.error}` : "";
    toast.error(`${errorMessage}${extra}`.trim());

    return;
  }

  if (errorDetails) {
    const formatted = Object.entries(errorDetails)
      .map(([field, messages]) => {
        const label = field
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const text = Array.isArray(messages)
          ? messages.join(", ")
          : JSON.stringify(messages);

        return `${label}: ${text}`;
      })
      .join("\n");
    toast.error(formatted);

    return;
  }

  if (!err?.response) {
    toast.warn(
      "Unable to connect to the server. Please check your internet connection or contact the administrator.",
    );
  } else {
    toast.error("An error occurred. Please contact admin.");
  }
}
