// src/Pages/PrivacyPage.js
import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPage = () => {
  return (
    <div className="bg-stone-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-serif font-medium text-stone-800 mb-6">Privacy Policy</h1>
          <p className="text-stone-500 mb-8">Last Updated: April 20, 2025</p>
          
          <div className="prose prose-stone max-w-none">
            <h2>1. Introduction</h2>
            <p>
              At Benchlot, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our website, mobile application, and services 
              (collectively, the "Services").
            </p>
            <p>
              Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, 
              please do not access our Services.
            </p>
            
            <h2>2. Information We Collect</h2>
            
            <h3>2.1. Information You Provide to Us</h3>
            <p>We may collect information that you provide directly to us, including:</p>
            <ul>
              <li><strong>Account Information:</strong> When you register for an account, we collect your name, email address, password, and optional profile information such as a profile picture, location, and tool interests.</li>
              <li><strong>Listing Information:</strong> If you are a seller, we collect information about the tools you list, including descriptions, conditions, prices, and images.</li>
              <li><strong>Transaction Information:</strong> We collect information related to your transactions, including purchase amounts, payment methods, and billing details.</li>
              <li><strong>Communications:</strong> We collect information when you communicate with us or other users through our messaging system, including message content and timestamps.</li>
              <li><strong>Feedback and Reviews:</strong> We collect feedback, ratings, and reviews that you provide about other users or tools.</li>
              <li><strong>Preferences:</strong> We collect information about your preferences, such as notification settings, privacy settings, and location precision.</li>
            </ul>
            
            <h3>2.2. Information We Collect Automatically</h3>
            <p>When you use our Services, we may automatically collect certain information, including:</p>
            <ul>
              <li><strong>Device Information:</strong> We collect information about your device, including IP address, browser type, operating system, and mobile device identifiers.</li>
              <li><strong>Usage Information:</strong> We collect information about how you use our Services, including pages visited, time spent on pages, links clicked, and search queries.</li>
              <li><strong>Location Information:</strong> With your consent, we may collect precise location information to show you tools near you or to facilitate local pickups.</li>
              <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar technologies to collect information about your browsing activity and preferences.</li>
            </ul>
            
            <h3>2.3. Information from Third Parties</h3>
            <p>We may receive information about you from third parties, including:</p>
            <ul>
              <li><strong>Social Media Platforms:</strong> If you choose to link your social media accounts to Benchlot, we may collect information from those accounts, such as your name, email address, and friends list.</li>
              <li><strong>Payment Processors:</strong> When you make a purchase, our payment processors (such as Stripe) provide us with information necessary to process your payment.</li>
              <li><strong>Identity Verification Services:</strong> We may use third-party services to verify your identity and prevent fraud.</li>
            </ul>
            
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect for various purposes, including:</p>
            
            <h3>3.1. Providing and Improving Our Services</h3>
            <ul>
              <li>To provide, maintain, and improve our Services</li>
              <li>To process transactions and send transaction notifications</li>
              <li>To connect buyers and sellers for tool transactions</li>
              <li>To personalize your experience and show you relevant content and listings</li>
              <li>To develop new products, services, and features</li>
              <li>To monitor and analyze usage patterns and trends</li>
            </ul>
            
            <h3>3.2. Communications</h3>
            <ul>
              <li>To communicate with you about your account, transactions, and listings</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To send you technical notices, updates, security alerts, and administrative messages</li>
              <li>To send you marketing communications, if you have opted in</li>
              <li>To facilitate communication between users for transactions</li>
            </ul>
            
            <h3>3.3. Security and Protection</h3>
            <ul>
              <li>To detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
              <li>To protect the rights, safety, and property of Benchlot, our users, and others</li>
              <li>To enforce our Terms of Service and other policies</li>
              <li>To verify your identity and prevent unauthorized access to your account</li>
            </ul>
            
            <h2>4. How We Share Your Information</h2>
            <p>We may share your information with the following parties:</p>
            
            <h3>4.1. Other Users</h3>
            <p>
              When you use our Services, certain information is shared with other users, depending on your privacy settings:
            </p>
            <ul>
              <li><strong>Public Profile Information:</strong> Your profile information, such as your name, location (based on your privacy settings), and profile picture may be visible to other users.</li>
              <li><strong>Listing Information:</strong> When you list a tool, the information you provide about the tool, including images and descriptions, is visible to potential buyers.</li>
              <li><strong>Transaction Information:</strong> When you engage in a transaction, we share necessary information with the other party to facilitate the transaction.</li>
              <li><strong>Reviews and Ratings:</strong> Reviews and ratings you leave for other users or their tools are visible to the community.</li>
            </ul>
            
            <h3>4.2. Service Providers</h3>
            <p>
              We may share your information with third-party service providers who perform services on our behalf, such as:
            </p>
            <ul>
              <li>Payment processors (e.g., Stripe)</li>
              <li>Cloud storage providers</li>
              <li>Email service providers</li>
              <li>Analytics providers</li>
              <li>Customer support services</li>
              <li>Fraud prevention and identity verification services</li>
            </ul>
            <p>
              These service providers have access to your information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
            </p>
            
            <h3>4.3. Legal Requirements</h3>
            <p>
              We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency). We may also disclose your information to:
            </p>
            <ul>
              <li>Enforce our Terms of Service and other agreements</li>
              <li>Protect and defend our rights or property</li>
              <li>Prevent or investigate possible wrongdoing in connection with our Services</li>
              <li>Protect the personal safety of users of our Services or the public</li>
              <li>Protect against legal liability</li>
            </ul>
            
            <h3>4.4. Business Transfers</h3>
            <p>
              If Benchlot is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on our Services of any change in ownership or uses of your information, as well as any choices you may have regarding your information.
            </p>
            
            <h2>5. Your Choices and Rights</h2>
            
            <h3>5.1. Account Information</h3>
            <p>
              You can update or correct your account information at any time by logging into your account settings. If you wish to delete your account, you can do so in your account settings or by contacting us.
            </p>
            
            <h3>5.2. Privacy Settings</h3>
            <p>
              You can control the visibility of your profile and location information through the privacy settings in your account. Options include:
            </p>
            <ul>
              <li><strong>Profile Visibility:</strong> Public, Registered Users Only, or Private</li>
              <li><strong>Location Precision:</strong> Exact Location, City Only, Region Only, or Hidden</li>
              <li><strong>Search Engine Indexing:</strong> Allow or disallow search engines to index your profile and listings</li>
            </ul>
            
            <h3>5.3. Communications</h3>
            <p>
              You can opt out of receiving promotional emails from us by following the instructions in those emails. If you opt out, we may still send you non-promotional emails, such as those about your account or transactions.
            </p>
            
            <h3>5.4. Cookies</h3>
            <p>
              Most web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove or reject cookies. Please note that if you choose to remove or reject cookies, this could affect the availability and functionality of our Services.
            </p>
            
            <h3>5.5. Data Access and Portability</h3>
            <p>
              You can request a copy of your personal data by contacting us. We will provide a copy of your data in a structured, commonly used, and machine-readable format.
            </p>
            
            <h2>6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, use, disclosure, alteration, or destruction. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
            <p>
              We take the following security measures:
            </p>
            <ul>
              <li>Encryption of sensitive data</li>
              <li>Regular security assessments</li>
              <li>Access controls for employees and contractors</li>
              <li>Secure payment processing through Stripe</li>
              <li>Regular backups and disaster recovery plans</li>
            </ul>
            
            <h2>7. Data Retention</h2>
            <p>
              We will retain your information for as long as your account is active or as needed to provide you with our Services. We will also retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
            </p>
            
            <h2>8. Children's Privacy</h2>
            <p>
              Our Services are not intended for children under the age of 18, and we do not knowingly collect personal information from children under 18. If we learn that we have collected personal information from a child under 18, we will promptly delete that information.
            </p>
            
            <h2>9. International Data Transfers</h2>
            <p>
              Benchlot operates primarily in the United States. If you are accessing our Services from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States, where our servers are located. By using our Services, you consent to the transfer of your information to the United States, which may have different data protection rules than those of your country.
            </p>
            
            <h2>10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
            </p>
            
            <h2>11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> privacy@benchlot.com<br />
              <strong>Address:</strong> Benchlot, Inc.<br />
              123 Tool Street<br />
              Boston, MA 02108
            </p>
          </div>
          
          <div className="mt-8 border-t border-stone-200 pt-6 flex justify-between">
            <Link to="/help" className="text-benchlot-primary hover:text-benchlot-secondary">
              Back to Help Center
            </Link>
            <Link to="/terms" className="text-benchlot-primary hover:text-benchlot-secondary">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;