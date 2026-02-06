import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Brief delay to allow webhook to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="pb-4">
            {loading ? (
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            ) : (
              <CheckCircle className="h-16 w-16 text-accent mx-auto mb-4" />
            )}
            <CardTitle className="text-2xl">
              {loading ? "Processing your payment..." : "Payment Successful!"}
            </CardTitle>
            <CardDescription className="text-base">
              {loading 
                ? "Please wait while we confirm your subscription." 
                : "Thank you for subscribing. Your account has been activated."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && (
              <>
                <p className="text-sm text-muted-foreground">
                  You now have full access to all courses and features included in your plan.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link to="/courses">
                      Start Learning
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
