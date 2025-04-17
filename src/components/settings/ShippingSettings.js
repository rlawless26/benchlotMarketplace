/**
 * ShippingSettings Component
 * Allows users to manage their shipping preferences
 */
import React, { useState, useEffect } from 'react';
import { Truck, Check, Loader, AlertCircle, MapPin, Package, Clock } from 'lucide-react';
import { updateShippingPreferences } from '../../firebase/models/userModel';

const ShippingSettings = ({ user }) => {
  // Default shipping preferences
  const defaultPreferences = {
    preferredShipping: 'standard',
    acceptLocalPickup: true,
    autoCalculateShipping: true,
    consolidateOrders: true,
    contactBeforeShipping: false,
    packageRecycling: false
  };
  
  // State
  const [shippingPrefs, setShippingPrefs] = useState(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Load user's shipping preferences
  useEffect(() => {
    if (user && user.profile && user.profile.preferences) {
      const { shipping } = user.profile.preferences || {};
      if (shipping) {
        setShippingPrefs({
          ...defaultPreferences,
          ...shipping
        });
      }
    }
  }, [user]);
  
  // Handle toggle change
  const handleToggleChange = (setting) => {
    setShippingPrefs(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  // Handle radio button change
  const handleRadioChange = (event) => {
    const { name, value } = event.target;
    setShippingPrefs(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Save shipping preferences
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await updateShippingPreferences(user.uid, shippingPrefs);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving shipping preferences:', err);
      setError(err.message || 'Failed to save shipping preferences');
    } finally {
      setSaving(false);
    }
  };
  
  // Toggle Switch component
  const ToggleSwitch = ({ id, checked, onChange, label, description }) => (
    <div className="flex items-start py-4 border-b border-stone-200 last:border-b-0">
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
  
  // Radio option component
  const RadioOption = ({ id, name, value, currentValue, onChange, label, description }) => (
    <label htmlFor={id} className="flex items-start p-3 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-50">
      <div className="flex h-5 items-center">
        <input
          id={id}
          name={name}
          type="radio"
          value={value}
          checked={currentValue === value}
          onChange={onChange}
          className="h-4 w-4 border-stone-300 text-benchlot-primary focus:ring-benchlot-primary"
        />
      </div>
      <div className="ml-3 text-sm">
        <span className="font-medium text-stone-800">{label}</span>
        {description && <p className="text-stone-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Shipping Preferences</h2>
        <p className="text-stone-600 text-sm mt-1">Manage your shipping and delivery preferences</p>
      </div>
      
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
            Shipping preferences saved successfully!
          </div>
        )}
        
        {/* Preferred Shipping Method */}
        <div className="mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-stone-800">Preferred Shipping Method</h3>
              <p className="text-xs text-stone-500 mt-1">Choose your default shipping method for tool orders</p>
            </div>
          </div>
          
          <div className="ml-10 space-y-3">
            <RadioOption
              id="shipping-standard"
              name="preferredShipping"
              value="standard"
              currentValue={shippingPrefs.preferredShipping}
              onChange={handleRadioChange}
              label="Standard Shipping"
              description="Regular delivery time, typically 3-5 business days"
            />
            
            <RadioOption
              id="shipping-express"
              name="preferredShipping"
              value="express"
              currentValue={shippingPrefs.preferredShipping}
              onChange={handleRadioChange}
              label="Express Shipping"
              description="Faster delivery, typically 1-2 business days"
            />
            
            <RadioOption
              id="shipping-economy"
              name="preferredShipping"
              value="economy"
              currentValue={shippingPrefs.preferredShipping}
              onChange={handleRadioChange}
              label="Economy Shipping"
              description="Slower delivery, but more cost-effective"
            />
          </div>
        </div>
        
        {/* Shipping Toggles */}
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden mb-6 p-4">
          <ToggleSwitch
            id="accept-local-pickup"
            checked={shippingPrefs.acceptLocalPickup}
            onChange={() => handleToggleChange('acceptLocalPickup')}
            label="Enable Local Pickup"
            description="Allow the option to pick up tools in person when available (often reduces costs)"
          />
          
          <ToggleSwitch
            id="auto-calculate"
            checked={shippingPrefs.autoCalculateShipping}
            onChange={() => handleToggleChange('autoCalculateShipping')}
            label="Auto-calculate Shipping"
            description="Automatically calculate shipping costs based on your address and tool location"
          />
          
          <ToggleSwitch
            id="consolidate-orders"
            checked={shippingPrefs.consolidateOrders}
            onChange={() => handleToggleChange('consolidateOrders')}
            label="Consolidate Orders"
            description="Combine multiple items from the same seller to reduce shipping costs"
          />
          
          <ToggleSwitch
            id="contact-before-shipping"
            checked={shippingPrefs.contactBeforeShipping}
            onChange={() => handleToggleChange('contactBeforeShipping')}
            label="Contact Before Shipping"
            description="Sellers will contact you before shipping to confirm details"
          />
          
          <ToggleSwitch
            id="package-recycling"
            checked={shippingPrefs.packageRecycling}
            onChange={() => handleToggleChange('packageRecycling')}
            label="Package Recycling Program"
            description="Opt into our packaging recycling program to reduce waste"
          />
        </div>
        
        {/* Shipping Information */}
        <div className="bg-stone-50 p-5 rounded-lg border border-stone-200 mb-6">
          <div className="flex">
            <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
              <Package className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-stone-800">Tool Shipping Information</h3>
              <p className="text-xs text-stone-500 mt-1">
                Tools and equipment are shipped following strict packaging guidelines to ensure safe delivery. Rental tools must be returned using the provided return label and packaging.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
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
            ) : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShippingSettings;