import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <MarketingLayout 
      title="Terms of Service" 
      description="Terms governing use of Special People Academy's platform and services."
    >
      <div className="py-16 md:py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          {/* Legal Disclaimer */}
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Disclaimer:</strong> This Terms of Service template is provided for informational purposes and should be reviewed by legal counsel before use.
              </p>
            </CardContent>
          </Card>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
            
            <div className="text-muted-foreground space-y-1 mb-8 not-prose">
              <p><strong className="text-foreground">Effective Date:</strong> [Effective Date]</p>
              <p><strong className="text-foreground">Last Updated:</strong> [Last Updated Date]</p>
            </div>

            <p>
              These Terms of Service ("Terms") govern your access to and use of Special People Academy (the "Platform"), operated by <strong>[Company Legal Name]</strong>, located at [Company Address]. By accessing or using the Platform, you agree to be bound by these Terms.
            </p>

            {/* 1. Acceptance of Terms */}
            <h2>1. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing, or using any part of the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
            <p>
              If you are using the Platform on behalf of an organization (such as a school, employer, or care provider), you represent and warrant that you have authority to bind that organization to these Terms, and "you" refers to both you individually and the organization.
            </p>
            <p>
              If you do not agree to these Terms, you must not access or use the Platform.
            </p>

            {/* 2. Accounts & Responsibilities */}
            <h2>2. Accounts and User Responsibilities</h2>
            
            <h3>2.1 Account Registration</h3>
            <p>
              To access certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary.
            </p>
            
            <h3>2.2 Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
            </p>
            <ul>
              <li>Use a strong, unique password</li>
              <li>Not share your login credentials with others</li>
              <li>Notify us immediately of any unauthorized access or security breach</li>
              <li>Log out of your account at the end of each session on shared devices</li>
            </ul>
            
            <h3>2.3 Organizational Accounts</h3>
            <p>
              If you manage an organizational account, you are responsible for the conduct of all users you authorize to access the Platform. You must ensure they comply with these Terms.
            </p>

            {/* 3. Permitted Use / Prohibited Use */}
            <h2>3. Permitted and Prohibited Use</h2>
            
            <h3>3.1 Permitted Use</h3>
            <p>
              The Platform is provided for the purpose of delivering and managing inclusive training and skill-building programs. You may use the Platform to:
            </p>
            <ul>
              <li>Access and complete training content</li>
              <li>Track learner progress and generate reports</li>
              <li>Collaborate with other authorized users</li>
              <li>Download resources for personal or organizational use</li>
            </ul>
            
            <h3>3.2 Prohibited Use</h3>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Platform for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to any portion of the Platform or its systems</li>
              <li>Interfere with or disrupt the integrity or performance of the Platform</li>
              <li>Upload, transmit, or distribute viruses, malware, or other harmful code</li>
              <li>Reproduce, distribute, or publicly display Platform content without authorization</li>
              <li>Use automated systems (bots, scrapers) to access the Platform</li>
              <li>Impersonate another person or misrepresent your affiliation</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use the Platform in any manner that could damage our reputation or goodwill</li>
            </ul>

            {/* 4. Content and User Submissions */}
            <h2>4. Content and User Submissions</h2>
            
            <h3>4.1 Platform Content</h3>
            <p>
              All content provided through the Platform—including courses, lessons, assessments, templates, and resources—is owned by [Company Legal Name] or our licensors and is protected by copyright and other intellectual property laws.
            </p>
            
            <h3>4.2 User-Generated Content</h3>
            <p>
              You may submit content to the Platform, such as notes, learner data, feedback, or other materials ("User Content"). You retain ownership of your User Content, but you grant us a non-exclusive, worldwide, royalty-free license to use, store, and process your User Content solely to operate and improve the Platform.
            </p>
            
            <h3>4.3 Content Standards</h3>
            <p>
              User Content must not violate any applicable laws, infringe third-party rights, or contain offensive, harmful, or misleading material. We reserve the right to remove User Content that violates these Terms.
            </p>
            
            <h3>4.4 Learner Data</h3>
            <p>
              If you input data about learners (including minors), you represent that you have obtained all necessary consents and authorizations to share such information and use the Platform for that purpose.
            </p>

            {/* 5. Subscription, Billing, Refunds */}
            <h2>5. Subscription, Billing, and Refunds</h2>
            
            <h3>5.1 Subscription Plans</h3>
            <p>
              Access to certain features of the Platform requires a paid subscription. Details of available plans, features, and pricing are described on our{" "}
              <Link to="/pricing" className="text-primary hover:underline">Pricing page</Link>.
            </p>
            
            <h3>5.2 Billing</h3>
            <p>
              [Subscription fees are billed in advance on a [monthly/annual] basis. By subscribing, you authorize us to charge your designated payment method for the subscription fee plus any applicable taxes.]
            </p>
            
            <h3>5.3 Automatic Renewal</h3>
            <p>
              [Subscriptions automatically renew at the end of each billing period unless you cancel before the renewal date. You may cancel your subscription at any time through your account settings or by contacting us at [Support Email].]
            </p>
            
            <h3>5.4 Refunds</h3>
            <p>
              [Refund requests are handled on a case-by-case basis. To request a refund, contact us at [Support Email] within [X days] of your purchase. We reserve the right to refuse refunds if the service has been substantially used.]
            </p>
            
            <h3>5.5 Price Changes</h3>
            <p>
              [We may change our subscription fees with at least 30 days' notice. Price changes will take effect at the start of the next billing period.]
            </p>

            {/* 6. Intellectual Property */}
            <h2>6. Intellectual Property</h2>
            <p>
              All content, features, functionality, software, text, graphics, logos, trademarks, and other materials on the Platform are the exclusive property of [Company Legal Name] or our licensors and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for its intended purpose. This license does not include the right to:
            </p>
            <ul>
              <li>Modify, copy, or create derivative works from Platform content</li>
              <li>Use any data mining, robots, or similar data gathering methods</li>
              <li>Download or copy account information or content for commercial purposes</li>
              <li>Use Platform content outside the Platform without authorization</li>
            </ul>

            {/* 7. Privacy Reference */}
            <h2>7. Privacy</h2>
            <p>
              Your use of the Platform is also governed by our{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>, which describes how we collect, use, and protect your personal information. By using the Platform, you consent to the collection and use of information as described in the Privacy Policy.
            </p>
            <p>
              For information about cookies and tracking technologies, please see our{" "}
              <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>.
            </p>

            {/* 8. Availability and Changes */}
            <h2>8. Platform Availability and Changes</h2>
            <p>
              We strive to keep the Platform available and operational, but we do not guarantee uninterrupted access. We may:
            </p>
            <ul>
              <li>Perform maintenance that temporarily limits availability</li>
              <li>Modify, update, or discontinue features or content</li>
              <li>Suspend or terminate the Platform or your access at our discretion</li>
            </ul>
            <p>
              We will make reasonable efforts to notify users of significant changes or scheduled downtime in advance.
            </p>

            {/* 9. Disclaimers */}
            <h2>9. Disclaimers</h2>
            <p>
              <strong>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY.</strong>
            </p>
            <p>
              To the fullest extent permitted by law, we disclaim all warranties, including but not limited to:
            </p>
            <ul>
              <li>Implied warranties of merchantability, fitness for a particular purpose, and non-infringement</li>
              <li>Warranties that the Platform will be uninterrupted, secure, or error-free</li>
              <li>Warranties regarding the accuracy, reliability, or completeness of any content</li>
            </ul>
            <p>
              <strong>Educational Content Disclaimer:</strong> The training content provided on the Platform is for educational purposes only and does not constitute professional advice, diagnosis, or treatment. Always consult qualified professionals for specific guidance.
            </p>
            <p>
              <strong>Certificates:</strong> Certificates issued through the Platform represent completion of training only and are not professional licenses, certifications, or qualifications unless explicitly stated otherwise.
            </p>

            {/* 10. Limitation of Liability */}
            <h2>10. Limitation of Liability</h2>
            <p>
              <strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, [COMPANY LEGAL NAME] AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</strong>, including but not limited to:
            </p>
            <ul>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Personal injury or emotional distress</li>
              <li>Cost of substitute services</li>
              <li>Any damages arising from unauthorized access to or alteration of your data</li>
            </ul>
            <p>
              Our total liability for any claim arising out of or relating to these Terms or the Platform shall not exceed the greater of: (a) the amount you paid us in the 12 months preceding the claim, or (b) [£100 / $100].
            </p>
            <p>
              Some jurisdictions do not allow the exclusion or limitation of certain damages. In such cases, our liability will be limited to the fullest extent permitted by law.
            </p>

            {/* 11. Indemnification */}
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless [Company Legal Name], its affiliates, officers, directors, employees, agents, and licensors from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or related to:
            </p>
            <ul>
              <li>Your use of the Platform</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Any User Content you submit</li>
              <li>Your negligent or wrongful conduct</li>
            </ul>

            {/* 12. Termination */}
            <h2>12. Termination</h2>
            
            <h3>12.1 Termination by You</h3>
            <p>
              You may terminate your account at any time by contacting us at [Support Email] or using the account settings. Termination does not entitle you to a refund of any prepaid fees unless otherwise stated.
            </p>
            
            <h3>12.2 Termination by Us</h3>
            <p>
              We may suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice, including if we reasonably believe you have violated these Terms.
            </p>
            
            <h3>12.3 Effect of Termination</h3>
            <p>
              Upon termination, your right to access and use the Platform ceases immediately. We may delete your account and User Content after termination. Sections of these Terms that by their nature should survive termination will remain in effect.
            </p>

            {/* 13. Governing Law & Dispute Resolution */}
            <h2>13. Governing Law and Dispute Resolution</h2>
            
            <h3>13.1 Governing Law</h3>
            <p>
              These Terms are governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law principles.
            </p>
            
            <h3>13.2 Dispute Resolution</h3>
            <p>
              [Before initiating formal legal proceedings, you agree to first attempt to resolve any dispute informally by contacting us at [Support Email]. If the dispute is not resolved within [30 days], either party may proceed with formal resolution.]
            </p>
            <p>
              [Any disputes arising under these Terms shall be resolved through [binding arbitration / the courts of [Jurisdiction]]. You agree to submit to the personal jurisdiction of such courts.]
            </p>
            
            <h3>13.3 Class Action Waiver</h3>
            <p>
              [To the extent permitted by law, you agree that any disputes will be resolved on an individual basis and that you will not bring or participate in any class, consolidated, or representative action against [Company Legal Name].]
            </p>

            {/* 14. Contact Information */}
            <h2>14. Contact Information</h2>
            <p>
              If you have questions about these Terms or need to contact us for any reason, please reach out:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 not-prose">
              <p className="font-medium text-foreground">[Company Legal Name]</p>
              <p className="text-muted-foreground">[Company Address]</p>
              <p className="text-muted-foreground">Email: [Support Email]</p>
              <p className="text-muted-foreground">Phone: [Phone Number]</p>
            </div>

            {/* Acknowledgment */}
            <h2>15. Acknowledgment</h2>
            <p>
              By using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
