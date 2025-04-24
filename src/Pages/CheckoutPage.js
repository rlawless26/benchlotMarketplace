// src/Pages/CheckoutPage.js
import React from 'react';
import Checkout from '../components/CheckoutPage';

const CheckoutPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-semibold mb-6">Checkout</h1>
      <Checkout />
    </div>
  );
};

export default CheckoutPage;