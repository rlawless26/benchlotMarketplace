// src/Pages/ToolListingFormPage.js
import React from 'react';
import { useParams } from 'react-router-dom';
import ToolListingForm from '../components/ToolListingForm';

const ToolListingFormPage = () => {
  const { id } = useParams();
  const isEditing = !!id;

  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-3xl font-serif font-semibold mb-6">
        {isEditing ? 'Edit Tool Listing' : 'Add New Tool Listing'}
      </h1>
      <ToolListingForm hideTitle={true} />
      </div>
    </div>
  );
};

export default ToolListingFormPage;