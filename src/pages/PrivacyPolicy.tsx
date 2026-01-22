import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <MarketingLayout 
      title="Privacy Policy" 
      description="Learn how we collect, use, and protect personal information when you use Special People Academy."
    >
      <div className="py-16 md:py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          {/* Legal Disclaimer */}
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Disclaimer:</strong> This Privacy Policy template is provided for informational purposes and should be reviewed by legal counsel before use.
              </p>
            </CardContent>
          </Card>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
            
            <div className="text-muted-foreground space-y-1 mb-8 not-prose">
              <p><strong className="text-foreground">Effective Date:</strong> [Effective Date]</p>
              <p><strong className="text-foreground">Last Updated:</strong> [Last Updated Date]</p>
            </div>

            <p>
              <strong>[Company Legal Name]</strong> ("we," "us," or "our"), located at [Company Address], operates Special People Academy (the "Platform"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.
            </p>
            <p>
              By using the Platform, you consent to the practices described in this Privacy Policy. If you do not agree with this policy, please do not use our services.
            </p>

            {/* 1. Overview */}
            <h2>1. Overview</h2>
            <p>
              Special People Academy is an inclusive training platform designed to help individuals build essential life skills. We are committed to protecting your privacy and ensuring that your personal information is handled responsibly and in compliance with applicable data protection laws, including the UK GDPR and, where applicable, the EU GDPR.
            </p>
            <p>
              This policy applies to all users of the Platform, including learners, educators, administrators, and caregivers.
            </p>

            {/* 2. Information We Collect */}
            <h2>2. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            
            <h3>2.1 Account Information</h3>
            <p>
              When you register for an account, we collect your name, email address, organization name (if applicable), job title or role, and password credentials.
            </p>
            
            <h3>2.2 Learner Profile Information</h3>
            <p>
              For learners using the Platform, we may collect information provided by educators or caregivers, including learning goals, progress data, skill assessments, and notes. <strong>We do not collect sensitive health data unless explicitly provided by authorized users for the purpose of personalizing training.</strong>
            </p>
            
            <h3>2.3 Usage Data</h3>
            <p>
              We automatically collect information about how you interact with the Platform, including pages visited, features used, time spent on activities, course completion data, and learning progress.
            </p>
            
            <h3>2.4 Device and Technical Information</h3>
            <p>
              We collect device type, operating system, browser type, IP address, and general location data (country/region) to optimize Platform performance and security.
            </p>
            
            <h3>2.5 Communications</h3>
            <p>
              When you contact us for support or feedback, we retain the content of your communications, including emails, form submissions, and any attachments.
            </p>

            {/* 3. How We Use Information */}
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li><strong>Provide and Maintain Services:</strong> To operate the Platform, manage accounts, and deliver training content.</li>
              <li><strong>Personalize Learning:</strong> To customize content, track progress, and generate reports for learners and educators.</li>
              <li><strong>Customer Support:</strong> To respond to inquiries, troubleshoot issues, and provide assistance.</li>
              <li><strong>Analytics and Improvement:</strong> To understand usage patterns, improve features, and develop new functionality.</li>
              <li><strong>Security:</strong> To detect, prevent, and address fraud, abuse, and security vulnerabilities.</li>
              <li><strong>Communications:</strong> To send administrative notices, updates, and (with consent) marketing communications.</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
            </ul>

            {/* 4. Legal Bases */}
            <h2>4. Legal Bases for Processing</h2>
            <p>We process your personal data based on the following legal grounds under applicable data protection law:</p>
            <ul>
              <li><strong>Contract:</strong> Processing necessary to fulfill our contractual obligations to you (e.g., providing access to the Platform).</li>
              <li><strong>Consent:</strong> Where you have given explicit consent (e.g., marketing communications, optional data collection).</li>
              <li><strong>Legitimate Interests:</strong> Processing necessary for our legitimate business interests, such as improving services and ensuring security, provided these do not override your rights.</li>
              <li><strong>Legal Obligation:</strong> Processing required to comply with applicable laws and regulations.</li>
            </ul>
            <p>
              You may withdraw consent at any time by contacting us at [Support Email].
            </p>

            {/* 5. Sharing & Processors */}
            <h2>5. Data Sharing and Third-Party Processors</h2>
            <p>We may share your information with the following categories of recipients:</p>
            
            <h3>5.1 Service Providers</h3>
            <p>
              We use trusted third-party providers to help operate the Platform, including cloud hosting, email delivery, payment processing, and analytics. These providers are contractually obligated to protect your data and use it only for the services they provide to us.
            </p>
            
            <h3>5.2 Analytics Partners</h3>
            <p>
              We use analytics tools to understand how users interact with the Platform. These tools may collect anonymized or aggregated data.
            </p>
            
            <h3>5.3 Legal and Safety Disclosures</h3>
            <p>
              We may disclose information if required by law, court order, or government request, or if we believe disclosure is necessary to protect rights, safety, or property.
            </p>
            
            <h3>5.4 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
            </p>
            
            <p className="font-medium">
              We do not sell your personal information to third parties.
            </p>

            {/* 6. Cookies */}
            <h2>6. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to operate the Platform, remember your preferences, and analyze usage. For detailed information about the cookies we use and how to manage them, please see our{" "}
              <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>.
            </p>

            {/* 7. Data Retention */}
            <h2>7. Data Retention</h2>
            <p>
              We retain personal data for as long as necessary to fulfill the purposes described in this policy, maintain our services, and comply with legal obligations. Specific retention periods include:
            </p>
            <ul>
              <li><strong>Account Data:</strong> Retained while your account is active and for [X years] after account closure.</li>
              <li><strong>Learning Progress Data:</strong> Retained for the duration of the learner's enrollment and for [X years] thereafter for reporting purposes.</li>
              <li><strong>Support Communications:</strong> Retained for [X years] after resolution.</li>
              <li><strong>Analytics Data:</strong> Aggregated data may be retained indefinitely; individual-level data is retained for [X months].</li>
            </ul>
            <p>
              You may request deletion of your data by contacting us at [Support Email].
            </p>

            {/* 8. Security */}
            <h2>8. Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Access controls and authentication requirements</li>
              <li>Regular security assessments and monitoring</li>
              <li>Employee training on data protection</li>
            </ul>
            <p>
              While we strive to protect your information, no method of transmission or storage is 100% secure. If you believe your account has been compromised, please contact us immediately at [Support Email].
            </p>

            {/* 9. Children's Privacy */}
            <h2>9. Children's Privacy</h2>
            <p>
              Special People Academy may be used by organizations and caregivers to support learners of all ages, including minors. <strong>We do not collect personal information directly from children under 16.</strong>
            </p>
            <p>
              When the Platform is used to support minors, all data is collected and managed by authorized educators, caregivers, or organizational administrators who have obtained appropriate consent from parents or legal guardians.
            </p>
            <p>
              If you believe we have inadvertently collected information from a child without proper consent, please contact us at [Support Email] and we will promptly delete the data.
            </p>

            {/* 10. International Transfers */}
            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries outside of [Jurisdiction], including countries that may have different data protection laws. When we transfer data internationally, we implement appropriate safeguards, such as:
            </p>
            <ul>
              <li>Standard Contractual Clauses approved by [relevant authority]</li>
              <li>Transfers to countries with adequacy decisions</li>
              <li>Other legally recognized transfer mechanisms</li>
            </ul>
            <p>
              For more information about international transfers, please contact us at [Support Email].
            </p>

            {/* 11. Your Rights */}
            <h2>11. Your Rights</h2>
            <p>
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul>
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data (subject to legal retention requirements).</li>
              <li><strong>Restriction:</strong> Request that we limit how we use your data.</li>
              <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests or for direct marketing.</li>
              <li><strong>Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
            </ul>
            <p>
              To exercise these rights, please contact us at [Support Email]. We will respond to your request within [30 days / the timeframe required by applicable law].
            </p>
            <p>
              <em>[For UK/EU users: You also have the right to lodge a complaint with your local data protection authority.]</em>
            </p>
            <p>
              <em>[For California residents: You may have additional rights under the CCPA, including the right to know, delete, and opt-out of the sale of personal information. Contact us for more details.]</em>
            </p>

            {/* 12. Changes */}
            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will:
            </p>
            <ul>
              <li>Update the "Last Updated" date at the top of this page</li>
              <li>Notify you via email or prominent notice on the Platform</li>
              <li>Where required by law, obtain your consent to the changes</li>
            </ul>
            <p>
              We encourage you to review this policy periodically to stay informed about how we protect your information.
            </p>

            {/* 13. Contact */}
            <h2>13. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 not-prose">
              <p className="font-medium text-foreground">[Company Legal Name]</p>
              <p className="text-muted-foreground">[Company Address]</p>
              <p className="text-muted-foreground">Email: [Support Email]</p>
              <p className="text-muted-foreground">Phone: [Phone Number]</p>
            </div>
            <p className="mt-4">
              For data protection inquiries, you may also contact our Data Protection Officer (if applicable) at [DPO Email].
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
