import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2, Megaphone, ChevronDown, ChevronUp, ZoomIn, Maximize2 } from "lucide-react";
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

const AnnouncementsSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);
  
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
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

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
            <div className="px-2 md:px-6">
              <Carousel
                setApi={setApi}
                opts={{
                  align: "center",
                  loop: true,
                }}
                plugins={[
                  Autoplay({
                    delay: 6000,
                    stopOnInteraction: true,
                    stopOnMouseEnter: true,
                  }),
                ]}
                className="w-full"
              >
                <CarouselContent>
                  {events.map((event) => (
                    <CarouselItem key={event.id}>
                      {event.image_url ? (
                        /* Image-based display - tap to enlarge */
                        <div className="rounded-lg shadow-md overflow-hidden">
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
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                            
                            {/* Date badge */}
                            {event.event_date && (
                              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatEventDate(event.event_date, event.event_end_date)}
                              </div>
                            )}
                            
                            {/* Expand icon hint */}
                            <div className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full opacity-70 group-hover:opacity-100 transition-opacity">
                              <Maximize2 className="h-4 w-4" />
                            </div>

                            {/* Title overlay only */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 text-left pointer-events-none">
                              <h3 className={`text-white font-bold ${TEXT_SIZE_CLASSES[textSize].title} mb-1 line-clamp-2 drop-shadow-lg`}>
                                {event.title}
                              </h3>
                            </div>
                          </div>
                          
                          {/* Description below image with Read More */}
                          {event.description && (
                            <div className="p-4 bg-muted/50">
                              <ExpandableDescription 
                                description={event.description} 
                                textSizeClass={TEXT_SIZE_CLASSES[textSize].description}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Text-only display - with preserved formatting */
                        <div className="rounded-lg bg-muted/50 p-5 md:p-6 space-y-4 max-h-[500px] overflow-y-auto">
                          {/* Date badge */}
                          {event.event_date && (
                            <div className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatEventDate(event.event_date, event.event_end_date)}
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
                            </div>
                          </div>
                        </div>
                      )}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="bg-background/80 backdrop-blur-sm border-border hover:bg-background -left-3 md:-left-8" />
                <CarouselNext className="bg-background/80 backdrop-blur-sm border-border hover:bg-background -right-3 md:-right-8" />
              </Carousel>

              {/* Dot indicators */}
              {events.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {events.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
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
