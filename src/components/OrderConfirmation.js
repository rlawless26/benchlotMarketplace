/**
 * Order Confirmation Component
 * Displays order confirmation details
 */
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../firebase';

const OrderConfirmation = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Format price as USD
  const formatPrice = (price) => {
    if (!price && price !== 0) return '$0';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Load order data (mock for development)
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        
        // For development, checking if this is a mock order ID and generating mock data
        if (id.startsWith('order-')) {
          // Create mock order data for demonstration
          const mockOrder = {
            id: id,
            userId: user?.uid,
            status: 'paid',
            createdAt: { seconds: Date.now() / 1000 },
            totalAmount: 199.99,
            items: [
              {
                name: 'Milwaukee Drill',
                toolId: 'mock-tool-1',
                price: 149.99,
                quantity: 1
              },
              {
                name: 'Tool Bit Set',
                toolId: 'mock-tool-2',
                price: 49.99,
                quantity: 1
              }
            ]
          };
          
          setOrder(mockOrder);
        } else {
          // Real implementation for actual orders
          const orderRef = doc(db, 'orders', id);
          const orderSnap = await getDoc(orderRef);
          
          if (!orderSnap.exists()) {
            throw new Error('Order not found');
          }
          
          const orderData = {
            id: orderSnap.id,
            ...orderSnap.data()
          };
          
          // Verify user has access to this order
          if (orderData.userId !== user?.uid) {
            throw new Error('You do not have permission to view this order');
          }
          
          setOrder(orderData);
        }
      } catch (err) {
        console.error('Error loading order:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id && user) {
      loadOrder();
    }
  }, [id, user]);
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Order Confirmation</h1>
        <div className="flex justify-center items-center h-60">
          <div className="text-gray-500">Loading order details...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Order Confirmation</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link to="/" className="text-blue-600 hover:text-blue-800">
          Return to Home
        </Link>
      </div>
    );
  }
  
  if (!order) {
    return null;
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span className="font-bold">Order Successful!</span>
        </div>
        <p className="mt-1">Your order has been placed and is being processed.</p>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Order Confirmation</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Order #{order.id.slice(-6)}</h2>
            <span className="text-gray-600">
              {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'Recently'}
            </span>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <h3 className="font-medium mb-2">Order Status</h3>
          <div className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
            {order.status}
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200">
          <h3 className="font-medium mb-2">Order Items</h3>
          <ul className="divide-y divide-gray-200">
            {order.items.map((item) => (
              <li key={item.toolId} className="py-3 flex justify-between">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-gray-600">Quantity: {item.quantity}</div>
                </div>
                <div className="text-right">
                  <div>{formatPrice(item.price)}</div>
                  <div className="text-gray-600">
                    Total: {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Link to="/" className="text-blue-600 hover:text-blue-800">
          Continue Shopping
        </Link>
        <Link to="/my-orders" className="text-blue-600 hover:text-blue-800">
          View All Orders
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;