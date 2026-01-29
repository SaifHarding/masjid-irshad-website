import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeController } from "@/components/ThemeController";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes default - prayer times and events don't change frequently
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
      refetchOnWindowFocus: false, // Disabled by default - most queries already set this explicitly
      refetchOnReconnect: true, // Keep this enabled for offline -> online transitions
      retry: 2, // Retry failed requests twice before giving up
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeController>
        <App />
      </ThemeController>
    </ThemeProvider>
  </QueryClientProvider>
);
