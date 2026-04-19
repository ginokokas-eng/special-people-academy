import { Linkedin, Youtube, Mail, Facebook, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import defaultLogo from "@/assets/logo.svg";
import { useBranding } from "@/hooks/useBrandingSettings";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";

export const Footer = () => {
  const branding = useBranding();
  const generalSettings = useGeneralSettings();
  const logo = branding.logoMarkUrl || defaultLogo;
  const platformName = branding.platformName || 'Special People Training';

  const footerLinks = {
    Platform: [
      { label: "Course catalog", href: "/courses" },
      { label: "For care homes", href: "/enterprise" },
      { label: "For NHS trusts", href: "/enterprise" },
      { label: "For domiciliary", href: "/enterprise" },
      { label: "Integrations", href: "/integrations", badge: "NEW" as const },
    ],
    Compliance: [
      { label: "CQC audit packs", href: "/features" },
      { label: "Care Inspectorate", href: "/features" },
      { label: "CIW Wales", href: "/features" },
      { label: "Skills for Care", href: "/features" },
      { label: "CPD certification", href: "/features" },
    ],
    Resources: [
      { label: "Case studies", href: "/case-studies" },
      { label: "CQC inspection guide", href: "/blog" },
      { label: "Blog & insights", href: "/blog" },
      { label: "Help centre", href: "/help-center" },
      { label: "Webinars", href: "/webinars" },
    ],
    Company: [
      { label: "About us", href: "/about" },
      ...(generalSettings.enableCareerApplications
        ? [{ label: "Careers", href: "/careers", badge: "5" as const }]
        : []),
      { label: "Press", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Partner programme", href: "/partners" },
    ],
  };

  const socialLinks = branding.socialLinks;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white text-[hsl(259_72%_14%)] border-t border-[#EEEAF8]">
      <div className="section-container py-14 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-10 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5">
              <img src={logo} alt={platformName} className="h-9 w-auto object-contain" />
              <span className="font-heading font-bold text-lg leading-tight">
                <span className="block">Special</span>
                <span className="block">People</span>
                <span className="block text-[11px] font-bold tracking-[0.22em] text-[hsl(189_94%_30%)] mt-0.5">
                  TRAINING<br />ACADEMY
                </span>
              </span>
            </Link>
            <p className="text-[hsl(259_20%_38%)] text-sm leading-relaxed mb-6 max-w-[15rem]">
              CPD-certified training for the UK care sector. Built with clinicians, registered
              managers and the carers who show up every day.
            </p>
            <div className="flex gap-2">
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-[#F4F1FB] hover:bg-[#E8E2F5] text-[hsl(259_72%_14%)] transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-[#F4F1FB] hover:bg-[#E8E2F5] text-[hsl(259_72%_14%)] transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-[#F4F1FB] hover:bg-[#E8E2F5] text-[hsl(259_72%_14%)] transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-[#F4F1FB] hover:bg-[#E8E2F5] text-[hsl(259_72%_14%)] transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {socialLinks.email && (
                <a
                  href={`mailto:${socialLinks.email}`}
                  aria-label="Email"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-[#F4F1FB] hover:bg-[#E8E2F5] text-[hsl(259_72%_14%)] transition-colors"
                >
                  <Mail className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-heading font-bold text-[15px] text-[hsl(259_72%_14%)] mb-5">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="inline-flex items-center gap-2 text-sm text-[hsl(259_20%_38%)] hover:text-[hsl(259_72%_14%)] transition-colors"
                    >
                      {link.label}
                      {"badge" in link && link.badge && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F59E0B] text-[#1A1448] text-[10px] font-bold tracking-wide">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider + bottom bar */}
        <div className="pt-8 border-t border-[#EEEAF8] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-xs text-[hsl(259_20%_45%)]">
            © {year} Special People Training Academy Ltd. Registered in England & Wales. Company
            No. 12345678.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[hsl(259_20%_45%)]">
            <Link to="/privacy-policy" className="hover:text-[hsl(259_72%_14%)] transition-colors">
              Privacy
            </Link>
            <Link to="/terms-of-service" className="hover:text-[hsl(259_72%_14%)] transition-colors">
              Terms
            </Link>
            <Link to="/cookie-policy" className="hover:text-[hsl(259_72%_14%)] transition-colors">
              Cookie preferences
            </Link>
            <Link to="/help-center" className="hover:text-[hsl(259_72%_14%)] transition-colors">
              Accessibility
            </Link>
            <Link to="/about" className="hover:text-[hsl(259_72%_14%)] transition-colors">
              Modern slavery
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
