import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet-async";

interface PublicLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * PublicLayout - Standard layout for all public-facing pages
 * Ensures the Navbar is always at the top of the page, followed by content, then Footer.
 * 
 * Use this for pages like Cart, CheckoutSuccess, PaymentCanceled, etc.
 * For marketing pages with SEO needs, use MarketingLayout instead.
 */
export const PublicLayout = ({ children, title, description }: PublicLayoutProps) => {
  return (
    <>
      {(title || description) && (
        <Helmet>
          {title && <title>{title} | Special People Academy</title>}
          {description && <meta name="description" content={description} />}
        </Helmet>
      )}
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
};
