import { useState } from "react";
import { Bell, Clock, Megaphone, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface NotificationPrefs {
  notify_begin_times: boolean;
  notify_iqamah: boolean;
  notify_announcements: boolean;
  notify_events: boolean;
}

interface NotificationPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (prefs: NotificationPrefs) => void;
  isLoading?: boolean;
}

const NotificationPreferences = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: NotificationPreferencesProps) => {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    notify_begin_times: true,
    notify_iqamah: true,
    notify_announcements: true,
    notify_events: true,
  });

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    onConfirm(prefs);
  };

  const preferences = [
    {
      key: "notify_begin_times" as const,
      label: "Prayer Begin Times",
      description: "Get notified when prayer times begin",
      icon: Clock,
    },
    {
      key: "notify_iqamah" as const,
      label: "Iqamah Times",
      description: "Get notified when Iqamah is about to start",
      icon: Bell,
    },
    {
      key: "notify_announcements" as const,
      label: "Announcements",
      description: "Get notified when new announcements are posted",
      icon: Megaphone,
    },
    {
      key: "notify_events" as const,
      label: "Events",
      description: "Get notified when special events go live",
      icon: Calendar,
    },
  ];

  const selectedCount = Object.values(prefs).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Choose which notifications you'd like to receive. All are enabled by default.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {preferences.map(({ key, label, description, icon: Icon }) => (
            <div
              key={key}
              className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
            >
              <Checkbox
                id={key}
                checked={prefs[key]}
                onCheckedChange={() => togglePref(key)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={key}
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedCount === 0}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enabling...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Enable Notifications
              </>
            )}
          </Button>
        </DialogFooter>

        {selectedCount === 0 && (
          <p className="text-xs text-destructive text-center">
            Please select at least one notification type
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPreferences;
