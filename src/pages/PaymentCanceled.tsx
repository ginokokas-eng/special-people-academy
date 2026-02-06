import { Link } from "react-router-dom";
import { XCircle, ArrowLeft, HelpCircle } from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentCanceled() {
  return (
    <PublicLayout title="Payment Canceled" description="Your payment was not completed">
      <div className="container py-12 flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="pb-4">
            <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-2xl">Payment Canceled</CardTitle>
            <CardDescription className="text-base">
              Your payment was not completed. No charges have been made.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you experienced any issues during checkout, our support team is here to help.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/pricing">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Pricing
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
