import { useQuery } from "@tanstack/react-query";

interface PublicEvent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  event_date: string | null;
  event_end_date: string | null;
  event_time_type: "standard" | "salah";
  event_start_time: string | null;
  item_type: "announcement" | "event";
  pdf_url: string | null;
  display_order: number;
}

interface PublicEventsResponse {
  success: boolean;
  events: PublicEvent[];
  count: number;
}

const fetchPublicEvents = async (): Promise<PublicEvent[]> => {
  const response = await fetch(
    "https://kqezxvivoddnqmylsuwd.supabase.co/functions/v1/get-public-events"
  );

  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }

  const data: PublicEventsResponse = await response.json();

  if (!data.success) {
    throw new Error("API returned unsuccessful response");
  }

  return data.events.sort((a, b) => a.display_order - b.display_order);
};

export const usePublicEvents = () => {
  return useQuery({
    queryKey: ["public-events"],
    queryFn: fetchPublicEvents,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
};

export type { PublicEvent };
