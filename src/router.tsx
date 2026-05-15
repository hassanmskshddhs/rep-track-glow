import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data around long enough to survive a full app reload while
        // offline (24h). Network requests still refresh on focus/mount.
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 30,
        retry: 1,
        // If the network is gone, return cached data instead of throwing.
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "offlineFirst",
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
