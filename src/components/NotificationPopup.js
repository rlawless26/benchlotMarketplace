import React, { useState, useEffect } from 'react';
import { X, Bell, MessageSquare, ShoppingCart, Check } from 'lucide-react';

/**
 * NotificationPopup Component
 * Shows a notification toast at the bottom right of the screen
 */
const NotificationPopup = ({ 
  title, 
  message, 
  type = 'message', // message, offer, system, cart
  link = '/messages',
  duration = 8000, // Longer duration to give users more time
  image = null, // For cart notifications
  price = null, // For cart notifications
  onClose 
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

  const formatPrice = (amount) => {
    if (!amount && amount !== 0) return '$0';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getIcon = () => {
    switch (type) {
      case 'message':
      case 'offer':
        return <MessageSquare className="h-5 w-5 text-benchlot-primary" />;
      case 'cart':
        return <ShoppingCart className="h-5 w-5 text-benchlot-primary" />;
      default:
        return <Bell className="h-5 w-5 text-benchlot-primary" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-xl border border-benchlot-accent overflow-hidden animate-slideIn">
      {/* Attention-grabbing pulse effect */}
      <div className="absolute inset-0 bg-benchlot-accent-light opacity-0 animate-pulse"></div>
      
      {type === 'cart' ? (
        // Cart notification layout
        <div className="px-4 py-4 flex items-start relative">
          {/* Product image if available */}
          {image && (
            <div className="mr-3 w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border border-stone-200">
              <img 
                src={image} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* If no image, show the icon */}
          {!image && (
            <div className="mr-3 mt-0.5 bg-benchlot-accent-light p-1.5 rounded-full">
              <Check className="h-5 w-5 text-green-600" />
            </div>
          )}
          
          <div className="flex-1 pr-6">
            <h4 className="text-sm font-medium text-green-600">{title}</h4>
            <p className="text-xs text-stone-500 mt-1">{message}</p>
            
            {price && (
              <div className="mt-1 text-sm font-medium text-benchlot-primary">
                {formatPrice(price)}
              </div>
            )}
            
            <div className="mt-3 flex gap-2">
              {/* View Cart button - primary action */}
              <a 
                href="/cart"
                onClick={(e) => {
                  e.preventDefault();
                  setIsVisible(false);
                  if (onClose) onClose();
                  window.location.href = '/cart';
                }} 
                className="text-xs bg-benchlot-primary text-white px-3 py-1.5 rounded-md font-medium hover:bg-benchlot-secondary transition-colors flex-1 text-center"
              >
                View Cart
              </a>
              
              {/* Continue Shopping button - secondary action */}
              <button 
                onClick={() => {
                  setIsVisible(false);
                  if (onClose) onClose();
                }} 
                className="text-xs text-stone-500 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
              >
                Continue Shopping
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
      ) : (
        // Default notification layout
        <div className="px-4 py-4 flex items-start relative">
          <div className="mr-3 mt-0.5 bg-benchlot-accent-light p-1.5 rounded-full">
            {getIcon()}
          </div>
          <div className="flex-1 pr-6">
            <h4 className="text-sm font-medium text-stone-800">{title}</h4>
            <p className="text-xs text-stone-500 mt-1">{message}</p>
            
            <div className="mt-3 flex gap-2">
              {/* View button - primary action */}
              <a 
                href={link}
                onClick={(e) => {
                  e.preventDefault();
                  setIsVisible(false);
                  if (onClose) onClose();
                  window.location.href = link;
                }} 
                className="text-xs bg-benchlot-primary text-white px-3 py-1.5 rounded-md font-medium hover:bg-benchlot-secondary transition-colors flex-1 text-center"
              >
                View Message
              </a>
              
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
      )}
      
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

export default NotificationPopup;