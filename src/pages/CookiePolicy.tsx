import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Cookie, Settings, BarChart3, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";

const cookieTypes = [
  {
    icon: Cookie,
    name: "Essential Cookies",
    required: true,
    description: "These cookies are strictly necessary for the Platform to function and cannot be disabled. They enable core functionality such as security, account authentication, and session management.",
    examples: [
      { name: "session_id", purpose: "Maintains your login session", duration: "Session" },
      { name: "csrf_token", purpose: "Protects against cross-site request forgery", duration: "Session" },
      { name: "cookie_consent", purpose: "Remembers your cookie preferences", duration: "1 year" }
    ]
  },
  {
    icon: Settings,
    name: "Functional Cookies",
    required: false,
    description: "These cookies remember your preferences and settings to provide a more personalized experience. Disabling them may affect some Platform features.",
    examples: [
      { name: "language", purpose: "Remembers your language preference", duration: "1 year" },
      { name: "theme", purpose: "Remembers your display preferences (e.g., dark mode)", duration: "1 year" },
      { name: "accessibility", purpose: "Stores accessibility settings", duration: "1 year" }
    ]
  },
  {
    icon: BarChart3,
    name: "Analytics Cookies",
    required: false,
    description: "These cookies help us understand how visitors interact with the Platform by collecting anonymized information. This data helps us improve our services.",
    examples: [
      { name: "[Analytics Provider]", purpose: "Tracks page views and user journeys", duration: "2 years" },
      { name: "[Performance Monitoring]", purpose: "Monitors Platform performance", duration: "30 days" }
    ]
  },
  {
    icon: Megaphone,
    name: "Marketing Cookies",
    required: false,
    description: "These cookies are used to deliver relevant advertisements and track campaign effectiveness. We currently do not use marketing cookies, but this may change in the future.",
    examples: [],
    notUsed: true
  }
];

const thirdPartyCookies = [
  {
    provider: "[Analytics Provider, e.g., Google Analytics]",
    purpose: "Website analytics and usage tracking",
    privacyLink: "[Link to provider's privacy policy]"
  },
  {
    provider: "[Hosting Provider, e.g., Supabase]",
    purpose: "Platform hosting and authentication",
    privacyLink: "[Link to provider's privacy policy]"
  },
  {
    provider: "[Payment Processor, e.g., Stripe]",
    purpose: "Payment processing and fraud prevention",
    privacyLink: "[Link to provider's privacy policy]"
  },
  {
    provider: "[Error Tracking, e.g., Sentry]",
    purpose: "Error monitoring and debugging",
    privacyLink: "[Link to provider's privacy policy]"
  }
];

