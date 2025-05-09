/**
 * Guest Cart Debug Helper
 * This component helps debug issues with guest checkout
 */
import React, { useEffect, useState } from 'react';

const GuestCartDebug = () => {
  const [guestCartData, setGuestCartData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Check localStorage for guest cart
      const rawCartData = localStorage.getItem('benchlot_guest_cart');
      console.log('Raw guest cart data:', rawCartData);
      
      if (rawCartData) {
        const parsedCart = JSON.parse(rawCartData);
        console.log('Parsed guest cart data:', parsedCart);
        setGuestCartData(parsedCart);
      } else {
        setError('No guest cart data found in localStorage');
      }
    } catch (parseError) {
      console.error('Error parsing guest cart:', parseError);
      setError(`Error parsing cart: ${parseError.message}`);
    }
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-4xl mx-auto my-8">
      <h2 className="text-xl font-bold mb-4">Guest Cart Debug</h2>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          {error}
        </div>
      ) : guestCartData ? (
        <div>
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">Guest Cart Data</h3>
            <div className="bg-stone-50 p-4 rounded-md overflow-auto">
              <pre className="whitespace-pre-wrap">{JSON.stringify(guestCartData, null, 2)}</pre>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">Items in Cart: {guestCartData.items?.length || 0}</h3>
            <div className="divide-y divide-stone-200">
              {guestCartData.items?.map((item, index) => (
                <div key={index} className="py-3">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-stone-500">
                    Price: ${item.price} | Quantity: {item.quantity}
                  </div>
                  <div className="text-xs mt-1 text-stone-400">
                    Item ID: {item.id}, Tool ID: {item.toolId}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Cart Summary</h3>
            <div className="bg-stone-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-stone-600">Total Items:</div>
                <div className="font-medium">{guestCartData.itemCount || 0}</div>
                
                <div className="text-stone-600">Total Amount:</div>
                <div className="font-medium">${guestCartData.totalAmount || 0}</div>
                
                <div className="text-stone-600">Cart ID:</div>
                <div className="font-medium">{guestCartData.id || 'N/A'}</div>
                
                <div className="text-stone-600">Status:</div>
                <div className="font-medium">{guestCartData.status || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-pulse">
          <div className="h-6 bg-stone-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-stone-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-stone-200 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-stone-200 rounded w-4/6"></div>
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="font-semibold text-lg mb-2">Debug Actions</h3>
        <div className="flex space-x-4">
          <button 
            onClick={() => window.location.href = '/cart'} 
            className="px-4 py-2 bg-stone-200 text-stone-800 rounded hover:bg-stone-300"
          >
            Go to Cart
          </button>
          <button 
            onClick={() => window.location.href = '/checkout'} 
            className="px-4 py-2 bg-benchlot-primary text-white rounded hover:bg-benchlot-secondary"
          >
            Go to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestCartDebug;