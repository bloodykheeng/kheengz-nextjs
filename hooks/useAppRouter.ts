"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";

/**
 * Next's router, starting the top progress bar on push and replace. The bar finishes by itself:
 * <NextTopLoader> in the root layout ends it on every navigation.
 *
 * In place of `nextjs-toploader/app`'s useRouter, which reads usePathname() during render to compare
 * addresses. That is URL data: under Cache Components it keeps the dashboard shell of a page like
 * /dashboard/shops/{id} out of its prerender (the build fails). Here the current address is read
 * when the person navigates, from the window.
 */
export function useAppRouter() {
  const router = useRouter();
  const loader = useTopLoader();

  return useMemo(() => {
    const isElsewhere = (href: string) => href !== window.location.pathname + window.location.search;

    return {
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        if (isElsewhere(href)) loader.start();
        router.push(href, options);
      },
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => {
        if (isElsewhere(href)) loader.start();
        router.replace(href, options);
      },
    };
  }, [router, loader]);
}
