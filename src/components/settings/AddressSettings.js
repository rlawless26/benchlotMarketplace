/**
 * AddressSettings Component
 * Allows users to manage their shipping and billing addresses
 */
import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Check, Loader, AlertCircle, Trash2, EditIcon, Home } from 'lucide-react';
import { updateUserAddress } from '../../firebase/models/userModel';

const AddressSettings = ({ user }) => {
  // State
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // New/editing address form state
  const [addressForm, setAddressForm] = useState({
    id: '',
    type: 'shipping',
    isDefault: false,
    fullName: '',
    street: '',
    apt: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    instructions: ''
  });
  
  // Load addresses from user data
  useEffect(() => {
    if (user && user.profile) {
      const userAddresses = user.profile.addresses || [];
      setAddresses(userAddresses);
    }
  }, [user]);
  
  // Reset form
  const resetForm = () => {
    setAddressForm({
      id: '',
      type: 'shipping',
      isDefault: false,
      fullName: '',
      street: '',
      apt: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      phone: '',
      instructions: ''
    });
  };
  
  // Edit an existing address
  const handleEditAddress = (address) => {
    setAddressForm({
      id: address.id,
      type: address.type || 'shipping',
      isDefault: address.isDefault || false,
      fullName: address.fullName || '',
      street: address.street || '',
      apt: address.apt || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || 'US',
      phone: address.phone || '',
      instructions: address.instructions || ''
    });
    
    setEditingAddress(address.id);
    setIsAdding(false);
  };
  
  // Delete an address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      
      // If we're deleting the default address, make the first remaining address the default
      if (addresses.find(addr => addr.id === addressId)?.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }
      
      await updateUserAddress(user.uid, { addresses: updatedAddresses });
      
      setAddresses(updatedAddresses);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error deleting address:', err);
      setError(err.message || 'Failed to delete address');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Validate required fields
      const requiredFields = ['fullName', 'street', 'city', 'state', 'zipCode', 'country'];
      const missingFields = requiredFields.filter(field => !addressForm[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Please complete all required fields: ${missingFields.join(', ')}`);
      }
      
      // Create a copy of the addresses array
      let updatedAddresses = [...addresses];
      
      // Generate a unique ID for new addresses
      if (!addressForm.id) {
        addressForm.id = `addr_${Date.now()}`;
      }
      
      // If this is set as the default address, unset other defaults
      if (addressForm.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => ({
          ...addr,
          isDefault: addr.id === addressForm.id
        }));
      }
      
      // If no addresses exist yet, make this one the default
      if (updatedAddresses.length === 0) {
        addressForm.isDefault = true;
      }
      
      // Update or add the address
      const existingIndex = updatedAddresses.findIndex(addr => addr.id === addressForm.id);
      
      if (existingIndex >= 0) {
        updatedAddresses[existingIndex] = addressForm;
      } else {
        updatedAddresses.push(addressForm);
      }
      
      // Save to Firebase
      await updateUserAddress(user.uid, { addresses: updatedAddresses });
      
      // Update local state
      setAddresses(updatedAddresses);
      
      // Reset form and editing state
      resetForm();
      setEditingAddress(null);
      setIsAdding(false);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving address:', err);
      setError(err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };
  
  // Cancel editing
  const handleCancel = () => {
    resetForm();
    setEditingAddress(null);
    setIsAdding(false);
  };
  
  // Start adding a new address
  const handleAddNew = () => {
    resetForm();
    setIsAdding(true);
    setEditingAddress(null);
  };
  
  // Render the address form
  const renderAddressForm = () => (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">
        {editingAddress ? 'Edit Address' : 'Add New Address'}
      </h3>
      
      {/* Address Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Address Type
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="shipping"
              checked={addressForm.type === 'shipping'}
              onChange={handleChange}
              className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
            />
            <span className="ml-2 text-sm text-stone-700">Shipping</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="billing"
              checked={addressForm.type === 'billing'}
              onChange={handleChange}
              className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
            />
            <span className="ml-2 text-sm text-stone-700">Billing</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="both"
              checked={addressForm.type === 'both'}
              onChange={handleChange}
              className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
            />
            <span className="ml-2 text-sm text-stone-700">Both</span>
          </label>
        </div>
      </div>
      
      {/* Default Address */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="isDefault"
            checked={addressForm.isDefault}
            onChange={handleChange}
            className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300 rounded"
          />
          <span className="ml-2 text-sm text-stone-700">Set as default address</span>
        </label>
      </div>
      
      {/* Full Name */}
      <div className="mb-6">
        <label 
          htmlFor="fullName" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={addressForm.fullName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          required
        />
      </div>
      
      {/* Street Address */}
      <div className="mb-6">
        <label 
          htmlFor="street" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Street Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="street"
          name="street"
          value={addressForm.street}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          required
        />
      </div>
      
      {/* Apartment/Suite */}
      <div className="mb-6">
        <label 
          htmlFor="apt" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Apartment, Suite, etc. (optional)
        </label>
        <input
          type="text"
          id="apt"
          name="apt"
          value={addressForm.apt}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
        />
      </div>
      
      {/* City, State, ZIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label 
            htmlFor="city" 
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={addressForm.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
            required
          />
        </div>
        
        <div>
          <label 
            htmlFor="state" 
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            State <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={addressForm.state}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
            required
          />
        </div>
        
        <div>
          <label 
            htmlFor="zipCode" 
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            ZIP Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="zipCode"
            name="zipCode"
            value={addressForm.zipCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
            required
          />
        </div>
      </div>
      
      {/* Country */}
      <div className="mb-6">
        <label 
          htmlFor="country" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Country <span className="text-red-500">*</span>
        </label>
        <select
          id="country"
          name="country"
          value={addressForm.country}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary bg-white"
          required
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="MX">Mexico</option>
          {/* Add more countries as needed */}
        </select>
      </div>
      
      {/* Phone */}
      <div className="mb-6">
        <label 
          htmlFor="phone" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={addressForm.phone}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          placeholder="For delivery questions"
        />
      </div>
      
      {/* Delivery Instructions */}
      <div className="mb-6">
        <label 
          htmlFor="instructions" 
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Delivery Instructions (optional)
        </label>
        <textarea
          id="instructions"
          name="instructions"
          value={addressForm.instructions}
          onChange={handleChange}
          rows="2"
          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          placeholder="Notes for delivery driver, gate codes, etc."
        />
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary"
        >
          Cancel
        </button>
        
        <button
          type="submit"
          className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:ring-offset-2 flex items-center"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Address'
          )}
        </button>
      </div>
    </form>
  );
  
  // Render an address card
  const renderAddressCard = (address) => (
    <div 
      key={address.id} 
      className="bg-white border border-stone-200 rounded-lg p-5 relative"
    >
      {/* Default badge */}
      {address.isDefault && (
        <div className="absolute top-3 right-3 bg-benchlot-accent text-benchlot-primary text-xs font-medium px-2 py-1 rounded-full flex items-center">
          <Home className="h-3 w-3 mr-1" />
          Default
        </div>
      )}
      
      {/* Address type badge */}
      <div className="mb-3">
        <span className="inline-block bg-stone-100 text-stone-800 text-xs px-2 py-1 rounded">
          {address.type === 'both' 
            ? 'Shipping & Billing' 
            : address.type === 'shipping' 
              ? 'Shipping' 
              : 'Billing'}
        </span>
      </div>
      
      {/* Address content */}
      <div className="mb-4">
        <p className="font-medium">{address.fullName}</p>
        <p>{address.street}</p>
        {address.apt && <p>{address.apt}</p>}
        <p>{address.city}, {address.state} {address.zipCode}</p>
        <p>{address.country === 'US' ? 'United States' : address.country}</p>
        {address.phone && <p className="mt-1">{address.phone}</p>}
      </div>
      
      {/* Address actions */}
      <div className="flex space-x-3">
        <button
          onClick={() => handleEditAddress(address)}
          className="flex items-center text-sm text-benchlot-primary hover:text-benchlot-secondary"
        >
          <EditIcon className="h-4 w-4 mr-1" />
          Edit
        </button>
        
        <button
          onClick={() => handleDeleteAddress(address.id)}
          className="flex items-center text-sm text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Your Addresses</h2>
        <p className="text-stone-600 text-sm mt-1">Manage your shipping and billing addresses</p>
      </div>
      
      <div className="p-6">
        {/* Status messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Address saved successfully!
          </div>
        )}
        
        {/* Address form when editing or adding */}
        {(isAdding || editingAddress) && renderAddressForm()}
        
        {/* Addresses list or empty state */}
        {addresses.length === 0 && !isAdding ? (
          <div className="text-center py-10 border border-stone-200 rounded-lg">
            <MapPin className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No addresses yet</h3>
            <p className="text-stone-500 mb-6">
              Add a shipping or billing address to make checkout faster
            </p>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </button>
          </div>
        ) : (
          <>
            {/* Add new address button */}
            {!isAdding && !editingAddress && (
              <div className="mb-6">
                <button
                  onClick={handleAddNew}
                  className="px-4 py-2 border border-benchlot-primary text-benchlot-primary rounded-md hover:bg-benchlot-accent-light inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Address
                </button>
              </div>
            )}
            
            {/* Address grid */}
            {addresses.length > 0 && !isAdding && !editingAddress && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map(address => renderAddressCard(address))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddressSettings;