/**
 * SellerSettings Component
 * Allows sellers to manage their store and business settings
 */
import React, { useState, useEffect } from 'react';
import { Store, Check, Loader, AlertCircle, Briefcase, FileText, Truck, ExternalLink, DollarSign } from 'lucide-react';
import { updateSellerSettings } from '../../firebase/models/userModel';

const SellerSettings = ({ user }) => {
  // State for active sub-tab
  const [activeTab, setActiveTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // State for seller data
  const [sellerData, setSellerData] = useState({
    // Business Details
    businessName: '',
    businessType: 'individual',
    businessDescription: '',
    contactEmail: '',
    contactPhone: '',
    preferredContactMethod: 'email',
    
    // Store Policies
    policies: {
      returns: {
        acceptsReturns: true,
        returnPeriod: 14,
        restockingFee: 10,
        conditions: ''
      },
      rental: {
        minimumPeriod: 1,
        extensionPolicy: 'flexible',
        lateFees: {
          percentage: 10,
          dailyRate: 15,
          gracePeriod: 24
        },
        damagePolicy: '',
        depositRequired: true
      },
      shipping: {
        offersFreeShipping: false,
        freeShippingThreshold: 100,
        processingTime: 1,
        shippingMethods: ['standard', 'express'],
        internationalShipping: false
      }
    },
    
    // Financial Settings
    financial: {
      currency: 'USD',
      taxRate: 0,
      collectTaxes: false,
      payoutMethod: 'bank',
      payoutFrequency: 'weekly',
      accountLinked: false
    },
    
    // Stripe Connect Status
    stripeConnectComplete: false,
    stripeAccountId: ''
  });
  
  // Load seller data
  useEffect(() => {
    if (user && user.profile && user.profile.seller) {
      setSellerData({
        ...sellerData,
        ...user.profile.seller
      });
    }
  }, [user]);
  
  // Handle text field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setSellerData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSellerData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle toggle change
  const handleToggleChange = (field) => {
    // Handle nested fields
    if (field.includes('.')) {
      const segments = field.split('.');
      
      if (segments.length === 2) {
        const [parent, child] = segments;
        setSellerData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: !prev[parent]?.[child]
          }
        }));
      } else if (segments.length === 3) {
        const [parent, child, grandchild] = segments;
        setSellerData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent]?.[child],
              [grandchild]: !prev[parent]?.[child]?.[grandchild]
            }
          }
        }));
      }
    } else {
      setSellerData(prev => ({
        ...prev,
        [field]: !prev[field]
      }));
    }
  };
  
  // Handle nested numeric input changes
  const handleNestedNumberChange = (e) => {
    const { name, value } = e.target;
    const segments = name.split('.');
    
    if (segments.length === 2) {
      const [parent, child] = segments;
      setSellerData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: Number(value)
        }
      }));
    } else if (segments.length === 3) {
      const [parent, child, grandchild] = segments;
      setSellerData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: {
            ...prev[parent]?.[child],
            [grandchild]: Number(value)
          }
        }
      }));
    } else if (segments.length === 4) {
      const [parent, child, grandchild, greatgrandchild] = segments;
      setSellerData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: {
            ...prev[parent]?.[child],
            [grandchild]: {
              ...prev[parent]?.[child]?.[grandchild],
              [greatgrandchild]: Number(value)
            }
          }
        }
      }));
    }
  };
  
  // Handle checkbox change for shipping methods
  const handleShippingMethodChange = (method) => {
    const currentMethods = sellerData.policies.shipping.shippingMethods || [];
    let updatedMethods;
    
    if (currentMethods.includes(method)) {
      updatedMethods = currentMethods.filter(m => m !== method);
    } else {
      updatedMethods = [...currentMethods, method];
    }
    
    setSellerData(prev => ({
      ...prev,
      policies: {
        ...prev.policies,
        shipping: {
          ...prev.policies.shipping,
          shippingMethods: updatedMethods
        }
      }
    }));
  };
  
  // Toggle Switch component
  const ToggleSwitch = ({ id, checked, onChange, label, description }) => (
    <div className="flex items-start py-4">
      <div className="flex-shrink-0 mt-1">
        <button
          id={id}
          type="button"
          className={`relative inline-flex flex-shrink-0 h-6 transition-colors duration-200 ease-in-out border-2 border-transparent rounded-full cursor-pointer w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary ${
            checked ? 'bg-benchlot-primary' : 'bg-stone-200'
          }`}
          role="switch"
          aria-checked={checked}
          onClick={onChange}
        >
          <span 
            className={`inline-block w-5 h-5 transition duration-200 ease-in-out transform bg-white rounded-full shadow pointer-events-none ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`} 
          />
        </button>
      </div>
      <div className="ml-3">
        <label htmlFor={id} className="text-sm font-medium text-stone-800 cursor-pointer">{label}</label>
        {description && <p className="text-xs text-stone-500 mt-1">{description}</p>}
      </div>
    </div>
  );
  
  // Handle form submission
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await updateSellerSettings(user.uid, sellerData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving seller settings:', err);
      setError(err.message || 'Failed to save seller settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Mock function to connect to Stripe (in a real app, this would redirect to Stripe Connect)
  const handleStripeConnect = () => {
    alert('In a production app, this would redirect to Stripe Connect onboarding.');
    // Simulate connecting with Stripe
    setSellerData(prev => ({
      ...prev,
      financial: {
        ...prev.financial,
        accountLinked: true
      },
      stripeConnectComplete: true,
      stripeAccountId: 'acct_' + Math.random().toString(36).substring(2, 15)
    }));
  };
  
  // Render Business Details tab
  const renderBusinessDetailsTab = () => (
    <div className="space-y-6">
      {/* Business Name */}
      <div>
        <label 
          htmlFor="businessName" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Business Name
        </label>
        <input
          type="text"
          id="businessName"
          name="businessName"
          value={sellerData.businessName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          placeholder="Your business or shop name"
        />
      </div>
      
      {/* Business Type */}
      <div>
        <label 
          htmlFor="businessType" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Business Type
        </label>
        <select
          id="businessType"
          name="businessType"
          value={sellerData.businessType}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary bg-white"
        >
          <option value="individual">Individual / Sole Proprietor</option>
          <option value="professional">Professional / Contractor</option>
          <option value="company">Registered Business / Company</option>
        </select>
      </div>
      
      {/* Business Description */}
      <div>
        <label 
          htmlFor="businessDescription" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Business Description
        </label>
        <textarea
          id="businessDescription"
          name="businessDescription"
          value={sellerData.businessDescription}
          onChange={handleChange}
          rows="4"
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          placeholder="Describe your business, expertise, and the types of tools you offer"
        ></textarea>
      </div>
      
      {/* Contact Information */}
      <div className="pt-4 border-t border-stone-200">
        <h3 className="text-lg font-medium mb-4">Contact Information</h3>
        
        <div className="space-y-4">
          {/* Contact Email */}
          <div>
            <label 
              htmlFor="contactEmail" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Business Contact Email
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              value={sellerData.contactEmail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
              placeholder="Your business email address"
            />
          </div>
          
          {/* Contact Phone */}
          <div>
            <label 
              htmlFor="contactPhone" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Business Phone Number
            </label>
            <input
              type="tel"
              id="contactPhone"
              name="contactPhone"
              value={sellerData.contactPhone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
              placeholder="Your business phone number"
            />
          </div>
          
          {/* Preferred Contact Method */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Preferred Contact Method
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="preferredContactMethod"
                  value="email"
                  checked={sellerData.preferredContactMethod === 'email'}
                  onChange={handleChange}
                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
                />
                <span className="ml-2 text-sm text-stone-700">Email</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="preferredContactMethod"
                  value="phone"
                  checked={sellerData.preferredContactMethod === 'phone'}
                  onChange={handleChange}
                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
                />
                <span className="ml-2 text-sm text-stone-700">Phone</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="preferredContactMethod"
                  value="message"
                  checked={sellerData.preferredContactMethod === 'message'}
                  onChange={handleChange}
                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
                />
                <span className="ml-2 text-sm text-stone-700">Platform Message</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stripe Connect */}
      <div className="pt-4 border-t border-stone-200">
        <h3 className="text-lg font-medium mb-4">Payment Processing</h3>
        
        <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <DollarSign className="h-5 w-5 text-stone-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-stone-800">Connect a Payment Account</h3>
              <p className="text-xs text-stone-500 mt-1">
                To receive payments, you need to connect your Stripe account. This allows us to securely process payments and transfer funds to your bank account.
              </p>
            </div>
          </div>
        </div>
        
        {sellerData.financial.accountLinked ? (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Payment Account Connected</h3>
                <p className="text-xs text-green-700 mt-1">
                  Your Stripe account is connected. You can now receive payments for your tool rentals and sales.
                </p>
                <button
                  type="button"
                  className="mt-2 text-sm text-benchlot-primary hover:text-benchlot-secondary flex items-center"
                  onClick={() => alert('This would open the Stripe dashboard')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Stripe Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStripeConnect}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-benchlot-primary hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary"
          >
            Connect with Stripe
          </button>
        )}
      </div>
    </div>
  );
  
  // Render Store Policies tab
  const renderStorePoliciesTab = () => (
    <div className="space-y-6">
      {/* Return Policy */}
      <div className="border-b border-stone-200 pb-6">
        <h3 className="text-lg font-medium mb-4">Return Policy</h3>
        
        <div className="space-y-4">
          <ToggleSwitch
            id="accepts-returns"
            checked={sellerData.policies.returns.acceptsReturns}
            onChange={() => handleToggleChange('policies.returns.acceptsReturns')}
            label="Accept Returns"
            description="Allow customers to return tools under certain conditions"
          />
          
          <div className="ml-10">
            <label 
              htmlFor="returnPeriod" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Return Period (days)
            </label>
            <input
              type="number"
              id="returnPeriod"
              name="policies.returns.returnPeriod"
              value={sellerData.policies.returns.returnPeriod}
              onChange={handleNestedNumberChange}
              min="0"
              max="90"
              className="w-32 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
            />
            
            <div className="mt-4">
              <label 
                htmlFor="restockingFee" 
                className="block text-sm font-medium text-stone-700 mb-1"
              >
                Restocking Fee (%)
              </label>
              <input
                type="number"
                id="restockingFee"
                name="policies.returns.restockingFee"
                value={sellerData.policies.returns.restockingFee}
                onChange={handleNestedNumberChange}
                min="0"
                max="50"
                className="w-32 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
              />
            </div>
            
            <div className="mt-4">
              <label 
                htmlFor="returnConditions" 
                className="block text-sm font-medium text-stone-700 mb-1"
              >
                Return Conditions
              </label>
              <textarea
                id="returnConditions"
                name="policies.returns.conditions"
                value={sellerData.policies.returns.conditions}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                placeholder="Describe any conditions for accepting returns"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rental Policy */}
      <div className="border-b border-stone-200 pb-6">
        <h3 className="text-lg font-medium mb-4">Rental Policy</h3>
        
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="minimumPeriod" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Minimum Rental Period (days)
            </label>
            <input
              type="number"
              id="minimumPeriod"
              name="policies.rental.minimumPeriod"
              value={sellerData.policies.rental.minimumPeriod}
              onChange={handleNestedNumberChange}
              min="1"
              max="30"
              className="w-32 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
            />
          </div>
          
          <div>
            <label 
              htmlFor="extensionPolicy" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Extension Policy
            </label>
            <select
              id="extensionPolicy"
              name="policies.rental.extensionPolicy"
              value={sellerData.policies.rental.extensionPolicy}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary bg-white"
            >
              <option value="flexible">Flexible - Easy to extend rental periods</option>
              <option value="moderate">Moderate - May extend depending on availability</option>
              <option value="strict">Strict - Extensions only in special circumstances</option>
            </select>
          </div>
          
          <ToggleSwitch
            id="deposit-required"
            checked={sellerData.policies.rental.depositRequired}
            onChange={() => handleToggleChange('policies.rental.depositRequired')}
            label="Require Security Deposit"
            description="Require a security deposit for tool rentals"
          />
          
          <div>
            <h4 className="text-sm font-medium text-stone-700 mb-2">Late Fees</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="lateFeePercentage" 
                  className="block text-xs text-stone-600 mb-1"
                >
                  Percentage of Rental Price
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    id="lateFeePercentage"
                    name="policies.rental.lateFees.percentage"
                    value={sellerData.policies.rental.lateFees.percentage}
                    onChange={handleNestedNumberChange}
                    min="0"
                    max="100"
                    className="w-20 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                  />
                  <span className="ml-2">%</span>
                </div>
              </div>
              
              <div>
                <label 
                  htmlFor="dailyRate" 
                  className="block text-xs text-stone-600 mb-1"
                >
                  Daily Rate ($)
                </label>
                <div className="flex items-center">
                  <span className="mr-2">$</span>
                  <input
                    type="number"
                    id="dailyRate"
                    name="policies.rental.lateFees.dailyRate"
                    value={sellerData.policies.rental.lateFees.dailyRate}
                    onChange={handleNestedNumberChange}
                    min="0"
                    className="w-20 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-3">
              <label 
                htmlFor="gracePeriod" 
                className="block text-xs text-stone-600 mb-1"
              >
                Grace Period (hours)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  id="gracePeriod"
                  name="policies.rental.lateFees.gracePeriod"
                  value={sellerData.policies.rental.lateFees.gracePeriod}
                  onChange={handleNestedNumberChange}
                  min="0"
                  max="72"
                  className="w-20 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                />
                <span className="ml-2">hours</span>
              </div>
            </div>
          </div>
          
          <div>
            <label 
              htmlFor="damagePolicy" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Damage Policy
            </label>
            <textarea
              id="damagePolicy"
              name="policies.rental.damagePolicy"
              value={sellerData.policies.rental.damagePolicy}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
              placeholder="Describe your policy for handling damaged tools"
            ></textarea>
          </div>
        </div>
      </div>
      
      {/* Tax Collection */}
      <div>
        <h3 className="text-lg font-medium mb-4">Tax Collection</h3>
        
        <ToggleSwitch
          id="collect-taxes"
          checked={sellerData.financial.collectTaxes}
          onChange={() => handleToggleChange('financial.collectTaxes')}
          label="Collect Sales Tax"
          description="Automatically calculate and collect applicable sales tax"
        />
        
        {sellerData.financial.collectTaxes && (
          <div className="ml-10 mt-3">
            <label 
              htmlFor="taxRate" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Default Tax Rate (%)
            </label>
            <div className="flex items-center">
              <input
                type="number"
                id="taxRate"
                name="financial.taxRate"
                value={sellerData.financial.taxRate}
                onChange={handleNestedNumberChange}
                min="0"
                step="0.1"
                max="20"
                className="w-20 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
              />
              <span className="ml-2">%</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              This is a default rate. Actual tax rates will be calculated based on location.
            </p>
          </div>
        )}
      </div>
    </div>
  );
  
  // Render Shipping tab
  const renderShippingTab = () => (
    <div className="space-y-6">
      <div className="border-b border-stone-200 pb-6">
        <h3 className="text-lg font-medium mb-4">Shipping Options</h3>
        
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="processingTime" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Processing Time (business days)
            </label>
            <input
              type="number"
              id="processingTime"
              name="policies.shipping.processingTime"
              value={sellerData.policies.shipping.processingTime}
              onChange={handleNestedNumberChange}
              min="1"
              max="10"
              className="w-32 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
            />
            <p className="text-xs text-stone-500 mt-1">
              Time needed to prepare and ship tools after an order is placed
            </p>
          </div>
          
          <div>
            <span className="block text-sm font-medium text-stone-700 mb-2">Shipping Methods Offered</span>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sellerData.policies.shipping.shippingMethods?.includes('standard')}
                  onChange={() => handleShippingMethodChange('standard')}
                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300 rounded"
                />
                <span className="ml-2 text-sm text-stone-700">Standard Shipping (3-5 business days)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sellerData.policies.shipping.shippingMethods?.includes('express')}
                  onChange={() => handleShippingMethodChange('express')}
                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300 rounded"
                />
                <span className="ml-2 text-sm text-stone-700">Express Shipping (1-2 business days)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sellerData.policies.shipping.shippingMethods?.includes('economy')}
                  onChange={() => handleShippingMethodChange('economy')}
                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300 rounded"
                />
                <span className="ml-2 text-sm text-stone-700">Economy Shipping (5-7 business days)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sellerData.policies.shipping.shippingMethods?.includes('freight')}
                  onChange={() => handleShippingMethodChange('freight')}
                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300 rounded"
                />
                <span className="ml-2 text-sm text-stone-700">Freight (for large equipment)</span>
              </label>
            </div>
          </div>
          
          <ToggleSwitch
            id="international-shipping"
            checked={sellerData.policies.shipping.internationalShipping}
            onChange={() => handleToggleChange('policies.shipping.internationalShipping')}
            label="Offer International Shipping"
            description="Ship to international addresses outside the United States"
          />
        </div>
      </div>
      
      <div className="border-b border-stone-200 pb-6">
        <h3 className="text-lg font-medium mb-4">Free Shipping</h3>
        
        <ToggleSwitch
          id="free-shipping"
          checked={sellerData.policies.shipping.offersFreeShipping}
          onChange={() => handleToggleChange('policies.shipping.offersFreeShipping')}
          label="Offer Free Shipping"
          description="Provide free shipping on qualifying orders"
        />
        
        {sellerData.policies.shipping.offersFreeShipping && (
          <div className="ml-10 mt-3">
            <label 
              htmlFor="freeShippingThreshold" 
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Free Shipping Threshold ($)
            </label>
            <div className="flex items-center">
              <span className="mr-2">$</span>
              <input
                type="number"
                id="freeShippingThreshold"
                name="policies.shipping.freeShippingThreshold"
                value={sellerData.policies.shipping.freeShippingThreshold}
                onChange={handleNestedNumberChange}
                min="0"
                step="5"
                className="w-32 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
              />
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Orders above this amount qualify for free shipping
            </p>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Local Pickup</h3>
        
        <ToggleSwitch
          id="local-pickup"
          checked={sellerData.offersLocalPickup}
          onChange={() => handleToggleChange('offersLocalPickup')}
          label="Offer Local Pickup"
          description="Allow customers to pick up tools directly from your location"
        />
        
        {sellerData.offersLocalPickup && (
          <div className="mt-3 bg-stone-50 p-4 rounded-lg border border-stone-200">
            <p className="text-sm text-stone-600">
              Customers will be able to see your general location (city/region) and arrange pickup details after purchasing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Seller Settings</h2>
        <p className="text-stone-600 text-sm mt-1">Manage your seller profile, policies, and preferences</p>
      </div>
      
      {!sellerData.stripeConnectComplete && (
        <div className="m-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <h3 className="font-medium text-amber-800">Complete Your Seller Onboarding</h3>
          <p className="text-sm text-amber-700 mt-1">
            You need to connect your payment account to start selling and receiving payments.
          </p>
          <button
            onClick={handleStripeConnect}
            className="mt-3 px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary"
          >
            Connect Payment Account
          </button>
        </div>
      )}
      
      <div className="p-6">
        {/* Status messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Seller settings saved successfully!
          </div>
        )}
        
        {/* Tabs */}
        <div className="border-b border-stone-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('business')}
              className={`pb-4 px-1 ${
                activeTab === 'business'
                  ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                  : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
              } flex items-center`}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Business Details
            </button>
            
            <button
              onClick={() => setActiveTab('policies')}
              className={`pb-4 px-1 ${
                activeTab === 'policies'
                  ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                  : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
              } flex items-center`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Store Policies
            </button>
            
            <button
              onClick={() => setActiveTab('shipping')}
              className={`pb-4 px-1 ${
                activeTab === 'shipping'
                  ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                  : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
              } flex items-center`}
            >
              <Truck className="h-4 w-4 mr-2" />
              Shipping & Pickup
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div>
          {activeTab === 'business' && renderBusinessDetailsTab()}
          {activeTab === 'policies' && renderStorePoliciesTab()}
          {activeTab === 'shipping' && renderShippingTab()}
        </div>
        
        {/* Save button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:ring-offset-2 flex items-center"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerSettings;