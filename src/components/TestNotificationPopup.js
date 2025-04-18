import React, { useState, useEffect } from 'react';
import { X, Bell, MessageSquare } from 'lucide-react';

/**
 * Self-contained test notification popup component
 * that doesn't depend on React Router
 */
const TestNotificationPopup = ({ 
  title, 
  message, 
  type = 'message',
  duration = 8000, // Longer duration to give users more time
  onClose,
  onView = () => window.open('/messages', '_self') // Default navigation function
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-close the notification after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'message':
      case 'offer':
        return <MessageSquare className="h-5 w-5 text-benchlot-primary" />;
      default:
        return <Bell className="h-5 w-5 text-benchlot-primary" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-xl border border-benchlot-accent overflow-hidden animate-slideIn">
      {/* Attention-grabbing pulse effect */}
      <div className="absolute inset-0 bg-benchlot-accent-light opacity-0 animate-pulse"></div>
      
      <div className="px-4 py-4 flex items-start relative">
        <div className="mr-3 mt-0.5 bg-benchlot-accent-light p-1.5 rounded-full">
          {getIcon()}
        </div>
        <div className="flex-1 pr-6">
          <h4 className="text-sm font-medium text-stone-800">{title}</h4>
          <p className="text-xs text-stone-500 mt-1">{message}</p>
          
          <div className="mt-3 flex gap-2">
            {/* View button - primary action */}
            <button 
              onClick={() => {
                setIsVisible(false);
                if (onClose) onClose();
                onView();
              }} 
              className="text-xs bg-benchlot-primary text-white px-3 py-1.5 rounded-md font-medium hover:bg-benchlot-secondary transition-colors flex-1"
            >
              View Message
            </button>
            
            {/* Dismiss button - secondary action */}
            <button 
              onClick={() => {
                setIsVisible(false);
                if (onClose) onClose();
              }} 
              className="text-xs text-stone-500 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button 
          className="absolute top-3 right-3 text-stone-400 hover:text-stone-600"
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Time indicator with slower animation and more visible styling */}
      <div className="h-1.5 bg-stone-200">
        <div 
          className="h-full bg-benchlot-primary transition-all ease-linear" 
          style={{ 
            width: '100%',
            animation: `shrink ${duration}ms linear forwards`
          }}
        />
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
          0% { opacity: 0; }
          50% { opacity: 0.1; }
          100% { opacity: 0; }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
        
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TestNotificationPopup;