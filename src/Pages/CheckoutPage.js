// src/Pages/CheckoutPage.js
import React from 'react';
import Checkout from '../components/CheckoutPage';

const CheckoutPage = () => {
  return (
    <div className="page-container py-8">
      <h1 className="text-3xl font-serif font-semibold mb-6">Checkout</h1>
      <Checkout />
    </div>
  );
};

export default CheckoutPage;