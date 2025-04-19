/**
 * TestOrderButton Component
 * For testing various features without making real API calls
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase';
import { mockOrders } from '../utils/mockData';

const TestOrderButton = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Test options
  const testOptions = [
    { name: 'Order Confirmation', action: () => navigate('/order-confirmation/order1') },
    { name: 'Active Cart', action: () => navigate('/cart') },
    { name: 'Empty Cart', action: () => navigate('/cart?empty=true') },
    { name: 'Checkout Page', action: () => navigate('/checkout') },
    { name: 'All Orders', action: () => navigate('/orders') },
    { name: 'Order Detail', action: () => navigate('/orders/order1') },
    { name: 'Generate Random Order', action: () => {
      const orderId = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      navigate(`/order-confirmation/${orderId}`);
    }}
  ];

  const handleToggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleAction = (action) => {
    action();
    setIsOpen(false);
  };

  if (!isAuthenticated() || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl mb-2 overflow-hidden">
          <div className="p-2 bg-purple-100 border-b border-purple-200">
            <h3 className="text-sm font-bold text-purple-800">Test Actions</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {testOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAction(option.action)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 transition"
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <button
        onClick={handleToggleMenu}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition flex items-center"
      >
        <span className="font-mono text-xs mr-2">DEV</span>
        {isOpen ? 'Close Menu' : 'Test Options'}
        <svg 
          className={`ml-2 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

export default TestOrderButton;