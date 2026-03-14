import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet-async";

interface MarketingLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export const MarketingLayout = ({ children, title, description }: MarketingLayoutProps) => {
  return (
    <>
      <Helmet>
        <title>{title} | Special People Training</title>
        <meta name="description" content={description} />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
};
