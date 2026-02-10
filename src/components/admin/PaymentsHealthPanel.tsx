import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  CreditCard,
  Webhook,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface WebhookLog {
  id: string;
  event_id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

interface PaymentSummary {
  latestSuccessfulPayment: string | null;
  latestWebhookReceived: string | null;
  totalPayments24h: number;
  failedPayments24h: number;
}

export function PaymentsHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    latestSuccessfulPayment: null,
    latestWebhookReceived: null,
    totalPayments24h: 0,
    failedPayments24h: 0,
  });

  const fetchData = async () => {
    try {
      // Fetch recent webhook logs
      const { data: logs } = await supabase
        .from("stripe_webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (logs) {
        setWebhookLogs(logs as WebhookLog[]);
        
        // Calculate summary from logs
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const recentLogs = logs.filter(l => new Date(l.created_at) > oneDayAgo);
        const failedLogs = recentLogs.filter(l => l.status === "failed");
        const successfulPayment = logs.find(l => 
          l.event_type === "checkout.session.completed" && l.status === "processed"
        );

        setSummary({
          latestSuccessfulPayment: successfulPayment?.created_at || null,
          latestWebhookReceived: logs[0]?.created_at || null,
          totalPayments24h: recentLogs.filter(l => 
            l.event_type.includes("checkout") || l.event_type.includes("payment")
          ).length,
          failedPayments24h: failedLogs.length,
        });
      }
    } catch (error) {
      console.error("Error fetching payments health data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Processed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "received":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHealthStatus = () => {
    if (summary.failedPayments24h > 0) {
      return { status: "warning", color: "text-warning", icon: AlertCircle };
    }
    if (summary.latestWebhookReceived) {
      return { status: "healthy", color: "text-success", icon: CheckCircle2 };
    }
    return { status: "unknown", color: "text-muted-foreground", icon: AlertCircle };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payments Health
            <HealthIcon className={`h-5 w-5 ${health.color}`} />
          </CardTitle>
          <CardDescription>
            Monitor Stripe webhook events and payment status
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Last Successful Payment</p>
            <p className="text-sm font-medium">
              {summary.latestSuccessfulPayment 
                ? formatDistanceToNow(new Date(summary.latestSuccessfulPayment), { addSuffix: true })
                : "No payments yet"}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Last Webhook</p>
            <p className="text-sm font-medium">
              {summary.latestWebhookReceived 
                ? formatDistanceToNow(new Date(summary.latestWebhookReceived), { addSuffix: true })
                : "No webhooks yet"}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Payments (24h)</p>
            <p className="text-sm font-medium">{summary.totalPayments24h}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Failed (24h)</p>
            <p className={`text-sm font-medium ${summary.failedPayments24h > 0 ? "text-red-500" : ""}`}>
              {summary.failedPayments24h}
            </p>
          </div>
        </div>

        {/* Webhook Logs */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Recent Webhook Events
          </h4>
          <ScrollArea className="h-64 border rounded-lg">
            {webhookLogs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No webhook events received yet</p>
                <p className="text-xs mt-1">Events will appear here after your first payment</p>
              </div>
            ) : (
              <div className="divide-y">
                {webhookLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                        {log.event_type}
                      </code>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(log.created_at), "MMM d, HH:mm:ss")}</span>
                      <span className="font-mono">{log.event_id.slice(0, 20)}...</span>
                    </div>
                    {log.error_message && (
                      <p className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {log.error_message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Webhook Setup Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
          <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">Webhook Endpoint</p>
          <code className="text-xs bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded break-all">
            https://qyroautvyzfsgtgwjcur.supabase.co/functions/v1/stripe-webhook
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
