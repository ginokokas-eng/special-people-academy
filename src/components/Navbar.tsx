import { Button } from "@/components/ui/button";
import {
  FuturisticMobileMenu,
  MorphingMenuIcon,
} from "@/components/FuturisticMobileMenu";
import {
  User,
  LogOut,
  Settings,
  BookOpen,
  Award,
  ShoppingCart,
  Building2,
  HeartHandshake,
  ClipboardCheck,
  LifeBuoy,
  ArrowRight,
} from "@/components/icons";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRedirectSettings } from "@/hooks/useRedirectSettings";
import { useCart } from "@/hooks/useCart";
import { isNativeShell } from "@/lib/native";
import { NativeChrome } from "@/components/native/NativeChrome";
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
import { cn } from "@/lib/utils";

type DropdownItem = {
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const forOrganisationsLinks: DropdownItem[] = [
  { label: "Care providers", href: "/enterprise", description: "Compliance training for care homes, domiciliary and supported living", icon: Building2 },
  { label: "Talk to sales", href: "/contact?tab=sales", description: "Licences, seats and rollout for your team", icon: HeartHandshake },
];

const resourcesLinks: DropdownItem[] = [
  { label: "Help Centre", href: "/help-center", description: "How the academy works, step by step", icon: LifeBuoy },
  { label: "Contact", href: "/contact", description: "Get help or speak to our team", icon: ClipboardCheck },
];

export const Navbar = () => {
  // Native shell: the website navbar is replaced wholesale by native chrome
  // (collapsing header + bottom tab bar). Web/desktop is untouched.
  if (isNativeShell()) {
    return <NativeChrome />;
  }
  return <WebNavbar />;
};

const WebNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
          ? "bg-white/[.97] backdrop-blur-xl border-b border-[#E8E4F7] shadow-[0_2px_8px_-2px_rgba(20,10,60,0.06)]"
          : "bg-white/[.97] backdrop-blur-md border-b border-[#F0EDFA]"
      )}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex items-center justify-between transition-[height] duration-300",
            "h-[64px] lg:h-[72px]"
          )}
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 min-w-0 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_83%_58%)] focus-visible:ring-offset-2 rounded-md"
            aria-label={`${platformName} Home`}
          >
            <img
              src={logo}
              alt={platformName}
              width={36}
              height={36}
              className="h-9 w-9 object-contain flex-shrink-0 drop-shadow-[0_1px_2px_rgba(76,29,149,0.15)]"
            />
            <span
              className="min-w-0 font-heading font-bold leading-tight text-[hsl(259_72%_14%)] truncate"
              title={platformName}
            >
              <span className="block text-[15px] sm:text-base tracking-tight">Special People</span>
              <span className="block text-[9px] sm:text-[10px] font-bold tracking-[0.22em] text-[hsl(262_83%_58%)] mt-0.5">
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
                      "!bg-transparent hover:!bg-transparent focus:!bg-transparent focus:!text-[hsl(259_72%_14%)] focus-visible:!ring-2 focus-visible:!ring-[hsl(262_83%_58%/0.55)] focus-visible:!ring-offset-2 data-[state=open]:!bg-transparent data-[state=open]:!text-[hsl(262_83%_58%)] data-[active]:!bg-transparent [&>svg]:ml-1 [&>svg]:h-4 [&>svg]:w-4"
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
                      "!bg-transparent hover:!bg-transparent focus:!bg-transparent focus:!text-[hsl(259_72%_14%)] focus-visible:!ring-2 focus-visible:!ring-[hsl(262_83%_58%/0.55)] focus-visible:!ring-offset-2 data-[state=open]:!bg-transparent data-[state=open]:!text-[hsl(262_83%_58%)] data-[active]:!bg-transparent [&>svg]:ml-1 [&>svg]:h-4 [&>svg]:w-4"
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
                  onClick={() => navigate("/contact?tab=support")}
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
                  onClick={() => navigate("/contact?tab=sales")}
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

            {/* Hamburger - morphing futuristic icon */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "lg:hidden relative overflow-visible transition-colors duration-300",
                isMenuOpen
                  ? "text-[hsl(262_83%_58%)] hover:text-[hsl(262_83%_58%)] hover:bg-[hsl(262_83%_58%/0.08)]"
                  : "text-[hsl(259_72%_14%)] hover:text-[hsl(262_83%_58%)] hover:bg-[hsl(262_83%_58%/0.06)]"
              )}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="futuristic-mobile-menu"
            >
              <MorphingMenuIcon open={isMenuOpen} />
              {!isMenuOpen && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-[hsl(262_83%_58%/0.0)] hover:ring-[hsl(262_83%_58%/0.15)] transition-all"
                />
              )}
            </Button>
          </div>
        </div>
      </div>


      {/* Premium futuristic mobile menu */}
      <FuturisticMobileMenu
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        items={
          // Built from the same arrays the desktop dropdowns use, so the phone
          // menu is no longer a shortened hardcoded list.
          [
            { label: coursesHref === '/my-courses' ? 'My Courses' : 'All Courses', href: coursesHref },
            {
              label: 'For Organisations',
              href: '#',
              children: forOrganisationsLinks.map((l) => ({ label: l.label, href: l.href })),
            },
            {
              label: 'Resources',
              href: '#',
              children: resourcesLinks.map((l) => ({ label: l.label, href: l.href })),
            },
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
            ...(user
              ? [
                  { label: 'My Learning', href: '/my-learning' },
                  { label: 'Sign Out', href: '#', onClick: handleSignOut, primary: true },
                ]
              : [
                  { label: 'Sign In', href: '/auth' },
                  { label: 'Sign Up', href: '/auth?mode=signup', primary: true },
                ]),
          ]
        }
      />
    </header>
  );
};
