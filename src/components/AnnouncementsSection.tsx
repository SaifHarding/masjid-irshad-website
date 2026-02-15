import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Clock, Loader2, Megaphone, ChevronDown, ChevronUp, ZoomIn, Maximize2, Download, FileText } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { usePublicEvents } from "@/hooks/usePublicEvents";
import AddToCalendarButton from "@/components/AddToCalendarButton";

const isPdfUrl = (url: string): boolean => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().endsWith(".pdf");
  }
};

// Removed unused downloadAnnouncementPdf function

const TEXT_SIZE_KEY = "announcement-text-size";

type TextSize = "regular" | "large" | "xlarge";

const TEXT_SIZE_CLASSES: Record<TextSize, { title: string; description: string; label: string }> = {
  regular: { title: "text-xl", description: "text-sm", label: "A" },
  large: { title: "text-2xl", description: "text-base", label: "A+" },
  xlarge: { title: "text-3xl", description: "text-lg", label: "A++" },
};

const formatEventDate = (startDate: string, endDate?: string | null): string => {
  const start = parseISO(startDate);
  if (endDate) {
    const end = parseISO(endDate);
    if (format(start, "MMMM yyyy") === format(end, "MMMM yyyy")) {
      return `${format(start, "d")} - ${format(end, "d MMMM yyyy")}`;
    }
    return `${format(start, "d MMM")} - ${format(end, "d MMM yyyy")}`;
  }
  return format(start, "d MMMM yyyy");
};

