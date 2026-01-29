import { Bell } from "lucide-react";
import { usePublicEvents } from "@/hooks/usePublicEvents";

const AnnouncementBubble = () => {
  const { data: events, isLoading } = usePublicEvents();

  const handleClick = () => {
    const section = document.getElementById("announcements-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Don't show if loading or no events
  if (isLoading || !events || events.length === 0) {
    return null;
  }

  const count = events.length;

  return (
    <button
      onClick={handleClick}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white border border-white/30 px-5 py-2 rounded-full hover:bg-white/25 hover:scale-105 transition-all duration-300 animate-fade-in text-xs"
      aria-label={`${count} new announcement${count > 1 ? 's' : ''}`}
    >
      <Bell className="h-3 w-3" />
      <span className="font-medium">
        {count} {count === 1 ? "Announcement" : "Announcements"}
      </span>
    </button>
  );
};

export default AnnouncementBubble;
