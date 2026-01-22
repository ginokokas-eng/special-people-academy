import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export default function PrivacyPolicy() {
  return (
    <MarketingLayout title="Privacy Policy" description="Special People Academy Privacy Policy. Learn how we collect, use, and protect your personal data.">
      <div className="py-20 px-6">
        <div className="container mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
            <p className="text-sm text-amber-800 dark:text-amber-200 m-0"><strong>Disclaimer:</strong> This template is provided for informational purposes and should be reviewed by legal counsel before use.</p>
          </div>
          <h1>Privacy Policy</h1>
          <p><strong>Effective Date:</strong> [Effective Date]</p>
          <p><strong>[Company Legal Name]</strong> ("we," "us," or "our") operates Special People Academy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
          <h2>1. Information We Collect</h2>
          <p><strong>Personal Data:</strong> Name, email address, phone number, organization name, job title, and payment information.</p>
          <p><strong>Usage Data:</strong> IP address, browser type, pages visited, time spent, and course progress.</p>
          <p><strong>Cookies:</strong> See our Cookie Policy for details.</p>
          <h2>2. How We Use Your Information</h2>
          <ul><li>Provide and maintain our services</li><li>Process transactions and send related information</li><li>Send administrative communications</li><li>Improve our platform and develop new features</li><li>Comply with legal obligations</li></ul>
          <h2>3. Legal Basis for Processing (GDPR)</h2>
          <ul><li><strong>Contract:</strong> To provide services you've requested</li><li><strong>Consent:</strong> For marketing communications</li><li><strong>Legitimate Interest:</strong> To improve our services</li><li><strong>Legal Obligation:</strong> To comply with applicable laws</li></ul>
          <h2>4. Data Sharing</h2>
          <p>We may share data with: service providers, business partners (with consent), legal authorities when required, and in connection with business transfers.</p>
          <h2>5. Data Retention</h2>
          <p>We retain personal data for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.</p>
          <h2>6. Your Rights</h2>
          <p>You have the right to: access, rectify, or erase your data; restrict processing; data portability; and withdraw consent. Contact us at [Support Email].</p>
          <h2>7. Children's Data</h2>
          <p>Our services are not directed to individuals under 16. We do not knowingly collect data from children without parental consent.</p>
          <h2>8. International Transfers</h2>
          <p>Data may be transferred to countries outside your jurisdiction. We implement appropriate safeguards for such transfers.</p>
          <h2>9. Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your data, including encryption and access controls.</p>
          <h2>10. Changes to This Policy</h2>
          <p>We may update this policy periodically. We will notify you of material changes via email or platform notice.</p>
          <h2>11. Contact Us</h2>
          <p>[Company Legal Name]<br />[Company Address]<br />Email: [Support Email]<br />Phone: [Phone]</p>
        </div>
      </div>
    </MarketingLayout>
  );
}
