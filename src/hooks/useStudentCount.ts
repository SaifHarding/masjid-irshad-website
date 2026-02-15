import { useQuery } from "@tanstack/react-query";

interface StudentCountData {
  total: number;
  boys: number;
  girls: number;
}

export const useStudentCount = () => {
  return useQuery({
    queryKey: ["student-count"],
    queryFn: async (): Promise<StudentCountData> => {
      const response = await fetch(
        "https://kqezxvivoddnqmylsuwd.supabase.co/functions/v1/get-student-count"
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch student count");
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });
};
