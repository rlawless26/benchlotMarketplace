// src/Pages/CartPage.js
import React from 'react';
import Cart from '../components/CartPage';

const CartPage = () => {
  return (
    <div className="page-container py-8">
      <h1 className="text-3xl font-serif font-semibold mb-6">Your Cart</h1>
      <Cart />
    </div>
  );
};

export default CartPage;