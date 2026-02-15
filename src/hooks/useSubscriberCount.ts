import { useQuery } from "@tanstack/react-query";
import { getBackendClient } from "@/lib/backendClient";

export const useSubscriberCount = () => {
  return useQuery({
    queryKey: ["subscriber-count"],
    queryFn: async () => {
      const supabase = getBackendClient();
      const { data, error } = await supabase.functions.invoke("get-subscriber-count");
      
      if (error) {
        console.error("[useSubscriberCount] Error:", error);
        return 0;
      }
      
      return data?.count ?? 0;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
