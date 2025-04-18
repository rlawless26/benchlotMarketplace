/**
 * PrivacySettings Component
 * Allows users to manage their privacy settings
 */
import React, { useState, useEffect } from 'react';
import { Shield, Check, Loader, AlertCircle, Eye, Lock, MapPin, Star, Clock } from 'lucide-react';
import { updatePrivacySettings } from '../../firebase/models/userModel';

const PrivacySettings = ({ user }) => {
  // Default privacy settings
  const defaultSettings = {
    profileVisibility: 'registered',
    locationPrecision: 'city',
    searchIndexing: true
  };
  
  // State
  const [privacySettings, setPrivacySettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Load user's privacy settings
  useEffect(() => {
    if (user && user.profile && user.profile.preferences) {
      const { privacy } = user.profile.preferences || {};
      if (privacy) {
        setPrivacySettings({
          ...defaultSettings,
          ...privacy
        });
      }
    }
  }, [user]);
  
  // Handle setting changes
  const handleChange = (setting, value) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  // Save privacy settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await updatePrivacySettings(user.uid, privacySettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving privacy settings:', err);
      setError(err.message || 'Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Toggle Switch component
  const ToggleSwitch = ({ checked, onChange, label, description }) => (
    <div className="flex items-start py-4 border-b border-stone-200 last:border-b-0">
      <div className="flex-shrink-0 mt-1">
        <button
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
        <h3 className="text-sm font-medium text-stone-800">{label}</h3>
        <p className="text-xs text-stone-500 mt-1">{description}</p>
      </div>
    </div>
  );
  
  // Radio Button Group component
  const RadioButtonGroup = ({ title, description, name, options, value, onChange, icon }) => {
    const Icon = icon;
    
    return (
      <div className="py-4 border-b border-stone-200 last:border-b-0">
        <div className="flex items-start mb-3">
          {icon && (
            <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className={icon ? "ml-3" : ""}>
            <h3 className="text-sm font-medium text-stone-800">{title}</h3>
            <p className="text-xs text-stone-500 mt-1">{description}</p>
          </div>
        </div>
        
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${icon ? "ml-10" : ""}`}>
          {options.map(option => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                className="h-4 w-4 text-benchlot-primary border-stone-300 focus:ring-benchlot-primary"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(name, option.value)}
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-stone-700">{option.label}</span>
                {option.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{option.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Privacy Settings</h2>
        <p className="text-stone-600 text-sm mt-1">Control your privacy and visibility preferences</p>
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
            Privacy settings saved successfully!
          </div>
        )}
        
        {/* Privacy Settings */}
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden mb-6 p-4">
          <RadioButtonGroup
            title="Profile Visibility"
            description="Control who can view your profile information"
            name="profileVisibility"
            icon={Eye}
            value={privacySettings.profileVisibility}
            onChange={handleChange}
            options={[
              {
                value: 'public',
                label: 'Public',
                description: 'Anyone can view your profile'
              },
              {
                value: 'registered',
                label: 'Registered Users',
                description: 'Only registered users can view your profile'
              },
              {
                value: 'private',
                label: 'Private',
                description: 'Only users you have transacted with can view your profile'
              }
            ]}
          />
          
          <RadioButtonGroup
            title="Location Precision"
            description="Control how precisely your location is shown to others"
            name="locationPrecision"
            icon={MapPin}
            value={privacySettings.locationPrecision}
            onChange={handleChange}
            options={[
              {
                value: 'exact',
                label: 'Exact Location',
                description: 'Show your precise location for easier coordination'
              },
              {
                value: 'city',
                label: 'City Only',
                description: 'Only show your city and state'
              },
              {
                value: 'region',
                label: 'Region Only',
                description: 'Only show your general area or region'
              },
              {
                value: 'hidden',
                label: 'Hidden',
                description: 'Do not show your location to others'
              }
            ]}
          />
          
          <ToggleSwitch
            checked={privacySettings.searchIndexing}
            onChange={() => handleChange('searchIndexing', !privacySettings.searchIndexing)}
            label="Search Engine Indexing"
            description="Allow search engines like Google to index your profile and listings"
          />
        </div>
        
        {/* Data & Privacy Info */}
        <div className="bg-stone-50 p-5 rounded-lg border border-stone-200 mb-6">
          <div className="flex">
            <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-stone-800 mb-2">Your Data</h3>
              <p className="text-xs text-stone-500 mb-3">
                You can request a copy of your data or delete your account at any time. Please note that deleting your account will permanently remove all your data from our platform.
              </p>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs border border-benchlot-primary text-benchlot-primary rounded hover:bg-benchlot-accent-light"
                >
                  Request Data Export
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                >
                  Delete Account
                </button>
              </div>
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
            ) : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;