// src/Pages/OrderConfirmationPage.js
import React from 'react';
import OrderConfirmation from '../components/OrderConfirmation';

const OrderConfirmationPage = () => {
  return (
    <div className="page-container py-8">
      <h1 className="text-3xl font-serif font-semibold mb-6">Order Confirmation</h1>
      <OrderConfirmation />
    </div>
  );
};

export default OrderConfirmationPage;