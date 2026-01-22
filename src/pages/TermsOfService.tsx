import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export default function TermsOfService() {
  return (
    <MarketingLayout title="Terms of Service" description="Special People Academy Terms of Service. Read our terms and conditions for using our platform.">
      <div className="py-20 px-6">
        <div className="container mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
            <p className="text-sm text-amber-800 dark:text-amber-200 m-0"><strong>Disclaimer:</strong> This template is provided for informational purposes and should be reviewed by legal counsel before use.</p>
          </div>
          <h1>Terms of Service</h1>
          <p><strong>Effective Date:</strong> [Effective Date]</p>
          <p>These Terms of Service ("Terms") govern your use of Special People Academy operated by <strong>[Company Legal Name]</strong>.</p>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using our platform, you agree to be bound by these Terms. If you disagree, you may not use our services.</p>
          <h2>2. Description of Service</h2>
          <p>Special People Academy provides online training courses, certification programs, and related educational services.</p>
          <h2>3. User Accounts</h2>
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and all activities under your account.</p>
          <h2>4. Acceptable Use</h2>
          <p>You agree not to: violate any laws; infringe intellectual property rights; transmit harmful content; attempt to gain unauthorized access; or interfere with platform operations.</p>
          <h2>5. Intellectual Property</h2>
          <p>All content, trademarks, and materials on our platform are owned by [Company Legal Name] or our licensors. You may not reproduce, distribute, or create derivative works without permission.</p>
          <h2>6. Payment Terms</h2>
          <p>Subscription fees are billed in advance. Refunds are provided in accordance with our refund policy. We reserve the right to change pricing with 30 days' notice.</p>
          <h2>7. Certificates</h2>
          <p>Certificates are issued upon successful completion of courses and assessments. Certificates represent completion only and are not professional licenses.</p>
          <h2>8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, [Company Legal Name] shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.</p>
          <h2>9. Indemnification</h2>
          <p>You agree to indemnify and hold harmless [Company Legal Name] from any claims arising from your use of the platform or violation of these Terms.</p>
          <h2>10. Termination</h2>
          <p>We may suspend or terminate your access for violation of these Terms. Upon termination, your right to use the platform ceases immediately.</p>
          <h2>11. Governing Law</h2>
          <p>These Terms are governed by the laws of [Jurisdiction]. Disputes shall be resolved in the courts of [Jurisdiction].</p>
          <h2>12. Changes to Terms</h2>
          <p>We may modify these Terms at any time. Continued use after changes constitutes acceptance of the new Terms.</p>
          <h2>13. Contact</h2>
          <p>[Company Legal Name]<br />[Company Address]<br />Email: [Support Email]</p>
        </div>
      </div>
    </MarketingLayout>
  );
}
