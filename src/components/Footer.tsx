import { Twitter, Linkedin, Youtube, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

export const Footer = () => {
  const footerLinks = {
    Product: ["Features", "Pricing", "Integrations", "Enterprise"],
    Resources: ["Blog", "Help Center", "Webinars", "Case Studies"],
    Company: ["About Us", "Careers", "Contact", "Partners"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  };

  return (
    <footer className="bg-foreground text-primary-foreground py-16 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <img src={logo} alt="Special People Academy" className="h-10 w-10 object-contain" />
              <span>Special People Academy</span>
            </a>
            <p className="text-primary-foreground/60 text-sm mb-6 max-w-xs">
              Empowering special individuals to develop essential skills through personalized, inclusive training programs.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Youtube, Mail].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © 2026 Special People Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-primary-foreground/50">
            <span>Made with ❤️ for every learner</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
