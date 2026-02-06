import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  hideFooter?: boolean;
  containerClassName?: string;
}

/**
 * Consistent page shell for all Training Academy pages.
 * - Beige background (#F6E5D4)
 * - Max content width ~1200px
 * - Section spacing: 48px between major sections
 */
export const PageShell = ({ 
  children, 
  className,
  hideFooter = false,
  containerClassName
}: PageShellProps) => {
  return (
    <div className={cn("min-h-screen flex flex-col bg-background", className)}>
      <Navbar />
      <main className={cn(
        "flex-1 w-full mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 lg:py-12",
        containerClassName
      )}>
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};
