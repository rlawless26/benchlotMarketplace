// src/Pages/MyListingsPage.js
import React from 'react';
import MyListings from '../components/MyListings';

const MyListingsPage = () => {
  return (
    <div className="page-container py-8">
      <h1 className="text-3xl font-serif font-semibold mb-6">My Tool Listings</h1>
      <MyListings />
    </div>
  );
};

export default MyListingsPage;