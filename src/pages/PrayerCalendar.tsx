import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar, Download, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobilePrintPrompt from "@/components/MobilePrintPrompt";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PrayerCalendarTable from "@/components/PrayerCalendarTable";
import { useMonthlyPrayerTimes } from "@/hooks/useMonthlyPrayerTimes";
import { usePdfDownload } from "@/hooks/usePdfDownload";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PrayerCalendar = () => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

  const [showMobilePrintPrompt, setShowMobilePrintPrompt] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const { data, isLoading, error } = useMonthlyPrayerTimes(selectedYear, selectedMonth);

  

  const pdfFilename = `Prayer Times - ${MONTHS[selectedMonth]} ${selectedYear} - Masjid Irshad`;

  const { downloadPdf, isGenerating } = usePdfDownload({
    filename: pdfFilename,
    onSuccess: () => toast.success("PDF downloaded successfully!"),
    onError: () => toast.error("Failed to generate PDF. Please try again."),
  });

  // Update document title for meaningful PDF filename
  useEffect(() => {
    document.title = `Prayer Times - ${MONTHS[selectedMonth]} ${selectedYear} - Masjid Irshad`;
    return () => {
      document.title = "Masjid Irshad";
    };
  }, [selectedMonth, selectedYear]);

  // On mobile, printing must be triggered by a user gesture.
  // When opened with ?print=true, show a prompt with a "Print" button.
  useEffect(() => {
    if (searchParams.get("print") === "true") {
      // Remove the param so refreshing doesn't re-trigger
      setSearchParams({}, { replace: true });
      setShowMobilePrintPrompt(true);
    }
  }, [searchParams, setSearchParams]);

  const handleMobilePrintNow = () => {
    try {
      window.print();
    } catch {
      toast.error("Printing failed. Please use your browser's Share → Print menu.");
    }
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };


  const handleMonthSelect = (value: string) => {
    setSelectedMonth(parseInt(value));
  };

  const handleYearSelect = (value: string) => {
    setSelectedYear(parseInt(value));
  };

  // Generate year options (current year +/- 2 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  return (
    <div className="min-h-screen flex flex-col bg-background print:min-h-0 print:bg-white">
      <Header />

      <main className="flex-1 container py-8 print:py-0 print:px-0 print:max-w-none">
        <MobilePrintPrompt
          open={showMobilePrintPrompt}
          onClose={() => setShowMobilePrintPrompt(false)}
          onPrint={handleMobilePrintNow}
        />
        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block print-header">
          <div className="print-header-bg">
            <div className="print-decorative-top"></div>
            <div className="print-header-content">
              <div className="print-logo-section">
                <img src="/masjid-irshad-logo.png" alt="Masjid Irshad" className="print-logo" />
              </div>
              <div className="print-title-section">
                <h1 className="print-month-title">{MONTHS[selectedMonth]} {selectedYear}</h1>
                <div className="print-title-ornament"></div>
                <p className="print-mosque-name">Masjid Irshad</p>
                <p className="print-address">400 Dallow Road, Luton, LU1 1UR</p>
                <p className="print-contact">masjidirshad.co.uk</p>
              </div>
              <div className="print-qr-section">
                <QRCodeSVG 
                  value="https://masjidirshad.co.uk" 
                  size={45}
                  bgColor="#f4c430"
                  fgColor="#0d7377"
                  level="M"
                  className="print-qr-code"
                />
                <p className="print-qr-label">Scan for Website</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-6 mb-8 no-print">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Prayer Calendar
            </h1>
          </div>

          {/* Month Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-10 w-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2">
                <Select value={selectedMonth.toString()} onValueChange={handleMonthSelect}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={month} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear.toString()} onValueChange={handleYearSelect}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="h-10 w-10"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => data && downloadPdf(data, selectedMonth, selectedYear)}
                className="gap-2"
                disabled={isGenerating || isLoading || !data?.length}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isGenerating ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/10 ring-2 ring-primary" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent/20" />
              <span>Friday (Jumu'ah)</span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12 text-destructive no-print">
            Failed to load prayer times. Please try again later.
          </div>
        )}

        {/* Prayer Times Table */}
        <PrayerCalendarTable data={data || []} isLoading={isLoading} />


        {/* Print Footer - Only visible when printing */}
        <div className="hidden print:block print-footer">
          <div className="print-footer-content">
            <div className="print-footer-ornament"></div>
            <p className="print-footer-verse">
              يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ
            </p>
            <p className="print-footer-note">
              "O you who believe! Seek help through patience and prayer" - Quran 2:153
            </p>
            <div className="print-jummah-times">
              <span className="print-jummah-label">Jumu'ah 1st Jamaat: <strong>12:30</strong></span>
              <span className="print-jummah-divider">✦</span>
              <span className="print-jummah-label">Jumu'ah 2nd Jamaat: <strong>13:15</strong></span>
            </div>
            <p className="print-footer-maktab">Weekday Boys & Girls Maktab Classes Available</p>
            <p className="print-footer-website">www.masjidirshad.co.uk</p>
            <div className="print-decorative-bottom"></div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrayerCalendar;
