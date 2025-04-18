import React, { useState } from 'react';
import { Bell, Loader } from 'lucide-react';
import { triggerTestNotification } from '../firebase/models/notificationUtils';
import { useAuth } from '../firebase/hooks/useAuth';
import TestNotificationPopup from './TestNotificationPopup';

/**
 * Test Notification Button
 * Utility component for testing the notification system during development
 */
const TestNotificationButton = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [mockNotification, setMockNotification] = useState(null);

  const handleTestNotification = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    setShowPopup(false);
    
    try {
      const mockData = await triggerTestNotification(user.uid);
      
      // Store the mock notification data
      setMockNotification(mockData);
      
      // Show the popup
      setShowPopup(true);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error triggering test notification:', err);
      setError(err.message || 'Could not trigger test notification');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <button
        onClick={handleTestNotification}
        disabled={loading}
        className="bg-stone-800 text-white px-3 py-2 rounded-md shadow-lg hover:bg-stone-700 flex items-center text-sm"
      >
        {loading ? (
          <Loader className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Bell className="h-4 w-4 mr-2" />
        )}
        {success ? 'Notification sent!' : 'Test Notification'}
      </button>
      {error && (
        <div className="mt-2 bg-red-100 text-red-700 text-xs py-1 px-2 rounded">
          {error}
        </div>
      )}
      
      {/* Show test notification popup */}
      {showPopup && mockNotification && (
        <TestNotificationPopup
          title={`New message about ${mockNotification.toolTitle}`}
          message="This is a test notification message"
          type="message"
          onClose={() => setShowPopup(false)}
          onView={() => {
            // In a real app, this would navigate to a specific message
            window.location.href = '/messages';
          }}
        />
      )}
    </div>
  );
};

export default TestNotificationButton;