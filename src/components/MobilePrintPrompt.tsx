import { Button } from "@/components/ui/button";

type MobilePrintPromptProps = {
  open: boolean;
  onPrint: () => void;
  onClose: () => void;
};

// Detect if running as installed PWA (standalone mode)
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// Detect iOS Safari (not PWA)
function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  return isIOS && isSafari && !isStandalone();
}

export default function MobilePrintPrompt({ open, onPrint, onClose }: MobilePrintPromptProps) {
  if (!open) return null;

  const showPrintButton = !isIOSSafari(); // Hide button in Safari website

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Print Prayer Calendar"
        className="relative w-full max-w-sm rounded-lg border bg-card p-5 shadow-lg"
      >
        <h2 className="text-base font-semibold text-foreground">Print / Save PDF</h2>
        
        {showPrintButton ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap below to open the print dialog.
            </p>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={onPrint}>
                Open print dialog
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Safari doesn't support direct printing. Use the Share menu instead:
            </p>
            <ol className="mt-3 text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Tap the <strong>Share</strong> button (square with arrow)</li>
              <li>Scroll down and tap <strong>Print</strong></li>
              <li>Pinch out on the preview to expand it</li>
              <li>Tap <strong>Share</strong> again → <strong>Save to Files</strong></li>
            </ol>
            <div className="mt-4">
              <Button variant="outline" onClick={onClose} className="w-full">
                Got it
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
