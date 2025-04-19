// src/Pages/OrderConfirmationPage.js
import React, { useEffect, useState } from 'react';
import OrderConfirmation from '../components/OrderConfirmation';
import { useAuth } from '../firebase';
import { Navigate, useParams, useLocation, useNavigate } from 'react-router-dom';

const OrderConfirmationPage = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mockOrderId, setMockOrderId] = useState(null);

  // Handle mock order if needed (for testing)
  useEffect(() => {
    // If we're in the /order-complete route without an ID, create a mock order ID
    if (!id && location.pathname === '/order-complete') {
      const newMockId = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setMockOrderId(newMockId);
      
      // Add a small delay before redirecting to the mock order
      setTimeout(() => {
        navigate(`/order-confirmation/${newMockId}`);
      }, 100);
    }
  }, [id, location.pathname, navigate]);

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ redirect: location.pathname }} />;
  }

  // If we're creating a mock order, show loading
  if (!id && location.pathname === '/order-complete') {
    return (
      <div className="page-container py-8">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex justify-center items-center h-60">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-200 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-8">
      <OrderConfirmation />
    </div>
  );
};

export default OrderConfirmationPage;