import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Settings,
  BookOpen,
  Award,
  ShoppingCart,
  Building2,
  Home,
  HeartHandshake,
  Stethoscope,
  Landmark,
  Users,
  FileText,
  ClipboardCheck,
  Newspaper,
  LifeBuoy,
  Video,
  Download,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRedirectSettings } from "@/hooks/useRedirectSettings";
import { useCart } from "@/hooks/useCart";
import { useBranding } from "@/hooks/useBrandingSettings";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";
import defaultLogo from "@/assets/logo.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type DropdownItem = {
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const forOrganisationsLinks: DropdownItem[] = [
  { label: "Care Homes", href: "/enterprise", description: "Compliance training for residential care", icon: Building2 },
  { label: "Domiciliary Care", href: "/enterprise", description: "Training for community care providers", icon: Home },
  { label: "Supported Living", href: "/enterprise", description: "Person-centred learning programmes", icon: HeartHandshake },
  { label: "NHS / Organisations", href: "/enterprise", description: "Tailored programmes for NHS trusts", icon: Stethoscope },
  { label: "Local Authorities", href: "/partners", description: "Workforce development partnerships", icon: Landmark },
  { label: "Multi-site Teams", href: "/case-studies", description: "Scale training across locations", icon: Users },
];

const resourcesLinks: DropdownItem[] = [
  { label: "Case Studies", href: "/case-studies", description: "Real outcomes from our partners", icon: FileText },
  { label: "CQC Inspection Guide", href: "/help-center", description: "Prepare with confidence", icon: ClipboardCheck },
  { label: "Blog & Insights", href: "/blog", description: "Industry updates and best practice", icon: Newspaper },
  { label: "Help Centre", href: "/help-center", description: "FAQs and support articles", icon: LifeBuoy },
  { label: "Webinars", href: "/webinars", description: "Free live and on-demand sessions", icon: Video },
  { label: "Downloads / Resources", href: "/help-center", description: "Guides, templates and toolkits", icon: Download },
];

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { itemCount: cartItemCount } = useCart();
  const branding = useBranding();
  const generalSettings = useGeneralSettings();
  const logo = branding.logoMarkUrl || defaultLogo;
  const platformName = branding.platformName || "Special People Training";
  const coursesHref = user
    ? generalSettings.learnerCoursesNavDestination === "catalog"
      ? "/courses"
      : "/my-courses"
    : "/courses";

  const { logoutRedirectUrl } = useRedirectSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) console.error("Sign out failed:", error);
    navigate(logoutRedirectUrl);
  };

  const navLinkBase =
    "group relative inline-flex items-center px-3 py-2 text-[15px] font-medium text-[hsl(259_72%_14%)] transition-colors duration-200 hover:text-[hsl(262_83%_58%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_83%_58%)] focus-visible:ring-offset-2 rounded-md";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 animate-nav-in",
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-[#E8E4F7] shadow-[0_1px_2px_rgba(20,10,60,0.04)]"
          : "bg-white/70 backdrop-blur-[2px] border-b border-transparent"
      )}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex items-center justify-between transition-[height] duration-300",
            "h-[60px] lg:h-[68px]"
          )}
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 min-w-0 pr-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_83%_58%)] focus-visible:ring-offset-2 rounded-md"
            aria-label={`${platformName} Home`}
          >
            <img
              src={logo}
              alt={platformName}
              className="h-9 w-auto object-contain flex-shrink-0"
            />
            <span
              className="font-heading font-bold leading-tight text-[hsl(259_72%_14%)] truncate"
              title={platformName}
            >
              <span className="block text-sm sm:text-base">Special People</span>
              <span className="block text-[9px] sm:text-[10px] font-bold tracking-[0.22em] text-[hsl(189_94%_30%)] mt-0.5">
                TRAINING ACADEMY
              </span>
            </span>
          </Link>

          {/* Desktop Nav - Center */}
          <div className="hidden lg:flex items-center justify-center flex-1">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navLinkBase}>
                    <Link to={coursesHref}>
                      <span className="relative">
                        Courses
                        <span className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 bg-[hsl(262_83%_58%)] transition-transform duration-300 ease-out group-hover:scale-x-100" />
                      </span>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      navLinkBase,
                      "bg-transparent hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-[hsl(262_83%_58%)] [&>svg]:ml-1 [&>svg]:h-4 [&>svg]:w-4"
                    )}
                  >
                    <span className="relative">
                      For Organisations
                      <span className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 bg-[hsl(262_83%_58%)] transition-transform duration-300 ease-out group-hover:scale-x-100 group-data-[state=open]:scale-x-100" />
                    </span>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="p-3 w-[560px] rounded-2xl border border-[#E8E4F7] bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(76,29,149,0.25)]">
                      <ul className="grid grid-cols-2 gap-1">
                        {forOrganisationsLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <li key={link.label}>
                              <NavigationMenuLink asChild>
                                <Link
                                  to={link.href}
                                  className="flex items-start gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-[hsl(262_83%_58%/0.06)] focus-visible:bg-[hsl(262_83%_58%/0.08)]"
                                >
                                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(262_83%_58%/0.1)] text-[hsl(262_83%_58%)]">
                                    <Icon className="h-4.5 w-4.5" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-[hsl(259_72%_14%)]">
                                      {link.label}
                                    </span>
                                    <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                                      {link.description}
                                    </span>
                                  </span>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      navLinkBase,
                      "bg-transparent hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-[hsl(262_83%_58%)] [&>svg]:ml-1 [&>svg]:h-4 [&>svg]:w-4"
                    )}
                  >
                    <span className="relative">
                      Resources
                      <span className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 bg-[hsl(262_83%_58%)] transition-transform duration-300 ease-out group-hover:scale-x-100 group-data-[state=open]:scale-x-100" />
                    </span>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="p-3 w-[560px] rounded-2xl border border-[#E8E4F7] bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(76,29,149,0.25)]">
                      <ul className="grid grid-cols-2 gap-1">
                        {resourcesLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <li key={link.label}>
                              <NavigationMenuLink asChild>
                                <Link
                                  to={link.href}
                                  className="flex items-start gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-[hsl(262_83%_58%/0.06)] focus-visible:bg-[hsl(262_83%_58%/0.08)]"
                                >
                                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(262_83%_58%/0.1)] text-[hsl(262_83%_58%)]">
                                    <Icon className="h-4.5 w-4.5" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-[hsl(259_72%_14%)]">
                                      {link.label}
                                    </span>
                                    <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                                      {link.description}
                                    </span>
                                  </span>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navLinkBase}>
                    <Link to="/about">
                      <span className="relative">
                        About
                        <span className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 bg-[hsl(262_83%_58%)] transition-transform duration-300 ease-out group-hover:scale-x-100" />
                      </span>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/cart")}
              className="relative text-[hsl(259_72%_14%)] hover:text-[hsl(262_83%_58%)] hover:bg-[hsl(262_83%_58%/0.06)]"
              aria-label={`Shopping cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ""}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-[hsl(262_83%_58%)] text-white text-[11px] rounded-full flex items-center justify-center font-semibold ring-2 ring-white">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </Button>

            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hidden lg:flex"
                      aria-label="User menu"
                    >
                      <div className="h-8 w-8 rounded-full bg-[hsl(262_83%_58%/0.12)] flex items-center justify-center">
                        <User className="h-4 w-4 text-[hsl(262_83%_58%)]" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-xl border-[#E8E4F7] bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(76,29,149,0.25)]"
                  >
                    <DropdownMenuItem asChild>
                      <Link to="/my-learning" className="flex items-center gap-2 cursor-pointer">
                        <BookOpen className="h-4 w-4" /> My Learning
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/certificates" className="flex items-center gap-2 cursor-pointer">
                        <Award className="h-4 w-4" /> Certifications
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  onClick={() => navigate("/contact")}
                  className="hidden lg:inline-flex group relative overflow-hidden items-center justify-center rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[14px] font-semibold px-5 py-2.5 transition-colors duration-200 shadow-[0_6px_18px_-6px_rgba(124,58,237,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2"
                >
                  <span className="relative z-10">Contact Support</span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden lg:inline-flex items-center text-[15px] font-medium text-[hsl(259_72%_14%)] hover:text-[hsl(262_83%_58%)] transition-colors px-3 py-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_83%_58%)] focus-visible:ring-offset-2"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => navigate("/contact")}
                  className="hidden lg:inline-flex group relative overflow-hidden items-center justify-center gap-1.5 rounded-full bg-[#0F0B30] hover:bg-[#1A1448] text-white text-[14px] font-semibold px-5 py-2.5 transition-colors duration-200 shadow-[0_6px_18px_-6px_rgba(15,11,48,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0B30] focus-visible:ring-offset-2"
                >
                  <span className="relative z-10">Contact Sales</span>
                  <ArrowRight className="relative z-10 h-4 w-4" />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  />
                </button>
              </>
            )}

            {/* Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[hsl(259_72%_14%)]"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-over */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-[60] transition-opacity duration-300",
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!isMenuOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[hsl(259_72%_14%/0.4)] backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
        {/* Panel */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 w-full sm:max-w-md flex flex-col text-white shadow-2xl transition-transform duration-300 ease-out",
            "bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#7C3AED]",
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <Link
              to="/"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2.5 min-w-0"
            >
              <img src={logo} alt={platformName} className="h-8 w-auto bg-white/95 rounded-md p-1" />
              <span className="font-semibold truncate">{platformName}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-2">
            <Link
              to={coursesHref}
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3.5 text-base font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Courses
            </Link>

            <Collapsible open={orgOpen} onOpenChange={setOrgOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3.5 text-base font-semibold rounded-xl hover:bg-white/10 transition-colors">
                For Organisations
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform duration-200", orgOpen && "rotate-180")}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-2 mt-1 space-y-1">
                {forOrganisationsLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-white/85 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Icon className="h-4 w-4 text-white/70" />
                      {link.label}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={resourcesOpen} onOpenChange={setResourcesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3.5 text-base font-semibold rounded-xl hover:bg-white/10 transition-colors">
                Resources
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    resourcesOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-2 mt-1 space-y-1">
                {resourcesLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-white/85 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Icon className="h-4 w-4 text-white/70" />
                      {link.label}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>

            <Link
              to="/about"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3.5 text-base font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              About
            </Link>

            <Link
              to="/cart"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3.5 text-base font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              Basket
              {cartItemCount > 0 && (
                <span className="ml-auto h-6 min-w-6 px-1.5 bg-white text-[#7C3AED] text-xs rounded-full flex items-center justify-center font-bold">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </Link>

            {user && (
              <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
                <Link
                  to="/my-learning"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg hover:bg-white/10"
                >
                  <BookOpen className="h-4 w-4" /> My Learning
                </Link>
                <Link
                  to="/certificates"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg hover:bg-white/10"
                >
                  <Award className="h-4 w-4" /> Certifications
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg hover:bg-white/10"
                >
                  <User className="h-4 w-4" /> Profile
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg hover:bg-white/10"
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
              </div>
            )}
          </div>

          {/* Sticky bottom actions */}
          <div className="px-5 py-5 border-t border-white/10 bg-black/10 backdrop-blur-sm space-y-3">
            {user ? (
              <>
                <button
                  onClick={() => {
                    navigate("/contact");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center rounded-full bg-white text-[#6D28D9] text-base font-semibold px-5 py-3 hover:bg-white/95 transition-colors"
                >
                  Contact Support
                </button>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-white/30 text-white text-base font-medium px-5 py-3 hover:bg-white/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate("/auth");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center rounded-full border border-white/30 text-white text-base font-medium px-5 py-3 hover:bg-white/10 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    navigate("/contact");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center rounded-full bg-white text-[#6D28D9] text-base font-semibold px-5 py-3 hover:bg-white/95 transition-colors"
                >
                  Contact Sales
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
