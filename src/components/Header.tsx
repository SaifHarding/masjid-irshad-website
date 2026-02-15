import { Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { setManualThemeOverride } from "@/components/ThemeController";
import HeaderLiveBadge from "@/components/HeaderLiveBadge";
import logo from "@/assets/masjid-irshad-logo.png";

const Header = () => {
  const { theme, setTheme } = useTheme();
  const educationLinks = [
    { to: "/education", label: "All Programmes" },
    { to: "/maktab", label: "Maktab" },
    { to: "/alimiyyah", label: "Alimiyyah Programme" },
    { to: "/hifz", label: "Hifdh al-Qur'an" },
    { to: "https://app.masjidirshad.co.uk/portal", label: "Student Portal", external: true },
  ];

  const contactLinks = [
    { to: "/contact", label: "Contact Us" },
    { to: "/faq", label: "FAQ / Ask Imam" },
    { to: "/feedback", label: "Website Feedback" },
  ];

  const toggleFajrMode = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    setManualThemeOverride(newTheme);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
          <img src={logo} alt="Masjid Irshad Logo" className="h-10 md:h-12 w-auto" />
          <div className="text-base md:text-xl font-bold text-primary">Masjid Irshad</div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <HeaderLiveBadge />
          
          <Link
            to="/"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Home
          </Link>
          
          <Link
            to="/prayer-calendar"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Prayer Calendar
          </Link>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm font-medium text-foreground hover:text-primary transition-colors bg-transparent hover:bg-transparent data-[state=open]:bg-transparent focus:bg-transparent focus:outline-none focus-visible:outline-none px-2 cursor-pointer border-0 shadow-none">
                  <Link to="/education" className="hover:text-primary">
                    Education
                  </Link>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[200px] gap-1 p-2 bg-background border border-border">
                    {educationLinks.map((link) => (
                      <li key={link.to}>
                        <NavigationMenuLink asChild>
                          {'external' in link && link.external ? (
                            <a
                              href={link.to}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-sm font-medium"
                            >
                              {link.label}
                            </a>
                          ) : (
                            <Link
                              to={link.to}
                              className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-sm font-medium"
                            >
                              {link.label}
                            </Link>
                          )}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm font-medium text-foreground hover:text-primary transition-colors bg-transparent hover:bg-transparent data-[state=open]:bg-transparent focus:bg-transparent focus:outline-none focus-visible:outline-none px-2 cursor-pointer border-0 shadow-none">
                  <Link to="/contact" className="hover:text-primary">
                    Contact
                  </Link>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[180px] gap-1 p-2 bg-background border border-border">
                    {contactLinks.map((link) => (
                      <li key={link.to}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={link.to}
                            className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-sm font-medium"
                          >
                            {link.label}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div 
            className="relative flex items-center gap-1 px-1 py-1 rounded-full bg-muted/30 border border-border/50 transition-all duration-300 hover:border-primary/30 cursor-pointer"
            onClick={toggleFajrMode}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleFajrMode()}
          >
            <div className={`p-1.5 rounded-full transition-all duration-300 ${theme !== "dark" ? "bg-background shadow-md" : "opacity-50"}`}>
              <Sun className="h-3.5 w-3.5" />
            </div>
            <div className={`p-1.5 rounded-full transition-all duration-300 ${theme === "dark" ? "bg-background shadow-md" : "opacity-50"}`}>
              <Moon className="h-3.5 w-3.5" />
            </div>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          <HeaderLiveBadge />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={toggleFajrMode}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`p-1.5 rounded-full transition-all duration-300 ${theme !== "dark" ? "bg-background shadow-md" : "opacity-50"}`}>
                      <Sun className="h-4 w-4" />
                    </div>
                    <div className={`p-1.5 rounded-full transition-all duration-300 ${theme === "dark" ? "bg-background shadow-md" : "opacity-50"}`}>
                      <Moon className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <Link
                  to="/"
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                >
                  Home
                </Link>
                
                <Link
                  to="/prayer-calendar"
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                >
                  Prayer Calendar
                </Link>
                
                <div className="flex flex-col gap-2">
                  <Link to="/education" className="text-lg font-semibold text-foreground hover:text-primary transition-colors">Education</Link>
                  <div className="flex flex-col gap-2 ml-4">
                    {educationLinks.map((link) => (
                      'external' in link && link.external ? (
                        <a
                          key={link.to}
                          href={link.to}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          key={link.to}
                          to={link.to}
                          className="text-base font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                          {link.label}
                        </Link>
                      )
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link to="/contact" className="text-lg font-semibold text-foreground hover:text-primary transition-colors">Contact</Link>
                  <div className="flex flex-col gap-2 ml-4">
                    {contactLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="text-base font-medium text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
