/**
 * BusinessDetailsSettings Component
 *
 * Seller-only settings tab for managing business identity and contact
 * information. Appears in the unified Settings page when the user is a seller.
 *
 * Fields: business name, type, description, contact email, phone,
 * preferred contact method.
 */
import React, { useState, useEffect } from 'react';
import { Check, Loader, AlertCircle, ChevronDown } from 'lucide-react';
import { updateSellerSettings } from '../../firebase/models/userModel';

const BusinessDetailsSettings = ({ user }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'individual',
    businessDescription: '',
    contactEmail: '',
    contactPhone: '',
    preferredContactMethod: 'email',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Initialize from user data
  useEffect(() => {
    if (user) {
      const seller = user.profile?.seller || user.seller || {};
      setFormData({
        businessName: seller.businessName || user.sellerName || '',
        businessType: seller.businessType || user.sellerType || 'individual',
        businessDescription: seller.businessDescription || user.sellerBio || '',
        contactEmail: seller.contactEmail || user.contactEmail || user.email || '',
        contactPhone: seller.contactPhone || user.contactPhone || '',
        preferredContactMethod: seller.preferredContactMethod || 'email',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSellerSettings(user.uid, formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving business details:', err);
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-medium text-stone-800">Business Details</h2>
        <p className="text-stone-600 text-sm mt-1">
          Manage your seller profile and contact information
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-spruce px-4 py-3 rounded-md mb-6 flex items-center">
          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
          <span>Settings saved.</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-stone-700 mb-1">
            Business Name
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            placeholder="Your business or shop name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
          />
        </div>

        {/* Business Type */}
        <div>
          <label htmlFor="businessType" className="block text-sm font-medium text-stone-700 mb-1">
            Business Type
          </label>
          <div className="relative">
            <select
              id="businessType"
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              className="w-full appearance-none px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:border-spruce bg-white"
            >
              <option value="individual">Individual / Sole Proprietor</option>
              <option value="professional">Professional</option>
              <option value="company">Company</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Business Description */}
        <div>
          <label htmlFor="businessDescription" className="block text-sm font-medium text-stone-700 mb-1">
            Business Description
          </label>
          <textarea
            id="businessDescription"
            name="businessDescription"
            value={formData.businessDescription}
            onChange={handleChange}
            rows={4}
            placeholder="Describe your business, expertise, and the types of tools you offer"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
          />
        </div>

        {/* Contact Information */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-stone-800 mb-4">Contact Information</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-stone-700 mb-1">
                Business Contact Email
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="Your business email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-stone-700 mb-1">
                Business Phone Number
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="Your business phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Preferred Contact Method
              </label>
              <div className="flex gap-6">
                {['email', 'phone', 'message'].map((method) => (
                  <label key={method} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="preferredContactMethod"
                      value={method}
                      checked={formData.preferredContactMethod === method}
                      onChange={handleChange}
                      className="mr-2 text-spruce focus:ring-spruce"
                    />
                    <span className="text-sm text-stone-700 capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-honey text-dark-teal rounded-md font-medium hover:bg-honey-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessDetailsSettings;
