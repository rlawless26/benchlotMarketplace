/**
 * OrderMini Component
 * Displays a compact order summary for use in lists or sidebars
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle, Clock, Truck, XCircle } from 'lucide-react';

const OrderMini = ({ order }) => {
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
      <div className={`inline-flex items-center ${color} px-2 py-0.5 rounded-full text-xs font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };
  
  if (!order) return null;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-stone-500 mb-1">Order #{order.id.slice(-6)}</div>
            <div className="font-medium">{formatDate(order.createdAt)}</div>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        
        <div className="mt-3">
          <div className="text-xs text-stone-500">Items</div>
          <div className="text-sm">
            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
          </div>
        </div>
        
        <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between items-center">
          <div className="text-sm font-medium">{formatPrice(order.totalAmount)}</div>
          <Link 
            to={`/orders/${order.id}`}
            className="text-xs text-benchlot-primary hover:text-benchlot-primary-dark font-medium"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderMini;