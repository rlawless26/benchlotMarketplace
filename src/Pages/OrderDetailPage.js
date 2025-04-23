/**
 * Order Detail Page Component
 * Displays detailed information about a single order
 */
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Package, 
  ChevronLeft, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  Printer,
  ArrowLeft,
  Loader,
  AlertCircle
} from 'lucide-react';
import { openAuthModal } from '../utils/featureFlags';

import { useAuth } from '../firebase/hooks/useAuth';
import { getOrderById, updateOrderStatus } from '../firebase/models/orderModel';

const OrderDetailPage = () => {
  const { id } = useParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  
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
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000) 
      : new Date(timestamp);
      
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };
  
  // Order status badge component
  const OrderStatusBadge = ({ status }) => {
    let color = 'bg-gray-100 text-gray-800';
    let Icon = Clock;
    
    switch (status.toLowerCase()) {
      case 'pending':
        color = 'bg-yellow-100 text-yellow-800';
        Icon = Clock;
        break;
      case 'paid':
        color = 'bg-blue-100 text-blue-800';
        Icon = CheckCircle;
        break;
      case 'processing':
        color = 'bg-purple-100 text-purple-800';
        Icon = Package;
        break;
      case 'shipped':
        color = 'bg-indigo-100 text-indigo-800';
        Icon = Truck;
        break;
      case 'delivered':
        color = 'bg-green-100 text-green-800';
        Icon = CheckCircle;
        break;
      case 'cancelled':
        color = 'bg-red-100 text-red-800';
        Icon = XCircle;
        break;
      default:
        break;
    }
    
    return (
      <div className={`inline-flex items-center ${color} px-3 py-1 rounded-full text-sm font-medium`}>
        <Icon className="w-4 h-4 mr-1.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };
  
  // Cancel order handler
  const handleCancelOrder = async () => {
    if (!id || !user) return;
    
    try {
      setProcessingAction(true);
      await updateOrderStatus(id, 'cancelled');
      
      // Update local state
      setOrder(prev => ({
        ...prev,
        status: 'cancelled'
      }));
      
      setCancelConfirm(false);
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError('Failed to cancel the order. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Print order handler
  const handlePrintOrder = () => {
    window.print();
  };
  
  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        
        if (!id || !user?.uid) {
          return;
        }
        
        let orderData;
        
        // Check if we need to generate mock data
        if (id.startsWith('mock-order-')) {
          // Create mock order data for demonstration
          orderData = {
            id: id,
            userId: user.uid,
            status: ['pending', 'paid', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 5)],
            createdAt: { seconds: Date.now() / 1000 - (86400 * 2) },
            updatedAt: { seconds: Date.now() / 1000 - (3600 * 6) },
            totalAmount: 249.99,
            itemCount: 2,
            shipping: {
              address: '123 Main St',
              city: 'Portland',
              state: 'OR',
              zip: '97201',
              method: 'Standard Shipping',
              cost: 9.99
            },
            items: [
              {
                name: 'DeWalt Power Drill',
                toolId: 'mock-tool-1',
                price: 159.99,
                quantity: 1,
                image: '/images/placeholder.png'
              },
              {
                name: 'Drill Bit Set',
                toolId: 'mock-tool-2',
                price: 79.99,
                quantity: 1,
                image: '/images/placeholder.png'
              }
            ],
            payment: {
              method: 'Credit Card',
              status: 'completed',
              lastFour: '4242',
              transactionId: 'mock-tx-' + id.slice(-6)
            }
          };
        } else {
          // Fetch real order data
          orderData = await getOrderById(id);
          
          // Verify user has access to this order
          if (orderData.userId !== user.uid) {
            throw new Error('You do not have permission to view this order');
          }
        }
        
        setOrder(orderData);
        setError(null);
      } catch (err) {
        console.error('Error loading order:', err);
        setError(err.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading) {
      if (isAuthenticated()) {
        loadOrder();
      } else {
        openAuthModal('signin', `/orders/${id}`);
      }
    }
  }, [id, user, authLoading, isAuthenticated, navigate]);
  
  // Render loading state
  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
          <Loader className="h-8 w-8 text-benchlot-primary animate-spin" />
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-stone-800 mb-2">Error Loading Order</h2>
            <p className="text-stone-600 mb-6">{error}</p>
            <Link 
              to="/orders"
              className="text-benchlot-primary hover:text-benchlot-primary-dark font-medium"
            >
              Return to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!order) {
    return null;
  }
  
  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Link to="/orders" className="inline-flex items-center text-stone-600 hover:text-benchlot-primary mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Orders
            </Link>
            <h1 className="text-3xl font-serif font-medium text-stone-800">Order #{order.id.slice(-6)}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <button
              onClick={handlePrintOrder}
              className="inline-flex items-center px-3 py-1.5 border border-stone-300 bg-white rounded-md text-stone-700 hover:bg-stone-50 text-sm"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </button>
          </div>
        </div>
        
        {/* Order details grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main order info column */}
          <div className="md:col-span-2 space-y-6">
            {/* Order items card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-medium">Order Items</h2>
              </div>
              
              <ul className="divide-y divide-stone-200">
                {order.items.map((item) => (
                  <li key={item.toolId} className="p-6 flex items-start">
                    <div className="flex-shrink-0 w-16 h-16 bg-stone-100 rounded-md overflow-hidden mr-4">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-stone-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-stone-900 truncate">
                        {item.name}
                      </h3>
                      <p className="text-sm text-stone-500">
                        Price: {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="text-base font-medium text-stone-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-200">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">Subtotal</span>
                  <span className="text-stone-900 font-medium">{formatPrice(order.totalAmount - (order.shipping?.cost || 0))}</span>
                </div>
                
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">Shipping</span>
                  <span className="text-stone-900 font-medium">{formatPrice(order.shipping?.cost || 0)}</span>
                </div>
                
                <div className="flex justify-between text-base font-medium mt-3 pt-3 border-t border-stone-200">
                  <span className="text-stone-900">Total</span>
                  <span className="text-stone-900">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>
            
            {/* Order timeline/status card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-medium">Order Timeline</h2>
              </div>
              
              <div className="px-6 py-4">
                <ol className="relative border-l border-stone-300 ml-3 space-y-6">
                  {order.status !== 'cancelled' && (
                    <>
                      <li className="mb-6 ml-6">
                        <span className="absolute flex items-center justify-center w-6 h-6 bg-green-100 rounded-full -left-3 ring-8 ring-white">
                          <CheckCircle className="w-3.5 h-3.5 text-green-800" />
                        </span>
                        <h3 className="font-medium text-stone-900">Order Placed</h3>
                        <time className="block text-sm text-stone-500">{formatDate(order.createdAt)}</time>
                        <p className="text-sm text-stone-600 mt-1">Your order has been placed successfully.</p>
                      </li>
                      
                      <li className={`mb-6 ml-6 ${order.status === 'pending' ? 'opacity-50' : ''}`}>
                        <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white ${
                          order.status !== 'pending' ? 'bg-green-100' : 'bg-stone-100'
                        }`}>
                          {order.status !== 'pending' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-800" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-stone-500" />
                          )}
                        </span>
                        <h3 className="font-medium text-stone-900">Payment Confirmed</h3>
                        {order.status !== 'pending' && (
                          <time className="block text-sm text-stone-500">{formatDate(order.updatedAt)}</time>
                        )}
                        <p className="text-sm text-stone-600 mt-1">
                          {order.status !== 'pending' 
                            ? `Payment processed successfully via ${order.payment?.method || 'Card'}.`
                            : 'Waiting for payment confirmation.'
                          }
                        </p>
                      </li>
                      
                      <li className={`mb-6 ml-6 ${['pending', 'paid'].includes(order.status) ? 'opacity-50' : ''}`}>
                        <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white ${
                          !['pending', 'paid'].includes(order.status) ? 'bg-green-100' : 'bg-stone-100'
                        }`}>
                          {!['pending', 'paid'].includes(order.status) ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-800" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-stone-500" />
                          )}
                        </span>
                        <h3 className="font-medium text-stone-900">Processing</h3>
                        {order.status === 'processing' && (
                          <time className="block text-sm text-stone-500">{formatDate(order.updatedAt)}</time>
                        )}
                        <p className="text-sm text-stone-600 mt-1">
                          {order.status === 'processing' 
                            ? 'Your order is being prepared for shipping.'
                            : ['pending', 'paid'].includes(order.status) 
                              ? 'Your order will be processed soon.'
                              : 'Your order has been processed.'
                          }
                        </p>
                      </li>
                      
                      <li className={`mb-6 ml-6 ${!['shipped', 'delivered'].includes(order.status) ? 'opacity-50' : ''}`}>
                        <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white ${
                          ['shipped', 'delivered'].includes(order.status) ? 'bg-green-100' : 'bg-stone-100'
                        }`}>
                          {order.status === 'shipped' ? (
                            <Truck className="w-3.5 h-3.5 text-green-800" />
                          ) : order.status === 'delivered' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-800" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-stone-500" />
                          )}
                        </span>
                        <h3 className="font-medium text-stone-900">Shipped</h3>
                        {order.status === 'shipped' && (
                          <time className="block text-sm text-stone-500">{formatDate(order.updatedAt)}</time>
                        )}
                        <p className="text-sm text-stone-600 mt-1">
                          {order.status === 'shipped'
                            ? 'Your order is on the way!'
                            : order.status === 'delivered'
                              ? 'Your order has been shipped.'
                              : 'Your order will be shipped soon.'
                          }
                        </p>
                      </li>
                      
                      <li className={`ml-6 ${order.status !== 'delivered' ? 'opacity-50' : ''}`}>
                        <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white ${
                          order.status === 'delivered' ? 'bg-green-100' : 'bg-stone-100'
                        }`}>
                          {order.status === 'delivered' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-800" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-stone-500" />
                          )}
                        </span>
                        <h3 className="font-medium text-stone-900">Delivered</h3>
                        {order.status === 'delivered' && (
                          <time className="block text-sm text-stone-500">{formatDate(order.updatedAt)}</time>
                        )}
                        <p className="text-sm text-stone-600 mt-1">
                          {order.status === 'delivered'
                            ? 'Your order has been delivered.'
                            : 'Your order will be delivered soon.'
                          }
                        </p>
                      </li>
                    </>
                  )}
                  
                  {order.status === 'cancelled' && (
                    <li className="ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-red-100 rounded-full -left-3 ring-8 ring-white">
                        <XCircle className="w-3.5 h-3.5 text-red-800" />
                      </span>
                      <h3 className="font-medium text-stone-900">Order Cancelled</h3>
                      <time className="block text-sm text-stone-500">{formatDate(order.updatedAt)}</time>
                      <p className="text-sm text-stone-600 mt-1">This order has been cancelled.</p>
                    </li>
                  )}
                </ol>
              </div>
            </div>
          </div>
          
          {/* Sidebar with summary and actions */}
          <div className="space-y-6">
            {/* Order summary card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-medium">Order Summary</h2>
              </div>
              
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-stone-500">Order Placed</p>
                    <p className="font-medium">{formatDate(order.createdAt)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-stone-500">Order Number</p>
                    <p className="font-medium">#{order.id.slice(-6)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-stone-500">Total</p>
                    <p className="font-medium">{formatPrice(order.totalAmount)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-stone-500">Payment Method</p>
                    <p className="font-medium">
                      {order.payment?.method || 'Credit Card'} 
                      {order.payment?.lastFour && `(•••• ${order.payment.lastFour})`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Shipping info card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-medium">Shipping Information</h2>
              </div>
              
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-stone-500">Shipping Address</p>
                    <p className="font-medium">
                      {order.shipping?.address || '123 Main St'}<br />
                      {order.shipping?.city || 'Portland'}, {order.shipping?.state || 'OR'} {order.shipping?.zip || '97201'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-stone-500">Shipping Method</p>
                    <p className="font-medium">{order.shipping?.method || 'Standard Shipping'}</p>
                  </div>
                  
                  {order.shipping?.trackingNumber && (
                    <div>
                      <p className="text-sm text-stone-500">Tracking Number</p>
                      <p className="font-medium">{order.shipping.trackingNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Order actions card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-medium">Order Actions</h2>
              </div>
              
              <div className="px-6 py-4">
                <div className="space-y-3">
                  <button
                    onClick={handlePrintOrder}
                    className="w-full flex items-center justify-center px-4 py-2 border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50"
                  >
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print Order
                  </button>
                  
                  {/* Only show cancel button for orders that can be cancelled */}
                  {['pending', 'paid', 'processing'].includes(order.status) && (
                    <>
                      {!cancelConfirm ? (
                        <button
                          onClick={() => setCancelConfirm(true)}
                          className="w-full flex items-center justify-center px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Cancel Order
                        </button>
                      ) : (
                        <div className="border border-red-200 rounded-md p-3 bg-red-50">
                          <p className="text-sm text-red-800 mb-3">Are you sure you want to cancel this order?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleCancelOrder}
                              disabled={processingAction}
                              className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex justify-center items-center"
                            >
                              {processingAction ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                'Yes, Cancel'
                              )}
                            </button>
                            <button
                              onClick={() => setCancelConfirm(false)}
                              disabled={processingAction}
                              className="flex-1 px-3 py-1.5 border border-stone-300 bg-white text-stone-700 rounded-md text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
                            >
                              No, Keep
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;