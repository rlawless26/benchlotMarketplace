/**
 * Orders Page Component
 * Displays a list of user orders with filtering and sorting
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Calendar, 
  Filter, 
  CheckCircle, 
  Clock, 
  Truck, 
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Loader
} from 'lucide-react';
import { openAuthModal } from '../utils/featureFlags';

import { useAuth } from '../firebase/hooks/useAuth';
import { getUserOrders } from '../firebase/models/orderModel';

const OrdersPage = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtering and sorting state
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
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
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status badge
  const OrderStatusBadge = ({ status }) => {
    let color = 'bg-gray-100 text-gray-800';
    let icon = Clock;
    
    switch (status.toLowerCase()) {
      case 'pending':
        color = 'bg-yellow-100 text-yellow-800';
        icon = Clock;
        break;
      case 'paid':
        color = 'bg-blue-100 text-blue-800';
        icon = CheckCircle;
        break;
      case 'processing':
        color = 'bg-purple-100 text-purple-800';
        icon = Package;
        break;
      case 'shipped':
        color = 'bg-indigo-100 text-indigo-800';
        icon = Truck;
        break;
      case 'delivered':
        color = 'bg-green-100 text-green-800';
        icon = CheckCircle;
        break;
      case 'cancelled':
        color = 'bg-red-100 text-red-800';
        icon = XCircle;
        break;
      default:
        break;
    }
    
    return (
      <div className={`inline-flex items-center ${color} px-2.5 py-1 rounded-full text-xs font-medium`}>
        <icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };
  
  // Toggle sort direction
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Load user orders
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        
        if (!user?.uid) {
          return;
        }
        
        const userOrders = await getUserOrders(user.uid);
        
        // For development, add mock orders if none exist
        if (userOrders.length === 0) {
          const mockStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
          const mockOrders = Array.from({ length: 5 }, (_, i) => ({
            id: `mock-order-${i}`,
            userId: user.uid,
            status: mockStatuses[Math.floor(Math.random() * mockStatuses.length)],
            createdAt: { seconds: Date.now() / 1000 - (i * 86400) },
            totalAmount: 100 + Math.floor(Math.random() * 500),
            itemCount: 1 + Math.floor(Math.random() * 5),
            items: [
              {
                name: 'Sample Tool ' + (i + 1),
                toolId: 'mock-tool-' + i,
                price: 99.99,
                quantity: 1
              }
            ]
          }));
          
          setOrders(mockOrders);
        } else {
          setOrders(userOrders);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError('Failed to load your orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading) {
      if (isAuthenticated()) {
        loadOrders();
      } else {
        openAuthModal('signin', '/orders');
      }
    }
  }, [user, authLoading, isAuthenticated, navigate]);
  
  // Apply filters, search, and sorting
  useEffect(() => {
    let result = [...orders];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(order => order.status.toLowerCase() === filterStatus);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => (
        order.id.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      ));
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'date') {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        comparison = dateA - dateB;
      } else if (sortField === 'total') {
        comparison = a.totalAmount - b.totalAmount;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredOrders(result);
  }, [orders, filterStatus, sortField, sortDirection, searchQuery]);
  
  // Render loading state
  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-medium text-stone-800 mb-6">My Orders</h1>
        <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
          <Loader className="h-8 w-8 text-benchlot-primary animate-spin" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-medium text-stone-800 mb-2">My Orders</h1>
        <p className="text-stone-600 mb-6">View and track your order history</p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* Filters and Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="w-full md:w-1/3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <select
                  className="appearance-none pl-9 pr-8 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary text-sm bg-white"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-stone-400" />
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-stone-400" />
                </div>
              </div>
              
              <button
                className={`flex items-center gap-1 px-3 py-2 border rounded-md text-sm ${
                  sortField === 'date' ? 'bg-stone-100 border-stone-300' : 'bg-white border-stone-300'
                }`}
                onClick={() => toggleSort('date')}
              >
                <Calendar className="h-4 w-4" />
                Date
                {sortField === 'date' && (
                  sortDirection === 'asc' 
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              <button
                className={`flex items-center gap-1 px-3 py-2 border rounded-md text-sm ${
                  sortField === 'total' ? 'bg-stone-100 border-stone-300' : 'bg-white border-stone-300'
                }`}
                onClick={() => toggleSort('total')}
              >
                Price
                {sortField === 'total' && (
                  sortDirection === 'asc' 
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Package className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-stone-800 mb-2">No orders found</h2>
            <p className="text-stone-600 mb-6">
              {orders.length === 0 
                ? "You haven't placed any orders yet."
                : "No orders match your current filters."
              }
            </p>
            {orders.length === 0 && (
              <Link
                to="/marketplace"
                className="inline-flex items-center px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-primary-dark"
              >
                Browse Tools
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-stone-200">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-4 md:p-6 hover:bg-stone-50">
                  <div className="flex flex-col md:flex-row justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-lg">Order #{order.id.slice(-6)}</h3>
                      <div className="text-stone-500 text-sm">
                        Placed on {formatDate(order.createdAt)}
                      </div>
                    </div>
                    <div className="mt-2 md:mt-0 md:text-right">
                      <div className="mb-1">
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="text-stone-900 font-medium">
                        {formatPrice(order.totalAmount)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-3">
                      {order.items.slice(0, 3).map(item => (
                        <div 
                          key={item.toolId} 
                          className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-md border border-stone-200"
                        >
                          <div className="w-10 h-10 bg-stone-200 rounded-md flex items-center justify-center">
                            <Package className="h-5 w-5 text-stone-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-stone-500">Qty: {item.quantity}</div>
                          </div>
                        </div>
                      ))}
                      
                      {order.items.length > 3 && (
                        <div className="flex items-center text-stone-500 text-sm">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-stone-200 flex justify-end">
                    <Link
                      to={`/orders/${order.id}`}
                      className="text-benchlot-primary hover:text-benchlot-primary-dark font-medium"
                    >
                      View Order Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;