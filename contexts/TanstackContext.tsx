"use client";

import { ReactNode, useEffect, useState } from "react";
import {
    QueryClient,
    QueryClientProvider,
    QueryCache,
    MutationCache,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useAppRouter } from "@/hooks/useAppRouter";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { handleApiError, type HandleApiErrorDeps } from "@/lib/handleApiError";

// The handler needs toast and router, which come from hooks, but the
// cache error handlers are built once when the client is created. There is a single
// TanstackContext instance, so the provider parks the latest deps here (refreshed in an
// effect, never during render) and the handlers, which only run at error time, read
// them then.
let errorDeps: HandleApiErrorDeps | null = null;

/** A 429 from the API's rate limits (kheengz-laravel/docs/rate-limits.md). */
function isTooManyRequests(error: unknown): boolean {
    return (error as { response?: { status?: number } } | null)?.response?.status === 429;
}

function makeQueryClient(): QueryClient {
    return new QueryClient({
        // Every query and every mutation reports through one place. This replaces the
        // old `useHandleQueryError(query)` / `useHandleMutationError(mutation.error)`
        // calls that had to be repeated in each component, where forgetting one meant a
        // request could fail in silence.
        //
        // A call that renders its own failure opts out with
        // `meta: { skipGlobalError: true }`.
        queryCache: new QueryCache({
            onError: (error, query) => {
                if (query.meta?.skipGlobalError || !errorDeps) return;
                // "Too many requests" on a refresh the reader did not ask for (window focus, a
                // live signal) while the screen still shows what it had: nothing for them to do,
                // and the next signal or focus catches up. Only a first load says it.
                if (isTooManyRequests(error) && query.state.data !== undefined) return;
                handleApiError(error, errorDeps);
            },
        }),
        mutationCache: new MutationCache({
            onError: (error, _vars, _ctx, mutation) => {
                if (mutation.meta?.skipGlobalError || !errorDeps) return;
                handleApiError(error, errorDeps);
            },
        }),
        defaultOptions: {
            queries: {
                networkMode: "always",
                /*
                 * Coming back to the window refetches what is older than staleTime below. The
                 * safety net under Reverb: a laptop that slept, or a signal sent while the socket
                 * was reconnecting, catches up on focus instead of showing "Waiting for an answer"
                 * until someone switches pages. Fresh data is not refetched, so it costs little.
                 */
                refetchOnWindowFocus: true,
                /*
                 * Data stays good for half a minute, so leaving a screen and
                 * coming back reads the cache instead of refetching.
                 *
                 * TanStack's own default is 0, which means every mount refires
                 * every query on it. That default is written for an app whose
                 * freshness depends on refetching; this one's does not. Every
                 * write invalidates what it changed, and `useRealtimeResource`
                 * invalidates again on the matching Reverb broadcast, so a
                 * figure another officer changes arrives here whether or not
                 * this number is zero. All 0 bought was the request.
                 *
                 * Modest on purpose: long enough to cover navigating away and
                 * back, short enough that a screen behind a broadcast nobody
                 * received still corrects itself quickly. 79 queries already
                 * set a longer one of their own and still override this.
                 */
                staleTime: 30 * 1000,
                /*
                 * A 429 in a flash sale means a crowd behind one address (MTN, Airtel). Retrying
                 * on TanStack's 1, 2, 4 s schedule sends that whole crowd back together; wait
                 * a random 5 to 15 s instead so they come back spread out, and stop after two.
                 */
                retry: (failureCount, error) => failureCount < (isTooManyRequests(error) ? 2 : 3),
                retryDelay: (attempt, error) =>
                    isTooManyRequests(error) ? 5000 + Math.random() * 10_000 : Math.min(1000 * 2 ** attempt, 30_000),
            },
            mutations: {
                networkMode: "always",
            },
        },
    });
}

export default function TanstackContext({ children }: { children: ReactNode }) {
    const toast = usePrimeReactToast();
    const router = useAppRouter();

    const [queryClient] = useState(makeQueryClient);

    useEffect(() => {
        errorDeps = { toast, router };
    }, [toast, router]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
