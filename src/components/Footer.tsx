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
      { label: "Features", href: "/features" },
      { label: "Courses", href: "/courses" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
    ],
    Compliance: [
      { label: "Enterprise", href: "/enterprise" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Partners", href: "/partners" },
      { label: "Help Center", href: "/help-center" },
    ],
    Resources: [
      { label: "Blog", href: "/blog" },
      { label: "Webinars", href: "/webinars" },
      { label: "Help Center", href: "/help-center" },
    ],
    Company: [
      { label: "About Us", href: "/about" },
      ...(generalSettings.enableCareerApplications ? [{ label: "Careers", href: "/careers" }] : []),
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
    ],
  };

  const socialLinks = branding.socialLinks;
  const footerLeft = (branding.footerTextLeft || '© {year} Special People Training. All rights reserved.')
    .replace('{year}', new Date().getFullYear().toString());
  const footerRight = branding.footerTextRight || 'Made with ❤️ for every learner';

  return (
    <footer className="bg-[#0F0626] text-white relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(262_83%_58%/0.12)] blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(217_91%_60%/0.08)] blur-[140px]" />
      </div>

      <div className="relative section-container py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-10 mb-14">
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5">
              <img src={logo} alt={platformName} className="h-9 w-auto object-contain" />
              <span className="font-heading font-bold text-lg">{platformName}</span>
            </Link>
            {branding.platformTagline ? (
              <p className="text-white/65 text-sm leading-relaxed mb-7 max-w-xs">{branding.platformTagline}</p>
            ) : (
              <p className="text-white/65 text-sm leading-relaxed mb-7 max-w-xs">
                CPD-certified, inspection-ready training built with UK care providers.
              </p>
            )}
            <div className="flex gap-2">
              {socialLinks.linkedin && (
                <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {socialLinks.youtube && (
                <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors">
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {socialLinks.email && (
                <a href={`mailto:${socialLinks.email}`} aria-label="Email"
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors">
                  <Mail className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-[11px] uppercase tracking-[0.18em] text-white/55 mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-white/75 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-white/50">{footerLeft}</p>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>{footerRight}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
