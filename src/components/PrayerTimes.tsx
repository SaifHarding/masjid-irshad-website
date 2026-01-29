import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Clock, Loader2, Sun, AlertTriangle, CalendarDays } from "lucide-react";
import { usePrayerTimes, useHijriDate, PrayerTimesData } from "@/hooks/usePrayerTimes";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { throttle } from "@/lib/utils";
const PrayerTimes = () => {
  const { data: prayerResult, isLoading, error } = usePrayerTimes();
  const { data: hijriData } = useHijriDate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextPrayer, setNextPrayer] = useState<{ name: string; timeUntil: string; isUrgent: boolean } | null>(null);
  const [activePrayer, setActivePrayer] = useState<string | null>(null);

  const prayerData = prayerResult?.data;
  const isUsingCache = prayerResult?.source === 'cache';
  const isUsingApiFallback = prayerResult?.source === 'api_fallback';

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Calculate time in minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Add minutes to a time string
  const addMinutes = (timeStr: string, minutesToAdd: number): string => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
  };

  // Calculate Ishraq (15 mins after Sunrise) and Zawaal (a few mins before Dhuhr)
  const calculateSpecialTimes = (data: PrayerTimesData) => {
    return {
      ishraq: addMinutes(data.Sunrise, 15),
      zawaal: addMinutes(data.Dhuhr_Begins, -10), // 10 mins before Dhuhr
    };
  };

  // Calculate next prayer and countdown
  useEffect(() => {
    if (!prayerData) return;

    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayerTimes = [
      { name: "Fajr", time: prayerData.Fajr_Begins, jamaat: prayerData.Fajr_Jamaat },
      { name: "Dhuhr", time: prayerData.Dhuhr_Begins, jamaat: prayerData.Dhuhr_Jamaat },
      { name: "Asr", time: prayerData.Asr_Begins, jamaat: prayerData.Asr_Jamaat },
      { name: "Maghrib", time: prayerData.Maghrib_Begins, jamaat: prayerData.Maghrib_Jamaat },
      { name: "Isha", time: prayerData.Isha_Begins, jamaat: prayerData.Isha_Jamaat },
    ];

    // Normalize prayer times across the day (handle afternoon/evening correctly)
    let lastMinutes = 0;
    const extendedPrayerTimes = prayerTimes.map((prayer, index) => {
      let minutes = timeToMinutes(prayer.time);
      if (index === 0) {
        lastMinutes = minutes;
      } else {
        while (minutes <= lastMinutes) {
          minutes += 12 * 60; // bump by 12 hours until it's after the previous
        }
        lastMinutes = minutes;
      }
      return { ...prayer, minutes };
    });

    // Find active prayer (between current prayer begins and next prayer begins)
    let currentActive: string | null = null;
    for (let i = 0; i < extendedPrayerTimes.length; i++) {
      const prayer = extendedPrayerTimes[i];
      const beginsMinutes = prayer.minutes;
      const nextPrayerMinutes = i < extendedPrayerTimes.length - 1
        ? extendedPrayerTimes[i + 1].minutes
        : beginsMinutes + 24 * 60; // If last prayer, extend to next day

      if (currentMinutes >= beginsMinutes && currentMinutes < nextPrayerMinutes) {
        currentActive = prayer.name;
        break;
      }
    }
    setActivePrayer(currentActive);

    // Check if we're between Fajr Jamaat and Sunrise
    const fajrJamaatMinutes = timeToMinutes(prayerData.Fajr_Jamaat);
    const sunriseMinutes = timeToMinutes(prayerData.Sunrise);
    
    if (currentMinutes >= fajrJamaatMinutes && currentMinutes < sunriseMinutes) {
      const minutesUntil = sunriseMinutes - currentMinutes;
      const hours = Math.floor(minutesUntil / 60);
      const mins = minutesUntil % 60;
      setNextPrayer({
        name: "Sunrise",
        timeUntil: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
        isUrgent: minutesUntil <= 20,
      });
      return;
    }

    // Check if it's Friday and handle Jummah countdown
    const isFriday = prayerData.Day === 'Fri' || now.getDay() === 5;
    
    if (isFriday && prayerData.Jummah_1 && prayerData.Jummah_2) {
      let jummah1Minutes = timeToMinutes(prayerData.Jummah_1);
      let jummah2Minutes = timeToMinutes(prayerData.Jummah_2);
      
      // Normalize Jummah times to PM if needed (they should be around noon)
      if (jummah1Minutes < 10 * 60) jummah1Minutes += 12 * 60;
      if (jummah2Minutes < 10 * 60) jummah2Minutes += 12 * 60;
      
      // After sunrise and before/during Jummah window
      if (currentMinutes >= sunriseMinutes) {
        if (currentMinutes < jummah1Minutes) {
          const minutesUntil = jummah1Minutes - currentMinutes;
          const hours = Math.floor(minutesUntil / 60);
          const mins = minutesUntil % 60;
          setNextPrayer({
            name: "1st Jumuah",
            timeUntil: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
            isUrgent: minutesUntil <= 20,
          });
          return;
        } else if (currentMinutes < jummah2Minutes) {
          const minutesUntil = jummah2Minutes - currentMinutes;
          const hours = Math.floor(minutesUntil / 60);
          const mins = minutesUntil % 60;
          setNextPrayer({
            name: "2nd Jumuah",
            timeUntil: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
            isUrgent: minutesUntil <= 20,
          });
          return;
        }
      }
    }

    // Find next prayer (using Iqamah/Jamaat times for database/cache, Begins times for API fallback)
    let nextPrayerInfo: { name: string; timeUntil: string; isUrgent: boolean } | null = null;
    for (const prayer of extendedPrayerTimes) {
      // Use begins time for API fallback (since jamaat times aren't available), jamaat for database/cache
      let targetMinutes: number;
      if (isUsingApiFallback) {
        targetMinutes = prayer.minutes; // Use begins time
      } else {
        // Use jamaat time for countdown, normalized like begin times
        targetMinutes = timeToMinutes(prayer.jamaat);
        while (targetMinutes < prayer.minutes) {
          targetMinutes += 12 * 60;
        }
      }
      if (targetMinutes > currentMinutes) {
        const minutesUntil = targetMinutes - currentMinutes;
        const hours = Math.floor(minutesUntil / 60);
        const mins = minutesUntil % 60;
        nextPrayerInfo = {
          name: prayer.name,
          timeUntil: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
          isUrgent: minutesUntil <= 20,
        };
        break;
      }
    }

    // If no prayer found (after Isha), next is Fajr tomorrow
    if (!nextPrayerInfo) {
      const fajrMinutes = timeToMinutes(prayerData.Fajr_Begins);
      const minutesUntilMidnight = 24 * 60 - currentMinutes;
      const minutesUntil = minutesUntilMidnight + fajrMinutes;
      const hours = Math.floor(minutesUntil / 60);
      const mins = minutesUntil % 60;
      nextPrayerInfo = {
        name: "Fajr",
        timeUntil: `${hours}h ${mins}m`,
        isUrgent: false,
      };
    }

    setNextPrayer(nextPrayerInfo);
  }, [prayerData, currentTime]);

  // Format date with ordinal suffix (e.g., "Sun, 30th Nov 2025")
  const formatDateWithOrdinal = (dateStr: string, dayName: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const ordinal = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : ((day % 100 - day % 10 !== 10) ? day % 10 : 0)];
    const month = format(date, 'MMM');
    const year = format(date, 'yyyy');
    return `${dayName}, ${day}${ordinal} ${month} ${year}`;
  };

  const specialTimes = prayerData ? calculateSpecialTimes(prayerData) : null;

  const prayers = prayerData ? [
    { 
      name: "Fajr", 
      start: formatTime(prayerData.Fajr_Begins), 
      iqamah: formatTime(prayerData.Fajr_Jamaat)
    },
    { 
      name: "Dhuhr", 
      start: formatTime(prayerData.Dhuhr_Begins), 
      iqamah: formatTime(prayerData.Dhuhr_Jamaat)
    },
    { 
      name: "Asr", 
      start: formatTime(prayerData.Asr_Begins), 
      iqamah: formatTime(prayerData.Asr_Jamaat)
    },
    { 
      name: "Maghrib", 
      start: formatTime(prayerData.Maghrib_Begins), 
      iqamah: formatTime(prayerData.Maghrib_Jamaat)
    },
    { 
      name: "Isha", 
      start: formatTime(prayerData.Isha_Begins), 
      iqamah: formatTime(prayerData.Isha_Jamaat)
    },
  ] : [];

  const jumuah = prayerData ? [
    { label: "1st Jumuah", time: formatTime(prayerData.Jummah_1) },
    { label: "2nd Jumuah", time: formatTime(prayerData.Jummah_2) },
  ] : [];

  // Throttled 3D card animation handler to prevent layout thrashing
  const handleCardMouseMove = useMemo(
    () =>
      throttle((e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
      }, 16), // ~60fps
    []
  );

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
  };

  return (
    <section id="prayer-times" className="py-6 sm:py-8 md:py-16 bg-secondary/30">
      <div className="container px-3 sm:px-4">
        <div className="text-center mb-4 sm:mb-6 md:mb-12">
          <div className="flex items-center justify-center gap-3 mb-2 sm:mb-3 md:mb-4">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-foreground">
              Prayer Times
            </h2>
          </div>
          <Link to="/prayer-calendar" className="inline-block mb-4">
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2 text-primary border-primary hover:bg-primary hover:text-primary-foreground"
            >
              <CalendarDays className="h-4 w-4" />
              Prayer Calendar
            </Button>
          </Link>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading prayer times...</span>
            </div>
          ) : error ? (
            <p className="text-destructive">Unable to load prayer times. Please refresh the page.</p>
          ) : prayerData ? (
            <div>
              <div className="mb-3 md:mb-6">
                <p className="text-muted-foreground text-base md:text-lg">{formatDateWithOrdinal(prayerData.Date, prayerData.Day)}</p>
                {hijriData && (
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {parseInt(hijriData.day) + 1} {hijriData.month.en} {hijriData.year} هـ
                  </p>
                )}
              </div>
              <div className="text-center mb-3 md:mb-6">
                <span className="text-2xl md:text-3xl font-bold text-primary">{format(currentTime, "h:mm:ss a")}</span>
              </div>
              {nextPrayer && (
                <p className="text-base md:text-lg text-muted-foreground">
                  {nextPrayer.name === "Sunrise" ? "Time until " : isUsingApiFallback ? "Next Prayer: " : "Next Iqamah: "}
                  <span className="font-semibold text-primary">
                    {nextPrayer.name}
                  </span> in <span className={`font-semibold ${nextPrayer.isUrgent ? 'text-red-600' : ''}`}>{nextPrayer.timeUntil}</span>
                </p>
              )}
            </div>
          ) : null}
          
          {isUsingCache && !isLoading && !error && (
            <Alert className="mt-4 max-w-2xl mx-auto bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Using Cached Data:</strong> Times shown are from your last successful connection.
              </AlertDescription>
            </Alert>
          )}
          
          {isUsingApiFallback && !isLoading && !error && (
            <Alert variant="destructive" className="mt-4 max-w-2xl mx-auto bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                <strong>Connection Issue:</strong> We're experiencing an upstream problem connecting to our prayer times database. Times shown are estimated.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          {!isLoading && !error && prayers.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-primary text-primary-foreground">
                      <th className="py-2 px-3 md:py-4 md:px-6 text-left text-sm md:text-base font-semibold">Prayer</th>
                      <th className="py-2 px-3 md:py-4 md:px-6 text-center text-sm md:text-base font-semibold">Begins</th>
                      <th className="py-2 px-3 md:py-4 md:px-6 text-center text-sm md:text-base font-semibold">Iqamah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prayers.map((prayer, index) => {
                      const isActive = activePrayer === prayer.name;
                      return (
                         <tr 
                          key={prayer.name}
                          className={`border-b last:border-b-0 transition-colors ${
                            isActive 
                              ? 'bg-primary/20 hover:bg-primary/30 border-l-4 border-l-primary' 
                              : index % 2 === 0 
                                ? 'bg-background hover:bg-muted/50' 
                                : 'bg-muted/20 hover:bg-muted/40'
                          }`}
                        >
                          <td className={`py-2 px-3 md:py-4 md:px-6 font-semibold text-center text-sm md:text-base ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {prayer.name}
                          </td>
                          <td className="py-2 px-3 md:py-4 md:px-6 text-center text-sm md:text-base text-muted-foreground">
                            {prayer.start}
                          </td>
                          <td className="py-2 px-3 md:py-4 md:px-6 text-center">
                            {isUsingApiFallback ? (
                              <span className="text-muted-foreground text-sm md:text-base">—</span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 md:gap-2 font-semibold text-sm md:text-base ${isActive ? 'text-primary' : 'text-primary'}`}>
                                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                                {prayer.iqamah}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="mt-3 sm:mt-4 md:mt-8 grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 px-1">
            {jumuah.map((jum) => (
              <Card
                key={jum.label}
                className="p-2.5 sm:p-3 md:p-4 bg-accent text-accent-foreground text-center hover:shadow-xl hover:-translate-y-2 hover:border-primary/50 transition-all duration-300 group will-change-transform"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
                  transform: 'translateZ(0)' // Force GPU acceleration
                }}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <h3 className="font-semibold text-xs sm:text-sm md:text-base mb-0.5 sm:mb-1 transition-transform duration-300 group-hover:scale-105">{jum.label}</h3>
                <p className="text-base sm:text-lg md:text-xl font-bold transition-transform duration-300 group-hover:scale-110">{jum.time}</p>
              </Card>
            ))}
          </div>

          {prayerData && specialTimes && (
            <div className="mt-4 md:mt-6 text-center">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-6 text-sm md:text-base text-foreground px-2">
                <div className="flex items-center gap-1.5">
                  <Sun className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                  <span className="whitespace-nowrap">Sunrise: <span className="font-medium">{formatTime(prayerData.Sunrise)}</span></span>
                </div>
                <span className="hidden sm:inline text-muted-foreground/50">|</span>
                <div>
                  <span className="whitespace-nowrap">Ishraq: <span className="font-medium">{formatTime(specialTimes.ishraq)}</span></span>
                </div>
                <span className="hidden sm:inline text-muted-foreground/50">|</span>
                <div>
                  <span className="whitespace-nowrap">Zawaal: <span className="font-medium">{formatTime(specialTimes.zawaal)}</span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PrayerTimes;
