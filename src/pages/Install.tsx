import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Share, Plus, MoreVertical, Bell, Check, Smartphone, Monitor, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Platform = "ios" | "android" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [selectedTab, setSelectedTab] = useState<Platform>("ios");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if already installed as PWA
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (navigator as any).standalone 
      || document.referrer.includes("android-app://");
    
    if (isStandalone) {
      setIsInstalled(true);
    }
  }, []);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 md:py-12">
        {/* Back button */}
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground hover:text-foreground" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Install Masjid Irshad App
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get instant notifications when we go live and access prayer times even when offline. 
            No app store download required.
          </p>
        </div>

        {/* Already installed message */}
        {isInstalled && (
          <Card className="mb-8 border-green-500/30 bg-green-500/5">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">App Already Installed</h3>
                <p className="text-sm text-muted-foreground">
                  You've already installed the Masjid Irshad app. Open it from your home screen for the best experience.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick install button for supported browsers */}
        {deferredPrompt && !isInstalled && (
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">One-Click Install Available</h3>
                  <p className="text-sm text-muted-foreground">
                    Your browser supports quick installation
                  </p>
                </div>
              </div>
              <Button onClick={handleInstall} size="lg" className="gap-2 w-full sm:w-auto">
                <Download className="h-5 w-5" />
                Install Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Platform tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as Platform)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="ios" className="gap-2">
              <Apple className="h-4 w-4" />
              <span className="hidden sm:inline">iPhone/iPad</span>
              <span className="sm:hidden">iOS</span>
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-2">
              <Smartphone className="h-4 w-4" />
              <span>Android</span>
            </TabsTrigger>
            <TabsTrigger value="desktop" className="gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Computer</span>
              <span className="sm:hidden">PC</span>
            </TabsTrigger>
          </TabsList>

          {/* iOS Instructions */}
          <TabsContent value="ios">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="h-5 w-5" />
                  Install on iPhone or iPad
                </CardTitle>
                <CardDescription>
                  Follow these steps to add Masjid Irshad to your home screen using Safari
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    1
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Open in Safari</h4>
                    <p className="text-sm text-muted-foreground">
                      Make sure you're viewing this page in Safari (not Chrome or another browser). 
                      The install feature only works in Safari on iOS.
                    </p>
                    <div className="rounded-lg bg-muted/50 p-4 border border-border">
                      <p className="text-sm text-muted-foreground italic">
                        If you're in another app, tap the Safari icon or copy this URL: <strong>masjidirshad.co.uk/install</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    2
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Tap the Share Button</h4>
                    <p className="text-sm text-muted-foreground">
                      Find the Share button at the bottom of Safari (or top on iPad). It looks like a square with an arrow pointing up.
                    </p>
                    <div className="rounded-lg bg-muted/50 p-6 border border-border flex items-center justify-center">
                      <div className="flex items-center gap-3 text-primary">
                        <Share className="h-8 w-8" />
                        <span className="text-sm font-medium">Tap this icon</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    3
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Scroll and Find "Add to Home Screen"</h4>
                    <p className="text-sm text-muted-foreground">
                      Scroll down in the share menu until you see "Add to Home Screen" with a plus icon.
                    </p>
                    <div className="rounded-lg bg-muted/50 p-4 border border-border">
                      <div className="flex items-center gap-3 py-2 px-3 bg-background rounded-md">
                        <Plus className="h-5 w-5 text-primary" />
                        <span className="font-medium">Add to Home Screen</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    4
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Tap "Add" to Confirm</h4>
                    <p className="text-sm text-muted-foreground">
                      You can keep the default name "Masjid Irshad" or change it. Then tap "Add" in the top right corner.
                    </p>
                    <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          The app icon will appear on your home screen!
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enable Notifications */}
                <div className="mt-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-500" />
                    Enable Notifications
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    After installing, open the app from your home screen and tap "Get Notified" to receive alerts when we go live. 
                    Make sure to allow notifications when prompted.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Android Instructions */}
          <TabsContent value="android">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Install on Android
                </CardTitle>
                <CardDescription>
                  Follow these steps to add Masjid Irshad to your home screen using Chrome
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick install option */}
                {deferredPrompt && (
                  <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Your browser supports one-click installation:
                    </p>
                    <Button onClick={handleInstall} className="gap-2">
                      <Download className="h-4 w-4" />
                      Install Now
                    </Button>
                  </div>
                )}

                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    1
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Open in Chrome</h4>
                    <p className="text-sm text-muted-foreground">
                      Make sure you're viewing this page in Google Chrome for the best experience.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    2
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Tap the Menu Button</h4>
                    <p className="text-sm text-muted-foreground">
                      Tap the three dots (⋮) in the top right corner of Chrome to open the menu.
                    </p>
                    <div className="rounded-lg bg-muted/50 p-6 border border-border flex items-center justify-center">
                      <div className="flex items-center gap-3 text-primary">
                        <MoreVertical className="h-8 w-8" />
                        <span className="text-sm font-medium">Tap the menu icon</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    3
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Tap "Install app" or "Add to Home screen"</h4>
                    <p className="text-sm text-muted-foreground">
                      Look for "Install app" (newer Chrome) or "Add to Home screen" in the menu.
                    </p>
                    <div className="rounded-lg bg-muted/50 p-4 border border-border space-y-2">
                      <div className="flex items-center gap-3 py-2 px-3 bg-background rounded-md">
                        <Download className="h-5 w-5 text-primary" />
                        <span className="font-medium">Install app</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">or</p>
                      <div className="flex items-center gap-3 py-2 px-3 bg-background rounded-md">
                        <Plus className="h-5 w-5 text-primary" />
                        <span className="font-medium">Add to Home screen</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    4
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Confirm Installation</h4>
                    <p className="text-sm text-muted-foreground">
                      Tap "Install" on the confirmation dialog. The app will be added to your home screen.
                    </p>
                    <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          The app icon will appear on your home screen!
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enable Notifications */}
                <div className="mt-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-500" />
                    Enable Notifications
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    After installing, open the app and tap "Get Notified" to receive live broadcast alerts. 
                    Allow notifications when your phone asks for permission.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Desktop Instructions */}
          <TabsContent value="desktop">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Install on Computer
                </CardTitle>
                <CardDescription>
                  Follow these steps to install the app on Chrome, Edge, or other supported browsers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick install option */}
                {deferredPrompt && (
                  <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Your browser supports one-click installation:
                    </p>
                    <Button onClick={handleInstall} className="gap-2">
                      <Download className="h-4 w-4" />
                      Install Now
                    </Button>
                  </div>
                )}

                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    1
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Look for the Install Icon</h4>
                    <p className="text-sm text-muted-foreground">
                      In Chrome or Edge, look for an install icon in the address bar (right side). 
                      It might look like a computer with a download arrow, or a plus sign.
                    </p>
                    <div className="rounded-lg bg-muted/50 p-6 border border-border flex items-center justify-center">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded bg-background border border-border">
                          <span className="text-sm text-muted-foreground">masjidirshad.co.uk</span>
                          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    2
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Click "Install"</h4>
                    <p className="text-sm text-muted-foreground">
                      Click the install icon, then click "Install" in the popup that appears.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    3
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">App Opens in Its Own Window</h4>
                    <p className="text-sm text-muted-foreground">
                      The app will open in its own window, separate from your browser. 
                      You can find it in your Start menu (Windows) or Applications folder (Mac).
                    </p>
                    <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          The app is now installed on your computer!
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alternative method */}
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                  <h4 className="font-semibold text-foreground mb-2">Alternative Method</h4>
                  <p className="text-sm text-muted-foreground">
                    If you don't see the install icon, click the three-dot menu (⋮) in Chrome/Edge and look for 
                    "Install Masjid Irshad..." or "Apps → Install this site as an app".
                  </p>
                </div>

                {/* Enable Notifications */}
                <div className="mt-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-500" />
                    Enable Notifications
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    After installing, click "Get Notified" on the home page to receive desktop notifications 
                    when we go live. Allow notifications when your browser asks for permission.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Benefits section */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Instant Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Get notified immediately when Masjid Irshad goes live
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No App Store</h3>
              <p className="text-sm text-muted-foreground">
                Install directly from your browser — no downloads required
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Works Offline</h3>
              <p className="text-sm text-muted-foreground">
                Access prayer times even without an internet connection
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Install;