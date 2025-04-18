/**
 * ShippingSettings Component
 * Allows users to manage their shipping preferences
 */
import React, { useState, useEffect } from 'react';
import { Truck, Check, Loader, AlertCircle, MapPin, Package, Clock } from 'lucide-react';
import { updateSellerSettings } from '../../firebase/models/userModel';

const ShippingSettings = ({ user }) => {
  // Default shipping preferences for sellers
  const defaultPreferences = {
    offersFreeShipping: false,
    freeShippingThreshold: 100,
    processingTime: 1,
    shippingMethods: ['standard', 'express'],
    offerLocalPickup: true,
    requireConfirmation: false,
    defaultShippingPrice: 15,
    internationalShipping: false
  };
  
  // State
  const [shippingPrefs, setShippingPrefs] = useState(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Load seller's shipping preferences
  useEffect(() => {
    if (user && user.seller && user.seller.policies && user.seller.policies.shipping) {
      setShippingPrefs({
        ...defaultPreferences,
        ...user.seller.policies.shipping
      });
    } else if (user && user.profile && user.profile.seller && user.profile.seller.policies && user.profile.seller.policies.shipping) {
      setShippingPrefs({
        ...defaultPreferences,
        ...user.profile.seller.policies.shipping
      });
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
  
  // Save seller shipping preferences
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // We'll use updateSellerSettings to update just the shipping portion
      await updateSellerSettings(user.uid, { 
        policies: { 
          shipping: shippingPrefs 
        } 
      });
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
        <h2 className="text-xl font-medium text-stone-800">Seller Shipping Settings</h2>
        <p className="text-stone-600 text-sm mt-1">Configure your shipping options for buyers</p>
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
        
        {/* Shipping Methods Section */}
        <div className="mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-stone-800">Shipping Methods</h3>
              <p className="text-xs text-stone-500 mt-1">Select the shipping options you offer to buyers</p>
            </div>
          </div>
          
          <div className="ml-10 space-y-4">
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
              <h4 className="font-medium mb-3">Available Shipping Methods</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="method-standard"
                    type="checkbox"
                    className="h-4 w-4 text-benchlot-primary border-stone-300 rounded focus:ring-benchlot-primary"
                    checked={shippingPrefs.shippingMethods.includes('standard')}
                    onChange={() => {
                      const methods = [...shippingPrefs.shippingMethods];
                      if (methods.includes('standard')) {
                        setShippingPrefs({...shippingPrefs, shippingMethods: methods.filter(m => m !== 'standard')});
                      } else {
                        setShippingPrefs({...shippingPrefs, shippingMethods: [...methods, 'standard']});
                      }
                    }}
                  />
                  <label htmlFor="method-standard" className="ml-2 block text-sm">
                    <span className="font-medium text-stone-700">Standard Shipping</span>
                    <p className="text-xs text-stone-500">Regular delivery (3-5 business days)</p>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="method-express"
                    type="checkbox"
                    className="h-4 w-4 text-benchlot-primary border-stone-300 rounded focus:ring-benchlot-primary"
                    checked={shippingPrefs.shippingMethods.includes('express')}
                    onChange={() => {
                      const methods = [...shippingPrefs.shippingMethods];
                      if (methods.includes('express')) {
                        setShippingPrefs({...shippingPrefs, shippingMethods: methods.filter(m => m !== 'express')});
                      } else {
                        setShippingPrefs({...shippingPrefs, shippingMethods: [...methods, 'express']});
                      }
                    }}
                  />
                  <label htmlFor="method-express" className="ml-2 block text-sm">
                    <span className="font-medium text-stone-700">Express Shipping</span>
                    <p className="text-xs text-stone-500">Faster delivery (1-2 business days)</p>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="method-economy"
                    type="checkbox"
                    className="h-4 w-4 text-benchlot-primary border-stone-300 rounded focus:ring-benchlot-primary"
                    checked={shippingPrefs.shippingMethods.includes('economy')}
                    onChange={() => {
                      const methods = [...shippingPrefs.shippingMethods];
                      if (methods.includes('economy')) {
                        setShippingPrefs({...shippingPrefs, shippingMethods: methods.filter(m => m !== 'economy')});
                      } else {
                        setShippingPrefs({...shippingPrefs, shippingMethods: [...methods, 'economy']});
                      }
                    }}
                  />
                  <label htmlFor="method-economy" className="ml-2 block text-sm">
                    <span className="font-medium text-stone-700">Economy Shipping</span>
                    <p className="text-xs text-stone-500">Budget-friendly (5-7 business days)</p>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-stone-200 rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Default Shipping Price</h4>
                <div className="flex items-center">
                  <span className="text-stone-600 mr-2">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border-stone-300 focus:ring-benchlot-primary focus:border-benchlot-primary block w-full sm:text-sm rounded-md"
                    value={shippingPrefs.defaultShippingPrice}
                    onChange={(e) => setShippingPrefs({...shippingPrefs, defaultShippingPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <p className="text-xs text-stone-500 mt-1">Applied when no specific price is set</p>
              </div>
              
              <div className="p-4 bg-white border border-stone-200 rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Processing Time (Days)</h4>
                <input
                  type="number"
                  min="0"
                  className="border-stone-300 focus:ring-benchlot-primary focus:border-benchlot-primary block w-full sm:text-sm rounded-md"
                  value={shippingPrefs.processingTime}
                  onChange={(e) => setShippingPrefs({...shippingPrefs, processingTime: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-stone-500 mt-1">Days to prepare before shipping</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Free Shipping Options */}
        <div className="mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
              <Package className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-stone-800">Free Shipping Options</h3>
              <p className="text-xs text-stone-500 mt-1">Configure free shipping offers for your buyers</p>
            </div>
          </div>
          
          <div className="ml-10 bg-white border border-stone-200 rounded-lg overflow-hidden p-4">
            <ToggleSwitch
              id="offers-free-shipping"
              checked={shippingPrefs.offersFreeShipping}
              onChange={() => setShippingPrefs({...shippingPrefs, offersFreeShipping: !shippingPrefs.offersFreeShipping})}
              label="Offer Free Shipping"
              description="Provide free shipping on orders that meet the threshold"
            />
            
            {shippingPrefs.offersFreeShipping && (
              <div className="ml-9 mt-2 mb-4">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-md">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Free Shipping Threshold ($)
                  </label>
                  <div className="flex items-center">
                    <span className="text-stone-600 mr-2">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="border-stone-300 focus:ring-benchlot-primary focus:border-benchlot-primary block w-full sm:text-sm rounded-md"
                      value={shippingPrefs.freeShippingThreshold}
                      onChange={(e) => setShippingPrefs({...shippingPrefs, freeShippingThreshold: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-1">Orders above this amount qualify for free shipping</p>
                </div>
              </div>
            )}
            
            <ToggleSwitch
              id="offer-local-pickup"
              checked={shippingPrefs.offerLocalPickup}
              onChange={() => setShippingPrefs({...shippingPrefs, offerLocalPickup: !shippingPrefs.offerLocalPickup})}
              label="Offer Local Pickup"
              description="Allow buyers to pick up items in person (no shipping)"
            />
            
            <ToggleSwitch
              id="international-shipping"
              checked={shippingPrefs.internationalShipping}
              onChange={() => setShippingPrefs({...shippingPrefs, internationalShipping: !shippingPrefs.internationalShipping})}
              label="Offer International Shipping"
              description="Ship to international addresses (additional costs may apply)"
            />
            
            <ToggleSwitch
              id="require-confirmation"
              checked={shippingPrefs.requireConfirmation}
              onChange={() => setShippingPrefs({...shippingPrefs, requireConfirmation: !shippingPrefs.requireConfirmation})}
              label="Require Shipping Confirmation"
              description="Review and confirm shipping details before sending items"
            />
          </div>
        </div>
        
        {/* Shipping Policy Information */}
        <div className="bg-stone-50 p-5 rounded-lg border border-stone-200 mb-6">
          <div className="flex">
            <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-stone-800">Shipping Policies</h3>
              <p className="text-xs text-stone-500 mt-1">
                These settings will be applied as your default shipping options for all your tools. You can override these settings for specific listings when creating or editing a tool.
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