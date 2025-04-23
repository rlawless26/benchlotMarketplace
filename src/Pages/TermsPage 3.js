// src/Pages/TermsPage.js
import React from 'react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="bg-stone-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-serif font-medium text-stone-800 mb-6">Terms of Service</h1>
          <p className="text-stone-500 mb-8">Last Updated: April 20, 2025</p>
          
          <div className="prose prose-stone max-w-none">
            <h2>1. Agreement to Terms</h2>
            <p>
              Welcome to Benchlot. These Terms of Service ("Terms") govern your access to and use of the Benchlot website,
              mobile applications, and services (collectively, the "Services"). Please read these Terms carefully.
            </p>
            <p>
              By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not
              agree to these Terms, you may not access or use our Services.
            </p>
            
            <h2>2. Definitions</h2>
            <p>In these Terms:</p>
            <ul>
              <li>"Benchlot," "we," "us," and "our" refer to Benchlot, Inc.</li>
              <li>"User," "you," and "your" refer to any individual or entity using our Services.</li>
              <li>"Seller" refers to a User who lists tools for sale, rent, or trade on our Services.</li>
              <li>"Buyer" refers to a User who purchases, rents, or acquires tools listed on our Services.</li>
              <li>"Listing" refers to a tool or equipment offered for sale, rent, or trade on our Services.</li>
              <li>"Content" refers to any information, text, graphics, photos, or other material uploaded, downloaded, or appearing on our Services.</li>
            </ul>
            
            <h2>3. Account Registration</h2>
            <p>
              To use certain features of our Services, you must register for an account. When you register, you agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your information</li>
              <li>Keep your password secure and confidential</li>
              <li>Be responsible for all activity that occurs under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate your account if any information provided is inaccurate, false, or
              incomplete. You must be at least 18 years old to create an account and use our Services.
            </p>
            
            <h2>4. Marketplace Rules</h2>
            <h3>4.1. Listings</h3>
            <p>As a Seller, you agree to:</p>
            <ul>
              <li>Provide accurate and complete information about the tools you list</li>
              <li>List only tools that you own or are authorized to sell</li>
              <li>Clearly disclose any defects, damages, or issues with the tools</li>
              <li>Set fair and reasonable prices</li>
              <li>Promptly respond to inquiries from potential Buyers</li>
              <li>Honor commitments to sell at the agreed-upon price</li>
            </ul>
            <p>We reserve the right to remove any Listing at our discretion.</p>
            
            <h3>4.2. Purchases</h3>
            <p>As a Buyer, you agree to:</p>
            <ul>
              <li>Pay the full agreed-upon price for tools you purchase</li>
              <li>Complete the transaction as agreed with the Seller</li>
              <li>Inspect tools upon receipt</li>
              <li>Communicate any issues promptly and professionally</li>
            </ul>
            
            <h3>4.3. Prohibited Items</h3>
            <p>The following items may not be listed on our Services:</p>
            <ul>
              <li>Stolen or counterfeit items</li>
              <li>Items that infringe on intellectual property rights</li>
              <li>Dangerous or defective tools that pose safety risks</li>
              <li>Items prohibited by law</li>
              <li>Items that violate our community standards</li>
            </ul>
            
            <h2>5. Fees and Payments</h2>
            <h3>5.1. Platform Fees</h3>
            <p>
              Benchlot charges a 5% platform fee on each successful transaction. This fee covers our service,
              payment processing, and ongoing platform improvements. There are no listing fees or monthly
              subscription costs for basic sellers.
            </p>
            
            <h3>5.2. Payment Processing</h3>
            <p>
              Our Services use Stripe to process payments. By using our payment processing system, you agree to
              comply with Stripe's terms of service, which can be found on their website.
            </p>
            
            <h3>5.3. Payment to Sellers</h3>
            <p>
              Sellers will receive payment for their sold items after the Buyer confirms receipt of the item or after
              a specified holding period, less the applicable platform fees. Payments will be made to the Seller's
              connected Stripe account.
            </p>
            
            <h3>5.4. Refunds and Returns</h3>
            <p>
              Our refund policy allows Buyers to request a refund within 48 hours of receiving an item if it is
              significantly different from its description. Refunds are processed at our discretion after
              investigation of the claim.
            </p>
            
            <h2>6. User Content</h2>
            <h3>6.1. Ownership</h3>
            <p>
              You retain ownership of any Content you submit, post, or display on or through our Services. By
              submitting Content, you grant Benchlot a worldwide, non-exclusive, royalty-free license to use,
              reproduce, modify, adapt, publish, translate, and distribute the Content for the purpose of providing
              and promoting our Services.
            </p>
            
            <h3>6.2. Responsibility for Content</h3>
            <p>
              You are solely responsible for any Content you post on our Services. You represent and warrant that:
            </p>
            <ul>
              <li>You own the Content or have the right to use and grant us the rights specified in these Terms</li>
              <li>The Content does not violate the privacy rights, publicity rights, copyright, contractual rights, or any other rights of any person or entity</li>
            </ul>
            
            <h3>6.3. Prohibited Content</h3>
            <p>You agree not to post Content that:</p>
            <ul>
              <li>Is false, misleading, or deceptive</li>
              <li>Is defamatory, obscene, pornographic, vulgar, or offensive</li>
              <li>Promotes discrimination, bigotry, racism, hatred, harassment, or harm against any individual or group</li>
              <li>Is violent or threatening or promotes violence or actions that are threatening to any person or entity</li>
              <li>Promotes illegal activities</li>
              <li>Infringes upon or violates the intellectual property rights or other rights of any person or entity</li>
            </ul>
            
            <h2>7. Intellectual Property</h2>
            <p>
              The Benchlot name, logo, and all related names, logos, product and service names, designs, and slogans
              are trademarks of Benchlot or its affiliates. You may not use such marks without our prior written permission.
            </p>
            <p>
              Our Services and their entire contents, features, and functionality (including but not limited to all
              information, software, text, displays, images, video, and audio, and the design, selection, and
              arrangement thereof) are owned by Benchlot, its licensors, or other providers of such material and are
              protected by copyright, trademark, patent, trade secret, and other intellectual property or proprietary
              rights laws.
            </p>
            
            <h2>8. Disputes Between Users</h2>
            <p>
              Benchlot is not responsible for resolving disputes between Users. However, we may, at our discretion,
              provide assistance in resolving disputes. If you have a dispute with another User, we encourage you to
              first attempt to resolve the issue directly with the other User.
            </p>
            <p>
              If you are unable to resolve the dispute directly, you may report the issue to Benchlot. We may, at our
              discretion, review the dispute and take appropriate action, which may include mediation, refunds, or
              account suspension.
            </p>
            
            <h2>9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Benchlot shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including without limitation, loss of profits, data, use,
              goodwill, or other intangible losses, resulting from:
            </p>
            <ul>
              <li>Your access to or use of or inability to access or use our Services</li>
              <li>Any conduct or content of any third party on our Services</li>
              <li>Any content obtained from our Services</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>
            <p>
              In no event shall Benchlot's total liability to you for all claims exceed the amount you have paid to
              Benchlot in the last six months.
            </p>
            
            <h2>10. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Benchlot, its affiliates, and their respective
              officers, directors, employees, and agents from and against any claims, liabilities, damages, judgments,
              awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or
              relating to your violation of these Terms or your use of our Services.
            </p>
            
            <h2>11. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to our Services immediately, without prior
              notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
            </p>
            <p>
              Upon termination, your right to use our Services will immediately cease. If you wish to terminate your
              account, you may simply discontinue using our Services or contact us to request account deletion.
            </p>
            
            <h2>12. Changes to Terms</h2>
            <p>
              We may revise these Terms from time to time. The most current version will always be posted on our
              website. If a revision, in our sole discretion, is material, we will notify you via email or through
              our Services. By continuing to access or use our Services after revisions become effective, you agree
              to be bound by the revised Terms.
            </p>
            
            <h2>13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Commonwealth of Massachusetts,
              without regard to its conflict of law principles. Any legal action or proceeding arising out of or
              relating to these Terms shall be brought exclusively in the federal or state courts located in Boston, Massachusetts.
            </p>
            
            <h2>14. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> legal@benchlot.com<br />
              <strong>Address:</strong> Benchlot, Inc.<br />
              123 Tool Street<br />
              Boston, MA 02108
            </p>
          </div>
          
          <div className="mt-8 border-t border-stone-200 pt-6 flex justify-between">
            <Link to="/help" className="text-benchlot-primary hover:text-benchlot-secondary">
              Back to Help Center
            </Link>
            <Link to="/privacy" className="text-benchlot-primary hover:text-benchlot-secondary">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;