import { AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RateLimitAlertProps {
  timeRemaining: string;
  message?: string;
}

export function RateLimitAlert({ timeRemaining, message }: RateLimitAlertProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Rate Limit Exceeded
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">{message || "You've made too many requests. Please wait before trying again."}</p>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          <span>Retry available in: {timeRemaining}</span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
