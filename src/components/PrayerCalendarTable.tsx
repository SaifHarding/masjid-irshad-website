import { format, parseISO, isToday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { PrayerTimesData } from "@/hooks/usePrayerTimes";
import { cn } from "@/lib/utils";

interface PrayerCalendarTableProps {
  data: PrayerTimesData[];
  isLoading: boolean;
  forPdf?: boolean;
}

const formatTime = (time: string): string => {
  if (!time) return "-";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes}${ampm}`;
};

const PrayerCalendarTable = ({ data, isLoading, forPdf = false }: PrayerCalendarTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No prayer times available for this month.
      </div>
    );
  }

  const thBaseClass = forPdf 
    ? "px-2 py-1 text-center align-middle font-medium text-xs"
    : "h-12 px-2 md:px-4 text-center align-middle font-medium";
  const tdBaseClass = forPdf 
    ? "px-1 py-1 align-middle text-center text-xs"
    : "p-2 md:p-4 align-middle";

  // PDF-specific styles for inline rendering
  if (forPdf) {
    return (
      <div style={{ overflow: "visible", backgroundColor: "white", borderRadius: "4px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px" }}>
          <thead>
            <tr style={{ backgroundColor: "#0d7377" }}>
              <th rowSpan={2} style={{ padding: "6px 4px", color: "white", fontWeight: 600, border: "1px solid #0a5c5e" }}>Date</th>
              <th rowSpan={2} style={{ padding: "6px 4px", color: "white", fontWeight: 600, border: "1px solid #0a5c5e" }}>Day</th>
              <th colSpan={2} style={{ padding: "6px 4px", color: "white", fontWeight: 600, border: "1px solid #0a5c5e" }}>Fajr</th>
              <th rowSpan={2} style={{ padding: "6px 4px", color: "white", fontWeight: 600, border: "1px solid #0a5c5e" }}>Sunrise</th>
              <th colSpan={2} style={{ padding: "6px 4px", color: "white", fontWeight: 600, border: "1px solid #0a5c5e" }}>Dhuhr</th>
              <th colSpan={2} style={{ padding: "6px 4px", color: "white", fontWeight: 600, border: "1px solid #0a5c5e" }}>Asr</th>
              <th colSpan={2} style={{ padding: "6px 4px", color: "white", fontWeight: 600, border: "1px solid #0a5c5e" }}>Maghrib</th>
              <th colSpan={2} style={{ padding: "6px 4px", color: "white", fontWeight: 600, border: "1px solid #0a5c5e" }}>Isha</th>
            </tr>
            <tr style={{ backgroundColor: "#0a5c5e" }}>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Begins</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Iqamah</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Begins</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Iqamah</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Begins</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Iqamah</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Begins</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Iqamah</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Begins</th>
              <th style={{ padding: "4px 2px", color: "rgba(255,255,255,0.9)", fontSize: "7px", border: "1px solid #0a5c5e" }}>Iqamah</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const dateObj = parseISO(row.Date);
              const isFriday = row.Day === "Fri";
              const isTodayRow = isToday(dateObj);
              const bgColor = isFriday ? "#fef3c7" : isTodayRow ? "#ccfbf1" : index % 2 === 0 ? "#ffffff" : "#f1f5f9";

              return (
                <tr key={row.Date} style={{ backgroundColor: bgColor }}>
                  <td style={{ padding: "4px 2px", textAlign: "center", fontWeight: 500, border: "1px solid #e2e8f0" }}>{format(dateObj, "d")}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", fontWeight: isFriday ? 600 : 400, color: isFriday ? "#0d7377" : "inherit", border: "1px solid #e2e8f0" }}>{row.Day}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>{formatTime(row.Fajr_Begins)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", fontWeight: 500, border: "1px solid #e2e8f0" }}>{formatTime(row.Fajr_Jamaat)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>{formatTime(row.Sunrise)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>{formatTime(row.Dhuhr_Begins)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", fontWeight: 500, border: "1px solid #e2e8f0" }}>{formatTime(row.Dhuhr_Jamaat)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>{formatTime(row.Asr_Begins)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", fontWeight: 500, border: "1px solid #e2e8f0" }}>{formatTime(row.Asr_Jamaat)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>{formatTime(row.Maghrib_Begins)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", fontWeight: 500, border: "1px solid #e2e8f0" }}>{formatTime(row.Maghrib_Jamaat)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>{formatTime(row.Isha_Begins)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "center", fontWeight: 500, border: "1px solid #e2e8f0" }}>{formatTime(row.Isha_Jamaat)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Table styling - follows the site theme
  const tableContainerClass = "overflow-auto print:overflow-visible max-h-[70vh] print:max-h-none relative border rounded-md bg-background";
  const tableClass = "min-w-[900px] print:min-w-0 print:w-full print:table-fixed w-full caption-bottom text-sm text-foreground";
  const rowBgEven = "bg-background";
  const rowBgOdd = "bg-muted/30";
  const fridayBg = "bg-accent/20";
  const todayBg = "bg-primary/10";
  const hoverBg = "hover:bg-muted/50";
  const fridayText = "text-primary";

  return (
    <div className={tableContainerClass}>
      <table className={tableClass}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-primary print:bg-transparent border-b">
            <th rowSpan={2} className={cn(thBaseClass, "text-primary-foreground print:text-black print:border print:border-black font-semibold bg-primary")}>
              Date
            </th>
            <th rowSpan={2} className={cn(thBaseClass, "text-primary-foreground print:text-black print:border print:border-black font-semibold bg-primary")}>
              Day
            </th>
            <th colSpan={2} className={cn(thBaseClass, "text-primary-foreground print:text-black print:border print:border-black font-semibold border-l border-primary-foreground/30 print:border-black bg-primary")}>
              Fajr
            </th>
            <th rowSpan={2} className={cn(thBaseClass, "text-primary-foreground print:text-black print:border print:border-black font-semibold border-l border-primary-foreground/30 print:border-black bg-primary")}>
              Sunrise
            </th>
            <th colSpan={2} className={cn(thBaseClass, "text-primary-foreground print:text-black print:border print:border-black font-semibold border-l border-primary-foreground/30 print:border-black bg-primary")}>
              Dhuhr
            </th>
            <th colSpan={2} className={cn(thBaseClass, "text-primary-foreground print:text-black print:border print:border-black font-semibold border-l border-primary-foreground/30 print:border-black bg-primary")}>
              Asr
            </th>
            <th colSpan={2} className={cn(thBaseClass, "text-primary-foreground print:text-black print:border print:border-black font-semibold border-l border-primary-foreground/30 print:border-black bg-primary")}>
              Maghrib
            </th>
            <th colSpan={2} className={cn(thBaseClass, "text-primary-foreground print:text-black print:border print:border-black font-semibold border-l border-primary-foreground/30 print:border-black bg-primary")}>
              Isha
            </th>
          </tr>
          <tr className="bg-primary/80 print:bg-transparent border-b">
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs border-l border-primary-foreground/30 print:border-black bg-primary/80")}>
              Begins
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs bg-primary/80")}>
              Iqamah
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs border-l border-primary-foreground/30 print:border-black bg-primary/80")}>
              Begins
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs bg-primary/80")}>
              Iqamah
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs border-l border-primary-foreground/30 print:border-black bg-primary/80")}>
              Begins
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs bg-primary/80")}>
              Iqamah
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs border-l border-primary-foreground/30 print:border-black bg-primary/80")}>
              Begins
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs bg-primary/80")}>
              Iqamah
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs border-l border-primary-foreground/30 print:border-black bg-primary/80")}>
              Begins
            </th>
            <th className={cn(thBaseClass, "text-primary-foreground/90 print:text-black print:border print:border-black text-xs bg-primary/80")}>
              Iqamah
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((row, index) => {
            const dateObj = parseISO(row.Date);
            const isFriday = row.Day === "Fri";
            const isTodayRow = isToday(dateObj);

            return (
              <tr
                key={row.Date}
                data-friday={isFriday ? "true" : undefined}
                className={cn(
                  "border-b transition-colors print:border print:border-black",
                  hoverBg,
                  index % 2 === 0 ? rowBgEven : rowBgOdd,
                  isFriday && `${fridayBg} friday-row`,
                  isTodayRow && `${todayBg} ring-2 ring-primary ring-inset today-row`
                )}
              >
                <td className={cn(tdBaseClass, "text-center font-medium print:border print:border-black")}>
                  {format(dateObj, "d")}
                </td>
                <td className={cn(
                  tdBaseClass,
                  "text-center print:border print:border-black",
                  isFriday && `font-semibold ${fridayText} print:text-black`
                )}>
                  {row.Day}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs print:border print:border-black")}>
                  {formatTime(row.Fajr_Begins)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs font-medium print:border print:border-black")}>
                  {formatTime(row.Fajr_Jamaat)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs print:border print:border-black")}>
                  {formatTime(row.Sunrise)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs print:border print:border-black")}>
                  {formatTime(row.Dhuhr_Begins)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs font-medium print:border print:border-black")}>
                  {formatTime(row.Dhuhr_Jamaat)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs print:border print:border-black")}>
                  {formatTime(row.Asr_Begins)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs font-medium print:border print:border-black")}>
                  {formatTime(row.Asr_Jamaat)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs print:border print:border-black")}>
                  {formatTime(row.Maghrib_Begins)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs font-medium print:border print:border-black")}>
                  {formatTime(row.Maghrib_Jamaat)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs print:border print:border-black")}>
                  {formatTime(row.Isha_Begins)}
                </td>
                <td className={cn(tdBaseClass, "text-center text-xs font-medium print:border print:border-black")}>
                  {formatTime(row.Isha_Jamaat)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PrayerCalendarTable;