const formatEventTime = (timeType: "standard" | "salah", startTime: string | null): string | null => {
  if (!startTime) return null;
  if (timeType === "salah") return startTime;
  // Standard: convert "18:30" to "6:30 PM"
  const parts = startTime.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return startTime;
  let hour = parts[0];
  const minute = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${ampm}`;
};

// Character threshold for showing "Read More"
const DESCRIPTION_THRESHOLD = 200;

interface ExpandableDescriptionProps {
  description: string;
  textSizeClass: string;
}

const ExpandableDescription = ({ description, textSizeClass }: ExpandableDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = description.length > DESCRIPTION_THRESHOLD;

  const displayText = isExpanded || !isLong 
    ? description 
    : description.slice(0, DESCRIPTION_THRESHOLD).trim() + "...";

  return (
    <div className="space-y-2">
      <p className={`text-muted-foreground ${textSizeClass} leading-relaxed whitespace-pre-line`}>
        {displayText}
      </p>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary hover:text-primary/80 p-0 h-auto font-medium text-sm"
        >
          {isExpanded ? (
            <>
              Show Less <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              Read More <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};

const AUTOPLAY_DELAY = 7000;

const downloadPdfWithJsPDF = async (pdfUrl: string, title: string) => {
  try {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF download failed:", error);
    // Fallback: open in new tab
    window.open(pdfUrl, "_blank");
  }
};

const AnnouncementsSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef<number | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autoplayPlugin = useRef(
    Autoplay({
      delay: AUTOPLAY_DELAY,
      stopOnInteraction: false,
    })
  );
  
  // Text size state with localStorage persistence
  const [textSize, setTextSize] = useState<TextSize>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TEXT_SIZE_KEY);
      if (saved === "regular" || saved === "large" || saved === "xlarge") {
        return saved;
      }
    }
    return "regular";
  });

  const cycleTextSize = () => {
    const nextSize: TextSize = textSize === "regular" ? "large" : textSize === "large" ? "xlarge" : "regular";
    setTextSize(nextSize);
    localStorage.setItem(TEXT_SIZE_KEY, nextSize);
  };

  const { data: events, isLoading, error } = usePublicEvents();

  const onSelect = useCallback(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
    setProgress(0);
  }, [api]);

  // Progress bar animation - restarts from 0 on slide change or unpause
  useEffect(() => {
    if (!api || !events || events.length <= 1 || isPaused) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min((elapsed / AUTOPLAY_DELAY) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        progressRef.current = requestAnimationFrame(tick);
      }
    };

    progressRef.current = requestAnimationFrame(tick);

    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [api, selectedIndex, events, isPaused]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    // Detect drag/swipe interaction to hide progress bar
    const onPointerDown = () => setUserInteracted(true);
    api.on("pointerDown", onPointerDown);
    return () => {
      api.off("select", onSelect);
      api.off("pointerDown", onPointerDown);
    };
  }, [api, onSelect]);

  const handleMouseEnter = useCallback(() => {
    (autoplayPlugin.current as any).stop?.();
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    (autoplayPlugin.current as any).play?.();
    setProgress(0);
    setIsPaused(false);
  }, []);

  const hasEvents = events && events.length > 0;
  
  // Check if any event has text content that can be resized (description or text-only)
  const hasResizableText = events?.some(event => event.description || !event.image_url);

  return (
    <section
      id="announcements-section"
      ref={ref}
      className={`py-8 sm:py-10 md:py-10 bg-gradient-to-b from-background to-muted/30 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "md:opacity-0 md:translate-y-12"
      }`}
    >
      <div className="container max-w-4xl px-3 sm:px-4">
        <Card className="p-3 sm:p-4 md:p-5 shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg md:text-lg font-bold text-foreground flex-1 text-center">
              Announcements & Events
            </h2>
            {hasResizableText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cycleTextSize}
                      className="flex items-center gap-1.5 text-foreground border-primary/30 hover:border-primary hover:bg-primary/10 shrink-0"
                      aria-label={`Text size: ${textSize}. Click to change.`}
                    >
                      <ZoomIn className="h-4 w-4" />
                      <span className="text-xs font-semibold">
                        {textSize === "regular" ? "Aa" : textSize === "large" ? "Aa+" : "Aa++"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm">
                    <p className="font-medium">Resize Text</p>
                    <p className="text-muted-foreground text-xs">
                      Currently: {textSize === "regular" ? "Regular" : textSize === "large" ? "Large" : "Extra Large"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error || !hasEvents ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>No announcements at this time.</p>
            </div>
          ) : (
            <div
              className="px-2 md:px-6"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Carousel
                setApi={setApi}
                opts={{
                  align: "center",
                  loop: true,
                }}
                plugins={[autoplayPlugin.current]}
                className="w-full"
              >
                {/* Progress bar indicator - hidden after user interaction */}
                {events.length > 1 && !userInteracted && (
                  <div className="h-0.5 w-full bg-muted-foreground/10 rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                <CarouselContent>
                  {events.map((event) => (
                    <CarouselItem
                      key={event.id}
                    >
                      {event.image_url ? (
                        /* Image/PDF-based display */
                        <div className="rounded-lg shadow-md overflow-hidden">
                          {isPdfUrl(event.image_url) ? (
                            /* PDF display */
                            <div className="relative">
                              <object
                                data={event.image_url}
                                type="application/pdf"
                                className="w-full h-[70vh] bg-muted/30 rounded-t-lg"
                              >
                                {/* Fallback for mobile / unsupported browsers */}
                                <div className="flex flex-col items-center justify-center h-[40vh] bg-muted/30 gap-4">
                                  <FileText className="h-16 w-16 text-primary/60" />
                                  <h3 className={`font-bold ${TEXT_SIZE_CLASSES[textSize].title} text-foreground text-center px-4`}>
                                    {event.title}
                                  </h3>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(event.image_url!, "_blank")}
                                    className="gap-2"
                                  >
                                    <FileText className="h-4 w-4" /> View PDF
                                  </Button>
                                </div>
                              </object>
                              {/* Title overlay for PDF */}
                              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                                <h3 className={`text-white font-bold ${TEXT_SIZE_CLASSES[textSize].title} mb-1 line-clamp-2 drop-shadow-lg`}>
                                  {event.title}
                                </h3>
                              </div>
                            </div>
                          ) : (
                            /* Image display - tap to enlarge */
                            <div 
                              className="relative cursor-pointer group"
                              onClick={() => setFullscreenImage({ url: event.image_url!, title: event.title })}
                            >
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-auto object-contain max-h-[70vh] bg-muted/30"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                              <div className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full opacity-70 group-hover:opacity-100 transition-opacity">
                                <Maximize2 className="h-4 w-4" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-4 text-left pointer-events-none">
                                <h3 className={`text-white font-bold ${TEXT_SIZE_CLASSES[textSize].title} mb-1 line-clamp-2 drop-shadow-lg`}>
                                  {event.title}
                                </h3>
                              </div>
                            </div>
                          )}
                          
                          {/* Info below image */}
                          <div className="px-3 sm:px-4 py-2 bg-muted/50">
                            {event.event_date && (
                              <div className="flex flex-col items-center sm:flex-row sm:items-center gap-1 sm:gap-x-1.5 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5 justify-center">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  <span className="font-medium">{formatEventDate(event.event_date, event.event_end_date)}</span>
                                  {(() => {
                                    const timeStr = formatEventTime(event.event_time_type, event.event_start_time);
                                    return timeStr ? (
                                      <>
                                        <span className="text-muted-foreground/40">·</span>
                                        <Clock className="h-3 w-3 shrink-0" />
                                        <span>{timeStr}</span>
                                      </>
                                    ) : null;
                                  })()}
                                </div>
                                {event.item_type !== "announcement" && (
                                  <>
                                    <span className="hidden sm:inline text-muted-foreground/40">·</span>
                                    <AddToCalendarButton event={event} />
                                  </>
                                )}
                              </div>
                            )}
                            {event.description && (
                              <div className="mt-1.5">
                                <ExpandableDescription 
                                  description={event.description} 
                                  textSizeClass={TEXT_SIZE_CLASSES[textSize].description}
                                />
                              </div>
                            )}
                            {/* Download PDF button - only if pdf_url exists */}
                            {event.pdf_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-xs text-primary hover:text-primary/80 mt-1"
                                onClick={() => downloadPdfWithJsPDF(event.pdf_url!, event.title)}
                              >
                                <Download className="h-3.5 w-3.5" /> Download PDF
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Text-only display - with preserved formatting */
                        <div className="rounded-lg bg-muted/50 p-5 md:p-6 space-y-4 max-h-[500px] overflow-y-auto">
                          {/* Date badge */}
                          {event.event_date && (
                            <div className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatEventDate(event.event_date, event.event_end_date)}
                              {(() => {
                                const timeStr = formatEventTime(event.event_time_type, event.event_start_time);
                                return timeStr ? (
                                  <span className="flex items-center gap-1 ml-1 border-l border-primary-foreground/30 pl-2">
                                    <Clock className="h-3 w-3" />
                                    {timeStr}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          )}
                          
                          {/* Title */}
                          <div className="flex items-start gap-3">
                            <Megaphone className="h-6 w-6 text-primary mt-0.5 shrink-0" />
                            <div className="space-y-3 flex-1">
                              <h3 className={`font-bold ${TEXT_SIZE_CLASSES[textSize].title} text-foreground`}>
                                {event.title}
                              </h3>
                              {event.description && (
                                <ExpandableDescription 
                                  description={event.description} 
                                  textSizeClass={TEXT_SIZE_CLASSES[textSize].description}
                                />
                              )}
                              {event.event_date && event.item_type !== "announcement" && (
                                <div className="mt-2">
                                  <AddToCalendarButton event={event} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious onClick={() => setUserInteracted(true)} className="bg-background/80 backdrop-blur-sm border-border hover:bg-background -left-3 md:-left-8" />
                <CarouselNext onClick={() => setUserInteracted(true)} className="bg-background/80 backdrop-blur-sm border-border hover:bg-background -right-3 md:-right-8" />
              </Carousel>

              {/* Dot indicators */}
              {events.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {events.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => { setUserInteracted(true); api?.scrollTo(index); }}
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        index === selectedIndex
                          ? "bg-primary"
                          : "bg-muted-foreground/30"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Fullscreen Image Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/95 border-none">
          <DialogTitle className="sr-only">{fullscreenImage?.title}</DialogTitle>
          {fullscreenImage && (
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.title}
              className="w-full h-full object-contain max-h-[90vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AnnouncementsSection;
