// src/Pages/ToolListingFormPage.js
import React from 'react';
import { useParams } from 'react-router-dom';
import ToolListingForm from '../components/ToolListingForm';

const ToolListingFormPage = () => {
  const { id } = useParams();
  const isEditing = !!id;

  return (
    <div className="page-container py-8">
      <h1 className="text-3xl font-serif font-semibold mb-6">
        {isEditing ? 'Edit Tool Listing' : 'Add New Tool Listing'}
      </h1>
      <ToolListingForm />
    </div>
  );
};

export default ToolListingFormPage;