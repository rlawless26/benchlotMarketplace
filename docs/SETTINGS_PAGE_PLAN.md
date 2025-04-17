# Benchlot Settings Page - Incremental Implementation Plan

## Overview

This document outlines an incremental approach to implementing the User Profile System for Benchlot, using the existing SettingsPage.jsx as a foundation. The goal is to build a MVP (Minimum Viable Product) version of the settings system that supports both regular users and sellers, while setting the stage for more advanced features as the product matures.

## Analysis of Existing SettingsPage.jsx

The existing SettingsPage.jsx provides a good foundation with:

1. **Tab-based Navigation** - Clean sidebar navigation between different settings areas
2. **Profile Management** - Basic profile editing with photo upload
3. **Password Management** - Password change functionality
4. **Address Management** - Shipping/billing address management
5. **Payment Methods** - Basic payment method management
6. **Notifications** - Email and push notification settings
7. **Privacy** - Basic privacy controls
8. **Shipping Preferences** - Local pickup and shipping settings

## Incremental Implementation Approach

### Phase 1: Firebase Adaptation (Week 1)

1. **Port SettingsPage to Firebase**
   - Adapt the existing UI structure to work with Firebase
   - Replace Supabase client calls with Firebase equivalents
   - Ensure proper authentication checks
   - Migrate existing form states and handlers

2. **Extend User Model**
   - Ensure Firebase user model includes all needed fields
   - Adapt address and preferences storage format

### Phase 2: Seller Settings Integration (Week 2)

1. **Add Seller Settings Tab**
   - Add a conditional "Seller Settings" tab that only appears for sellers
   - Create tabs within seller settings for:
     - Business Details
     - Store Policies
     - Shipping & Pickup

2. **Business Details Form**
   - Business name/type
   - Business description
   - Contact information
   - Link to Stripe Connect account

3. **Store Policies Form**
   - Return policy
   - Rental terms
   - Damage policy
   - Security deposit requirements

### Phase 3: Enhanced Profile Features (Week 3)

1. **Tool Expertise Section**
   - Add fields for expertise areas
   - Implement simple tag-based input

2. **Verification Badge**
   - Display verification status
   - Show steps to increase verification level

3. **Mobile Responsiveness**
   - Ensure perfect mobile experience
   - Optimize forms for touch input

## Detailed Component Plan

### Adapted SettingsPage Structure

```jsx
// src/Pages/SettingsPage.js
const SettingsPage = () => {
  // State, auth, and handlers...
  
  return (
    <div className="bg-base min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-medium text-benchlot-primary mb-6">Account Settings</h1>
        
        {/* Settings grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-24">
              <div className="p-4 border-b">
                <h2 className="font-medium text-stone-800">Settings</h2>
              </div>
              
              <nav className="p-2">
                <ul className="space-y-1">
                  <li>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                        activeTab === 'profile' ? 'bg-benchlot-accent-light text-benchlot-primary' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                      onClick={() => setActiveTab('profile')}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                      <ChevronRight className={`h-4 w-4 ml-auto ${activeTab === 'profile' ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                  </li>
                  {/* Other tabs... */}
                  
                  {/* Conditional Seller Settings Tab */}
                  {isSeller && (
                    <li>
                      <button
                        className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                          activeTab === 'seller' ? 'bg-benchlot-accent-light text-benchlot-primary' : 'hover:bg-stone-50 text-stone-700'
                        }`}
                        onClick={() => setActiveTab('seller')}
                      >
                        <Store className="h-4 w-4 mr-3" />
                        Seller Settings
                        <ChevronRight className={`h-4 w-4 ml-auto ${activeTab === 'seller' ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                    </li>
                  )}
                </ul>
              </nav>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="lg:col-span-3">
            {/* Profile Settings Tab */}
            {activeTab === 'profile' && <ProfileSettings />}
            
            {/* Password Settings Tab */}
            {activeTab === 'password' && <PasswordSettings />}
            
            {/* Other tabs... */}
            
            {/* Seller Settings Tab */}
            {activeTab === 'seller' && <SellerSettings />}
          </div>
        </div>
      </main>
    </div>
  );
};
```

### New Seller Settings Component

```jsx
// src/components/SellerSettings.js
import React, { useState } from 'react';
import { useAuth } from '../firebase/hooks/useAuth';
import { useSeller } from '../firebase/hooks/useSeller';
import BusinessDetailsForm from './BusinessDetailsForm';
import StorePoliciesForm from './StorePoliciesForm';
import ShippingPoliciesForm from './ShippingPoliciesForm';

const SellerSettings = () => {
  const { user } = useAuth();
  const { sellerStatus, refreshOnboardingLink, getDashboardLink } = useSeller();
  const [activeTab, setActiveTab] = useState('business');

  // Handlers for stripe connect, dashboard link, etc.

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-benchlot-primary">Seller Settings</h2>
        <p className="text-stone-600 text-sm mt-1">Manage your seller account and preferences</p>
      </div>
      
      {/* Stripe Connect Status Banner */}
      {!sellerStatus?.detailsSubmitted && (
        <div className="m-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <h3 className="font-medium text-amber-800">Complete Your Seller Onboarding</h3>
          <p className="text-sm text-amber-700 mt-1">
            You need to complete your Stripe Connect account setup to receive payments.
          </p>
          <button
            onClick={handleCompleteOnboarding}
            className="mt-3 px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary"
          >
            Complete Setup
          </button>
        </div>
      )}
      
      {/* Seller Settings Tabs */}
      <div className="border-b border-gray-200 px-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('business')}
            className={`pb-4 px-1 ${
              activeTab === 'business'
                ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Business Details
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`pb-4 px-1 ${
              activeTab === 'policies'
                ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Store Policies
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`pb-4 px-1 ${
              activeTab === 'shipping'
                ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Shipping & Pickup
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'business' && <BusinessDetailsForm />}
        {activeTab === 'policies' && <StorePoliciesForm />}
        {activeTab === 'shipping' && <ShippingPoliciesForm />}
      </div>
    </div>
  );
};

export default SellerSettings;
```

## Form Components

For each section, we'll create dedicated form components:

1. **BusinessDetailsForm** - For basic business information
2. **StorePoliciesForm** - For return, rental, and damage policies
3. **ShippingPoliciesForm** - For shipping and pickup preferences

Each form will follow similar patterns to the existing forms in SettingsPage.jsx, with:
- State management for form fields
- Success/error message handling
- Loading state indicators
- Form validation
- Firebase data persistence

## Firebase Integration

We'll update the userModel.js to include methods for:

```javascript
// Add to userModel.js

/**
 * Update seller profile
 * @param {string} userId - The user ID
 * @param {Object} sellerData - Seller profile data
 * @returns {Promise<Object>} Updated seller data
 */
export const updateSellerProfile = async (userId, sellerData) => {
  try {
    const userRef = doc(usersCollection, userId);
    
    await updateDoc(userRef, {
      sellerSettings: sellerData,
      updated_at: serverTimestamp()
    });
    
    return sellerData;
  } catch (error) {
    console.error('Error updating seller profile:', error);
    throw error;
  }
};

/**
 * Update seller policies
 * @param {string} userId - The user ID
 * @param {Object} policies - Store policies
 * @returns {Promise<Object>} Updated policies
 */
export const updateSellerPolicies = async (userId, policies) => {
  try {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();
    const sellerSettings = userData.sellerSettings || {};
    
    await updateDoc(userRef, {
      sellerSettings: {
        ...sellerSettings,
        policies: policies
      },
      updated_at: serverTimestamp()
    });
    
    return policies;
  } catch (error) {
    console.error('Error updating seller policies:', error);
    throw error;
  }
};
```

## Conclusion and Next Steps

This incremental approach allows us to:

1. **Leverage Existing Code** - Reuse much of the SettingsPage.jsx structure and UI
2. **Add Critical Features** - Introduce seller settings in a modular way
3. **Build for the Future** - Structure code to support the full feature set outlined in USER_PROFILE_SYSTEM.md

By focusing on adapting the existing structure to Firebase and adding seller-specific tabs, we create a solid foundation for the V1 product while setting the stage for more advanced features in the future.

For the initial implementation, we'll focus on the core features needed for marketplace operation, with a roadmap for adding more advanced features based on user feedback and business priorities.