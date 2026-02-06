import { Twitter, Linkedin, Youtube, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export const Footer = () => {
  const footerLinks = {
    Product: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
      { label: "Enterprise", href: "/enterprise" },
    ],
    Resources: [
      { label: "Blog", href: "/blog" },
      { label: "Help Center", href: "/help-center" },
      { label: "Webinars", href: "/webinars" },
      { label: "Case Studies", href: "/case-studies" },
    ],
    Company: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Partners", href: "/partners" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Cookie Policy", href: "/cookie-policy" },
    ],
  };

  return (
    <footer className="bg-foreground text-primary-foreground py-16 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <img src={logo} alt="Special People Academy" className="h-10 w-10 object-contain" />
              <span>Special People Academy</span>
            </Link>
            <p className="text-primary-foreground/60 text-sm mb-6 max-w-xs">
              Empowering special individuals to develop essential skills through personalized, inclusive training programs.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://x.com/YOUR_X_URL" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Twitter/X"
                className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a 
                href="https://linkedin.com/company/YOUR_LINKEDIN_URL" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a 
                href="https://youtube.com/@YOUR_YOUTUBE_URL" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a 
                href="mailto:academy@specialpeople.org.uk"
                aria-label="Email"
                className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">© 2026 Special People Academy. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm text-primary-foreground/50">
            <span>Made with ❤️ for every learner</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
