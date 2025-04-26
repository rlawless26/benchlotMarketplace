/**
 * NotificationSettings Component
 * Allows users to manage their email notification preferences
 */
import React, { useState, useEffect } from 'react';
import { Check, Loader, AlertCircle, MessageSquare, ShoppingBag, Star, Bell, Tag, Info } from 'lucide-react';
import { updateNotificationPreferences } from '../../firebase/models/userModel';

const NotificationSettings = ({ user }) => {
  // Default notification settings
  const defaultSettings = {
    email: {
      transactions: true,     // Critical - Order confirmations, payments, shipping updates
      messages: true,         // Important - Messages & offer notifications
      listings: true,         // Important - Listing status updates, expirations
      reviews: true,          // Optional - Review requests & responses
      account: true,          // Critical - Account security & policy updates 
      marketing: false        // Optional - Marketing emails, newsletters, promotions
    }
  };
  
  // Critical notifications that cannot be disabled
  const CRITICAL_NOTIFICATIONS = ['transactions', 'account'];
  
  // State
  const [notificationPrefs, setNotificationPrefs] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Load user's notification preferences
  useEffect(() => {
    if (user && user.profile && user.profile.preferences) {
      const { notifications } = user.profile.preferences || {};
      if (notifications && notifications.email) {
        // Ensure critical notifications are always on
        const emailPrefs = { ...notifications.email };
        CRITICAL_NOTIFICATIONS.forEach(key => {
          emailPrefs[key] = true;
        });
        
        setNotificationPrefs({
          email: { ...defaultSettings.email, ...emailPrefs }
        });
      }
    }
  }, [user]);
  
  // Handle toggle change
  const handleToggleChange = (type) => {
    // Prevent toggling critical notifications
    if (CRITICAL_NOTIFICATIONS.includes(type)) {
      return;
    }
    
    setNotificationPrefs(prev => ({
      ...prev,
      email: {
        ...prev.email,
        [type]: !prev.email[type]
      }
    }));
  };
  
  // Save notification preferences
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Ensure critical notifications are always on
      const prefsToSave = { ...notificationPrefs };
      CRITICAL_NOTIFICATIONS.forEach(key => {
        prefsToSave.email[key] = true;
      });
      
      await updateNotificationPreferences(user.uid, prefsToSave);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError(err.message || 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };
  
  // Toggle Switch component
  const ToggleSwitch = ({ checked, onChange, label, disabled = false }) => (
    <div className="flex items-center">
      <button
        type="button"
        className={`relative inline-flex flex-shrink-0 h-6 transition-colors duration-200 ease-in-out border-2 border-transparent rounded-full cursor-pointer w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${checked ? 'bg-benchlot-primary' : 'bg-stone-200'}`}
        role="switch"
        aria-checked={checked}
        onClick={disabled ? undefined : onChange}
        disabled={disabled}
      >
        <span 
          className={`inline-block w-5 h-5 transition duration-200 ease-in-out transform bg-white rounded-full shadow pointer-events-none ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`} 
        />
      </button>
      <span className={`ml-3 text-sm ${disabled ? 'text-stone-500' : 'text-stone-700'}`}>
        {label}
        {disabled && <span className="text-xs ml-1 text-benchlot-primary font-medium">(Required)</span>}
      </span>
    </div>
  );
  
  // Notification category row
  const NotificationCategory = ({ icon, title, description, emailKey, required = false }) => {
    const Icon = icon;
    
    return (
      <div className="py-5 border-b border-stone-200 last:border-b-0">
        <div className="flex items-start mb-4">
          <div className={`flex-shrink-0 p-1.5 rounded-full ${required ? 'bg-benchlot-primary bg-opacity-20 text-benchlot-primary' : 'bg-benchlot-accent-light text-benchlot-primary'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-stone-800 flex items-center">
              {title}
              {required && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-benchlot-primary text-white">
                  Required
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-500 mt-1">{description}</p>
          </div>
        </div>
        
        <div className="ml-10">
          <ToggleSwitch
            checked={notificationPrefs.email[emailKey]}
            onChange={() => handleToggleChange(emailKey)}
            label="Email Notifications"
            disabled={required}
          />
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Email Notification Settings</h2>
        <p className="text-stone-600 text-sm mt-1">Choose which email notifications you'd like to receive</p>
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
            Notification preferences saved successfully!
          </div>
        )}
        
        {/* Info message */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mb-6 flex items-start">
          <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm">Some notifications are required for the marketplace to function properly and cannot be disabled.</p>
            <p className="text-xs mt-1">These include order confirmations, payment receipts, shipping updates, and account security alerts.</p>
          </div>
        </div>
        
        {/* Categories */}
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden p-4">
          <NotificationCategory
            icon={ShoppingBag}
            title="Transaction Notifications"
            description="Order confirmations, payment receipts, shipping updates, delivery confirmations"
            emailKey="transactions"
            required={true}
          />
          
          <NotificationCategory
            icon={MessageSquare}
            title="Messages & Offers"
            description="Notifications when someone sends you a message or makes an offer on your listings"
            emailKey="messages"
          />
          
          <NotificationCategory
            icon={Tag}
            title="Listing Notifications"
            description="Updates about your listings including expiration reminders and status changes"
            emailKey="listings"
          />
          
          <NotificationCategory
            icon={Star}
            title="Reviews & Feedback"
            description="Review requests, feedback on your listings, and responses to your reviews"
            emailKey="reviews"
          />
          
          <NotificationCategory
            icon={Bell}
            title="Account Notifications"
            description="Important account updates, security alerts, and policy changes"
            emailKey="account"
            required={true}
          />
          
          <NotificationCategory
            icon={Info}
            title="Marketing & Newsletters"
            description="Special promotions, new features, and marketplace news and updates"
            emailKey="marketing"
          />
        </div>
        
        <div className="mt-6">
          <p className="text-sm text-stone-500 mb-6">
            All marketing emails include an unsubscribe link at the bottom that you can use at any time.
          </p>
          
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
    </div>
  );
};

export default NotificationSettings;