/**
 * NotificationSettings Component
 * Allows users to manage their notification preferences
 */
import React, { useState, useEffect } from 'react';
import { Bell, Check, Loader, AlertCircle, Mail, MessageSquare, ShoppingBag, Star, Calendar, Wrench } from 'lucide-react';
import { updateNotificationPreferences } from '../../firebase/models/userModel';

const NotificationSettings = ({ user }) => {
  // Default notification settings
  const defaultSettings = {
    email: {
      orders: true,
      messages: true,
      deals: false,
      wishlist: true,
      reminders: true,
      maintenance: false,
      newsletter: false
    },
    sms: {
      orders: false,
      messages: false,
      reminders: false
    },
    app: {
      orders: true,
      messages: true,
      wishlist: true,
      reminders: true
    }
  };
  
  // State
  const [notificationPrefs, setNotificationPrefs] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Load user's notification preferences
  useEffect(() => {
    if (user && user.profile && user.profile.preferences) {
      const { notifications } = user.profile.preferences || {};
      if (notifications) {
        setNotificationPrefs({
          email: { ...defaultSettings.email, ...notifications.email },
          sms: { ...defaultSettings.sms, ...notifications.sms },
          app: { ...defaultSettings.app, ...notifications.app }
        });
      }
    }
  }, [user]);
  
  // Handle toggle change
  const handleToggleChange = (channel, type) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: !prev[channel][type]
      }
    }));
  };
  
  // Save notification preferences
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await updateNotificationPreferences(user.uid, notificationPrefs);
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
      >
        <span 
          className={`inline-block w-5 h-5 transition duration-200 ease-in-out transform bg-white rounded-full shadow pointer-events-none ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`} 
        />
      </button>
      <span className="ml-3 text-sm text-stone-700">{label}</span>
    </div>
  );
  
  // Notification category row
  const NotificationCategory = ({ icon, title, description, emailKey, smsKey, appKey }) => {
    const Icon = icon;
    
    return (
      <div className="py-5 border-b border-stone-200 last:border-b-0">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-stone-800">{title}</h3>
            <p className="text-xs text-stone-500 mt-1">{description}</p>
          </div>
        </div>
        
        <div className="ml-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ToggleSwitch
            checked={notificationPrefs.email[emailKey]}
            onChange={() => handleToggleChange('email', emailKey)}
            label="Email"
          />
          
          {smsKey && (
            <ToggleSwitch
              checked={notificationPrefs.sms[smsKey]}
              onChange={() => handleToggleChange('sms', smsKey)}
              label="SMS"
            />
          )}
          
          {appKey && (
            <ToggleSwitch
              checked={notificationPrefs.app[appKey]}
              onChange={() => handleToggleChange('app', appKey)}
              label="App"
            />
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Notification Preferences</h2>
        <p className="text-stone-600 text-sm mt-1">Manage how you receive updates and alerts</p>
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
        
        {/* Section headers */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 mb-2 mt-2">
          <div></div>
          <div className="text-xs font-medium text-stone-500">EMAIL</div>
          <div className="text-xs font-medium text-stone-500">SMS</div>
          <div className="text-xs font-medium text-stone-500">APP</div>
        </div>
        
        {/* Categories */}
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <NotificationCategory
            icon={ShoppingBag}
            title="Order Updates"
            description="Get notified about order status changes and rental updates"
            emailKey="orders"
            smsKey="orders"
            appKey="orders"
          />
          
          <NotificationCategory
            icon={MessageSquare}
            title="Messages"
            description="Receive notifications when someone sends you a message"
            emailKey="messages"
            smsKey="messages"
            appKey="messages"
          />
          
          <NotificationCategory
            icon={Calendar}
            title="Rental Reminders"
            description="Reminders about upcoming returns and rental expirations"
            emailKey="reminders"
            smsKey="reminders"
            appKey="reminders"
          />
          
          <NotificationCategory
            icon={Star}
            title="Wishlist"
            description="Get notified when items in your wishlist change price or availability"
            emailKey="wishlist"
            smsKey={null}
            appKey="wishlist"
          />
          
          <NotificationCategory
            icon={Wrench}
            title="Maintenance Reminders"
            description="Tool maintenance recommendations and safety tips"
            emailKey="maintenance"
            smsKey={null}
            appKey={null}
          />
          
          <NotificationCategory
            icon={Mail}
            title="Deals & Newsletter"
            description="Special promotions, new features, and community news"
            emailKey="newsletter"
            smsKey={null}
            appKey={null}
          />
        </div>
        
        <div className="mt-6">
          <p className="text-sm text-stone-500 mb-6">
            You can unsubscribe from email notifications at any time by clicking the unsubscribe link in any email. Message & data rates may apply for SMS notifications.
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