/**
 * Order Confirmation Component
 * Displays order confirmation details with enhanced marketplace experience
 */
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { mockOrders, getMockOrderById } from '../utils/mockData';

const OrderConfirmation = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Format date
  const formatDate = (seconds) => {
    if (!seconds) return 'Recently';
    const date = new Date(seconds * 1000);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        
        // Check if we should use mock data - either it's a predefined mock ID or a generated one
        const existingMockOrder = getMockOrderById(id);
        
        if (existingMockOrder) {
          // Use existing mock order data from our mock data collection
          console.log('Using existing mock order:', id);
          setOrder(existingMockOrder);
        } else if (id.startsWith('order-')) {
          // Create dynamic mock order data for testing
          console.log('Creating dynamic mock order:', id);
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
                quantity: 1,
                image: '/images/handtools.jpg'
              },
              {
                name: 'Tool Bit Set',
                toolId: 'mock-tool-2',
                price: 49.99,
                quantity: 1,
                image: '/images/handtools.jpg'
              }
            ],
            shipping: {
              address: {
                line1: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                postal_code: '94103',
                country: 'US'
              },
              carrier: 'USPS',
              tracking: 'TRK123456789'
            },
            payment: {
              method: 'card',
              last4: '4242'
            }
          };
          
          setOrder(mockOrder);
        } else {
          // Real implementation for actual orders
          try {
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
          } catch (err) {
            console.error('Error loading order:', err);
            
            // For development/testing fallback to mock data if there's an error
            if (process.env.NODE_ENV === 'development') {
              console.warn('Error loading order, using mock data for development');
              
              // Try to use a predefined mock order first, or create a new one
              const existingMockOrder = getMockOrderById('order1');
              
              if (existingMockOrder) {
                console.log('Using fallback mock order data');
                setOrder({
                  ...existingMockOrder,
                  id: id // Keep the requested ID
                });
              } else {
                // Create a new mock order as fallback
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
                      quantity: 1,
                      image: '/images/handtools.jpg'
                    },
                    {
                      name: 'Tool Bit Set',
                      toolId: 'mock-tool-2',
                      price: 49.99,
                      quantity: 1,
                      image: '/images/handtools.jpg'
                    }
                  ],
                  shipping: {
                    address: {
                      line1: '123 Main St',
                      city: 'Anytown',
                      state: 'CA',
                      postal_code: '94103',
                      country: 'US'
                    },
                    carrier: 'USPS',
                    tracking: 'TRK123456789'
                  },
                  payment: {
                    method: 'card',
                    last4: '4242'
                  }
                };
                setOrder(mockOrder);
              }
            } else {
              setError(err.message);
            }
          }
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
    } else if (!user) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { redirect: `/order-confirmation/${id}` } });
    }
  }, [id, user, navigate]);
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-center items-center h-60">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-200 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <div className="flex space-x-4 mt-6">
          <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Return to Home
          </Link>
          <Link to="/orders" className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
            View Orders
          </Link>
        </div>
      </div>
    );
  }
  
  if (!order) {
    return null;
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Success Banner */}
      <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-3">
          <div className="bg-green-100 p-2 rounded-full mr-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-green-800">Thank you for your order!</h2>
        </div>
        <p className="text-green-700">Your order has been received and is being processed. A confirmation email has been sent to your registered email address.</p>
      </div>
      
      {/* Order Information */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Order Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Order #{order.id.slice(-8).toUpperCase()}</h2>
                <p className="text-sm text-gray-600">
                  Placed on {formatDate(order.createdAt?.seconds)}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                {order.status === 'paid' ? 'Payment Confirmed' : order.status}
              </div>
            </div>
          </div>
          
          {/* Order Items */}
          <div className="p-6">
            <h3 className="font-medium mb-4 text-gray-700">Order Items</h3>
            <ul className="divide-y divide-gray-200">
              {order.items.map((item) => (
                <li key={item.toolId} className="py-4 flex items-center">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 mr-4">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/tools/${item.toolId}`} className="text-blue-600 hover:underline font-medium">
                      {item.name}
                    </Link>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(item.price)}</p>
                    {item.quantity > 1 && (
                      <p className="text-sm text-gray-500">
                        Subtotal: {formatPrice(item.price * item.quantity)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Order Summary */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delivery Information */}
              <div>
                <h3 className="font-medium mb-2 text-gray-700">Shipping Information</h3>
                {order.shipping ? (
                  <div className="text-sm text-gray-600">
                    <p className="mb-1">{order.shipping.address?.line1}</p>
                    <p className="mb-1">
                      {order.shipping.address?.city}, {order.shipping.address?.state} {order.shipping.address?.postal_code}
                    </p>
                    <p className="mb-1">{order.shipping.address?.country}</p>
                    {order.shipping.carrier && (
                      <p className="mt-2">
                        <span className="font-medium">Carrier:</span> {order.shipping.carrier}
                      </p>
                    )}
                    {order.shipping.tracking && (
                      <p>
                        <span className="font-medium">Tracking:</span> {order.shipping.tracking}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Shipping information will be updated soon.</p>
                )}
              </div>
              
              {/* Payment Summary */}
              <div>
                <h3 className="font-medium mb-2 text-gray-700">Payment Summary</h3>
                <div className="text-sm text-gray-600 mb-4">
                  <p className="mb-1">
                    <span className="font-medium">Method:</span> {order.payment?.method === 'card' ? 'Credit Card' : order.payment?.method || 'Card'}
                    {order.payment?.last4 && ` (ending in ${order.payment.last4})`}
                  </p>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Tax</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between font-bold text-base mt-4 pt-4 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-between items-center mt-8">
        <div className="space-x-4">
          <Link 
            to="/" 
            className="px-5 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
          >
            Continue Shopping
          </Link>
          <Link 
            to="/orders" 
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View All Orders
          </Link>
        </div>
        <div>
          <button 
            onClick={() => window.print()} 
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
            </svg>
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;