export default function CookiePolicy() {
  return (
    <MarketingLayout 
      title="Cookie Policy" 
      description="Learn how Special People Training uses cookies and similar technologies and how you can manage preferences."
    >
      <div className="py-16 md:py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          {/* Legal Disclaimer */}
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Disclaimer:</strong> This Cookie Policy template is provided for informational purposes and should be reviewed by legal counsel before use.
              </p>
            </CardContent>
          </Card>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Cookie Policy</h1>
            
            <div className="text-muted-foreground space-y-1 mb-8 not-prose">
              <p><strong className="text-foreground">Effective Date:</strong> [Effective Date]</p>
              <p><strong className="text-foreground">Last Updated:</strong> [Last Updated Date]</p>
            </div>

            <p>
              This Cookie Policy explains how <strong>[Company Legal Name]</strong> ("we," "us," or "our") uses cookies and similar tracking technologies when you visit or use Special People Training (the "Platform"). It also explains your choices regarding these technologies.
            </p>
            <p>
              This policy should be read alongside our{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>, which provides additional information about how we collect and use personal data.
            </p>

            {/* 1. What Cookies Are */}
            <h2>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners useful information.
            </p>
            <p>
              Cookies can be "first-party" (set by the website you're visiting) or "third-party" (set by other companies whose services appear on the website). They can also be "session" cookies (deleted when you close your browser) or "persistent" cookies (remain on your device for a set period or until you delete them).
            </p>
            <p>
              In addition to cookies, we may use similar technologies such as:
            </p>
            <ul>
              <li><strong>Web beacons:</strong> Small graphics that track whether you've opened an email or visited a page</li>
              <li><strong>Local storage:</strong> Data stored in your browser to remember preferences</li>
              <li><strong>Session storage:</strong> Temporary data cleared when you close your browser</li>
            </ul>

            {/* 2. Types of Cookies */}
            <h2>2. Types of Cookies We Use</h2>
            <p>
              We use the following categories of cookies on the Platform:
            </p>
          </div>

          {/* Cookie Types Cards */}
          <div className="space-y-6 my-8">
            {cookieTypes.map((type, index) => (
              <Card key={index} className={type.notUsed ? "opacity-70" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <type.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{type.name}</h3>
                        {type.required && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                            Required
                          </span>
                        )}
                        {type.notUsed && (
                          <span className="text-xs px-2 py-0.5 bg-accent/20 rounded-full text-accent">
                            Not Currently Used
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{type.description}</p>
                      
                      {type.examples.length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs font-medium text-foreground mb-2">Examples:</p>
                          <div className="space-y-2">
                            {type.examples.map((example, i) => (
                              <div key={i} className="text-xs text-muted-foreground flex justify-between">
                                <span><code className="bg-background px-1 rounded">{example.name}</code> — {example.purpose}</span>
                                <span className="text-muted-foreground/70">{example.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {/* 3. How We Use Cookies */}
            <h2>3. How We Use Cookies</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li><strong>Authenticate users:</strong> Keep you logged in and maintain your session security</li>
              <li><strong>Remember preferences:</strong> Store your display settings, language, and accessibility options</li>
              <li><strong>Analyze usage:</strong> Understand how visitors use the Platform to improve our services</li>
              <li><strong>Ensure security:</strong> Protect against fraudulent activity and unauthorized access</li>
              <li><strong>Measure performance:</strong> Monitor Platform speed and identify technical issues</li>
            </ul>

            {/* 4. Managing Preferences */}
            <h2>4. Managing Your Cookie Preferences</h2>
            <p>
              You have several options for managing cookies:
            </p>
            
            <h3>4.1 Cookie Consent Banner</h3>
            <p>
              When you first visit the Platform, you will see a cookie consent banner that allows you to accept or decline non-essential cookies. You can change your preferences at any time by [clicking the "Cookie Settings" link in the footer / contacting us].
            </p>
            
            <h3>4.2 Browser Settings</h3>
            <p>
              Most web browsers allow you to control cookies through their settings. You can typically:
            </p>
            <ul>
              <li>View and delete existing cookies</li>
              <li>Block all cookies or only third-party cookies</li>
              <li>Set preferences for specific websites</li>
              <li>Receive notifications when cookies are set</li>
            </ul>
            <p>
              Please note that blocking or deleting cookies may affect Platform functionality. Essential cookies cannot be disabled as they are necessary for the Platform to work.
            </p>
            <p>
              For information on managing cookies in your browser, visit:
            </p>
            <ul>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
            </ul>
            
            <h3>4.3 Do Not Track</h3>
            <p>
              Some browsers offer a "Do Not Track" (DNT) setting. We currently [do / do not] respond to DNT signals. [If we do not respond: We recommend using the cookie consent banner or browser settings to manage your preferences instead.]
            </p>

            {/* 5. Third-Party Cookies */}
            <h2>5. Third-Party Cookies</h2>
            <p>
              Some cookies on the Platform are set by third-party services that we use. These providers have their own privacy and cookie policies. We encourage you to review them:
            </p>
          </div>

          {/* Third-Party Cookies Table */}
          <div className="my-8 overflow-x-auto">
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-foreground">Provider</th>
                  <th className="text-left p-3 font-medium text-foreground">Purpose</th>
                  <th className="text-left p-3 font-medium text-foreground">Privacy Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {thirdPartyCookies.map((cookie, index) => (
                  <tr key={index} className="bg-background">
                    <td className="p-3 text-muted-foreground">{cookie.provider}</td>
                    <td className="p-3 text-muted-foreground">{cookie.purpose}</td>
                    <td className="p-3 text-muted-foreground">{cookie.privacyLink}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {/* 6. Updates */}
            <h2>6. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make changes:
            </p>
            <ul>
              <li>We will update the "Last Updated" date at the top of this page</li>
              <li>For significant changes, we may notify you via the Platform or email</li>
              <li>Continued use of the Platform after changes constitutes acceptance of the updated policy</li>
            </ul>
            <p>
              We encourage you to review this policy periodically.
            </p>

            {/* 7. Contact */}
            <h2>7. Contact Us</h2>
            <p>
              If you have questions about this Cookie Policy or how we use cookies, please contact us:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 not-prose">
              <p className="font-medium text-foreground">[Company Legal Name]</p>
              <p className="text-muted-foreground">[Company Address]</p>
              <p className="text-muted-foreground">Email: [Support Email]</p>
            </div>

            <p className="mt-8">
              For more information about how we handle your personal data, please see our{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
