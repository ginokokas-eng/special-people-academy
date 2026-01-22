import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export default function CookiePolicy() {
  return (
    <MarketingLayout title="Cookie Policy" description="Special People Academy Cookie Policy. Learn how we use cookies and similar technologies.">
      <div className="py-20 px-6">
        <div className="container mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
            <p className="text-sm text-amber-800 dark:text-amber-200 m-0"><strong>Disclaimer:</strong> This template is provided for informational purposes and should be reviewed by legal counsel before use.</p>
          </div>
          <h1>Cookie Policy</h1>
          <p><strong>Effective Date:</strong> [Effective Date]</p>
          <p>This Cookie Policy explains how <strong>[Company Legal Name]</strong> uses cookies and similar technologies on Special People Academy.</p>
          <h2>1. What Are Cookies?</h2>
          <p>Cookies are small text files stored on your device when you visit a website. They help the website remember your preferences and understand how you use the site.</p>
          <h2>2. Types of Cookies We Use</h2>
          <h3>Essential Cookies</h3>
          <p>Required for the platform to function. These cannot be disabled.</p>
          <h3>Performance Cookies</h3>
          <p>Help us understand how visitors interact with our platform by collecting anonymous information.</p>
          <h3>Functional Cookies</h3>
          <p>Remember your preferences and settings to provide a personalized experience.</p>
          <h3>Marketing Cookies</h3>
          <p>Used to deliver relevant advertisements and track campaign effectiveness.</p>
          <h2>3. Third-Party Cookies</h2>
          <p>We may use third-party services that set cookies, including: analytics providers, payment processors, and advertising networks.</p>
          <h2>4. Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Note that disabling certain cookies may affect platform functionality.</p>
          <h2>5. Cookie Consent</h2>
          <p>When you first visit our platform, you will be asked to consent to non-essential cookies. You can change your preferences at any time through our cookie settings.</p>
          <h2>6. Updates to This Policy</h2>
          <p>We may update this Cookie Policy periodically. Changes will be posted on this page with an updated effective date.</p>
          <h2>7. Contact Us</h2>
          <p>For questions about our use of cookies, contact us at [Support Email].</p>
        </div>
      </div>
    </MarketingLayout>
  );
}
