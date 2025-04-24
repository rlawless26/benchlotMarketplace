// src/Pages/CartPage.js
import React from 'react';
import Cart from '../components/CartPage';

const CartPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-semibold mb-6">Your Cart</h1>
      <Cart />
    </div>
  );
};

export default CartPage;