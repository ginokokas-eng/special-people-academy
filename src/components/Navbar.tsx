import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, User, LogOut, Settings, BookOpen, Award, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import logo from "@/assets/logo.png";
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

const forOrganisationsLinks = [
  { label: "Enterprise", href: "/enterprise", description: "Tailored solutions for large organisations" },
  { label: "Partners", href: "/partners", description: "Join our partner network" },
  { label: "Case Studies", href: "/case-studies", description: "Success stories from our clients" },
];

const resourcesLinks = [
  { label: "Blog", href: "/blog", description: "Insights and industry updates" },
  { label: "Help Center", href: "/help-center", description: "FAQs and support articles" },
  { label: "Webinars", href: "/webinars", description: "Free educational sessions" },
];

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { itemCount: cartItemCount } = useCart();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-neutral-grey/20 shadow-sm">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">
          {/* Logo - Left */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
            <img src={logo} alt="Special People Academy" className="h-9 w-9 object-contain" />
            <span className="text-foreground hidden sm:inline">Special People Academy</span>
          </Link>

          {/* Desktop Navigation - Center */}
          <div className="hidden lg:flex items-center justify-center flex-1">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {/* Courses */}
                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                  >
                    <Link to="/courses">Courses</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* For Organisations Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">
                    For Organisations
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2">
                      {forOrganisationsLinks.map((link) => (
                        <li key={link.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={link.href}
                              className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">{link.label}</div>
                              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground mt-1">
                                {link.description}
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Resources Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">
                    Resources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2">
                      {resourcesLinks.map((link) => (
                        <li key={link.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={link.href}
                              className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">{link.label}</div>
                              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground mt-1">
                                {link.description}
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Basket/Cart Icon - Always visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/cart')}
              className="relative text-foreground hover:bg-secondary"
              aria-label={`Shopping cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent-peach text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Button>

            {user ? (
              <>
                {/* Logged-in: User Menu Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="rounded-full hidden lg:flex"
                      aria-label="User menu"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/my-learning" className="flex items-center gap-2 cursor-pointer">
                        <BookOpen className="h-4 w-4" />
                        My Learning
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/certificates" className="flex items-center gap-2 cursor-pointer">
                        <Award className="h-4 w-4" />
                        Certifications
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Contact Support for logged-in users */}
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate('/contact')}
                  className="hidden lg:flex"
                >
                  Contact Support
                </Button>
              </>
            ) : (
              <>
                {/* Logged-out: Sign In + Contact Sales */}
                <Link
                  to="/auth"
                  className="hidden lg:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate('/contact')}
                  className="hidden lg:flex"
                >
                  Contact Sales
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-1">
              {/* Courses */}
              <Link
                to="/courses"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                Courses
              </Link>

              {/* For Organisations Accordion */}
              <Collapsible open={orgOpen} onOpenChange={setOrgOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors">
                  For Organisations
                  <ChevronDown className={cn("h-4 w-4 transition-transform", orgOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {forOrganisationsLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Resources Accordion */}
              <Collapsible open={resourcesOpen} onOpenChange={setResourcesOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors">
                  Resources
                  <ChevronDown className={cn("h-4 w-4 transition-transform", resourcesOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {resourcesLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Basket / Cart */}
              <Link
                to="/cart"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                Basket
                {cartItemCount > 0 && (
                  <span className="ml-auto h-5 w-5 bg-accent-peach text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </Link>

              {/* Mobile Auth Section */}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2 px-4">
                {user ? (
                  <>
                    <Link
                      to="/my-learning"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm font-medium text-foreground"
                    >
                      <BookOpen className="h-4 w-4" />
                      My Learning
                    </Link>
                    <Link
                      to="/certificates"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm font-medium text-foreground"
                    >
                      <Award className="h-4 w-4" />
                      Certifications
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm font-medium text-foreground"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm font-medium text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="mt-2"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        navigate('/contact');
                        setIsMenuOpen(false);
                      }}
                      className="mt-2"
                    >
                      Contact Support
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigate('/auth');
                        setIsMenuOpen(false);
                      }}
                    >
                      Sign In
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        navigate('/contact');
                        setIsMenuOpen(false);
                      }}
                    >
                      Contact Sales
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
