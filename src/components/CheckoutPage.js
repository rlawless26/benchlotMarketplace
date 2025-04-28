/**
 * Checkout Page Component
 * Handles the checkout process with shipping address collection and payment
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';
import { updateUserAddress } from '../firebase/models/userModel';
import StripeCheckout from './StripeCheckout';
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  ArrowLeft, 
  Shield,
  Truck,
  Home,
  User,
  MapPin,
  Mail,
  Phone,
  ChevronRight,
  Check,
  ChevronLeft,
  ChevronDown,
  Package,
  CreditCard as CreditCardIcon,
  Wallet
} from 'lucide-react';
import { openAuthModal } from '../utils/featureFlags';

const CheckoutPage = () => {
  const { cart, loading, error } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Checkout steps state
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Shipping, 2: Payment
  
  // State for addresses
  const [shippingAddress, setShippingAddress] = useState({
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    email: user?.email || '',
    phone: ''
  });
  
  const [billingAddress, setBillingAddress] = useState({
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    email: user?.email || '',
    phone: ''
  });
  
  // UI state management
  const [formErrors, setFormErrors] = useState({});
  const [saveAddress, setSaveAddress] = useState(true);
  const [billingIsSameAsShipping, setBillingIsSameAsShipping] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState(null);
  
  // Guest checkout state
  const [isGuestCheckout, setIsGuestCheckout] = useState(!isAuthenticated());
  const [createAccount, setCreateAccount] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  
  // For guest users, we don't redirect to login
  
  // Redirect to cart if cart is empty
  useEffect(() => {
    if (!loading && (!cart || !cart.items || cart.items.length === 0)) {
      navigate('/cart');
    }
  }, [cart, loading, navigate]);
  
  // Load saved addresses from user profile
  useEffect(() => {
    if (user && user.profile && user.profile.addresses) {
      const userAddresses = user.profile.addresses || [];
      setSavedAddresses(userAddresses);
      
      // Find default shipping address
      let defaultShippingAddress = userAddresses.find(addr => 
        addr.isDefault && (addr.type === 'shipping' || addr.type === 'both')
      );
      
      // If no default shipping address, look for any shipping address
      if (!defaultShippingAddress) {
        defaultShippingAddress = userAddresses.find(addr => 
          addr.type === 'shipping' || addr.type === 'both'
        );
      }
      
      // Find default billing address
      let defaultBillingAddress = userAddresses.find(addr => 
        addr.isDefault && (addr.type === 'billing' || addr.type === 'both')
      );
      
      // If no default billing address, look for any billing address
      if (!defaultBillingAddress) {
        defaultBillingAddress = userAddresses.find(addr => 
          addr.type === 'billing' || addr.type === 'both'
        );
      }
      
      // If we have a default address that is 'both', use it for both shipping and billing
      const defaultBothAddress = userAddresses.find(addr => 
        addr.isDefault && addr.type === 'both'
      );
      
      if (defaultBothAddress) {
        defaultShippingAddress = defaultBothAddress;
        defaultBillingAddress = defaultBothAddress;
      }
      
      // Set shipping address if available
      if (defaultShippingAddress) {
        // Check if fullName needs to be split into firstName/lastName
        let firstName = '', lastName = '';
        if (defaultShippingAddress.fullName) {
          const nameParts = defaultShippingAddress.fullName.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        } else {
          firstName = defaultShippingAddress.firstName || '';
          lastName = defaultShippingAddress.lastName || '';
        }
        
        setShippingAddress(prev => ({
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          addressLine1: defaultShippingAddress.street || prev.addressLine1,
          addressLine2: defaultShippingAddress.apt || prev.addressLine2,
          city: defaultShippingAddress.city || prev.city,
          state: defaultShippingAddress.state || prev.state,
          postalCode: defaultShippingAddress.zipCode || prev.postalCode,
          country: defaultShippingAddress.country || prev.country,
          email: user.email || prev.email,
          phone: defaultShippingAddress.phone || prev.phone
        }));
        
        // If this is a default address, note it was used
        if (defaultShippingAddress.isDefault) {
          setSelectedSavedAddress(defaultShippingAddress.id);
        }
      }
      
      // Set billing address if available
      if (defaultBillingAddress) {
        // Check if fullName needs to be split into firstName/lastName
        let firstName = '', lastName = '';
        if (defaultBillingAddress.fullName) {
          const nameParts = defaultBillingAddress.fullName.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        } else {
          firstName = defaultBillingAddress.firstName || '';
          lastName = defaultBillingAddress.lastName || '';
        }
        
        setBillingAddress(prev => ({
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          addressLine1: defaultBillingAddress.street || prev.addressLine1,
          addressLine2: defaultBillingAddress.apt || prev.addressLine2,
          city: defaultBillingAddress.city || prev.city,
          state: defaultBillingAddress.state || prev.state,
          postalCode: defaultBillingAddress.zipCode || prev.postalCode,
          country: defaultBillingAddress.country || prev.country,
          email: user.email || prev.email,
          phone: defaultBillingAddress.phone || prev.phone
        }));
        
        // Set billing same as shipping if the same address is default for both
        if (defaultShippingAddress && defaultBillingAddress && 
            defaultShippingAddress.id === defaultBillingAddress.id) {
          setBillingIsSameAsShipping(true);
        } else {
          // Only show different billing address if default billing exists
          setBillingIsSameAsShipping(defaultBillingAddress ? false : true);
        }
      }
    }
  }, [user]); // Removed billingIsSameAsShipping from dependencies to prevent re-triggering
  
  // Handle shipping form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle billing form input changes
  const handleBillingInputChange = (e) => {
    const { name, value } = e.target;
    setBillingAddress(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user types
    if (formErrors[`billing_${name}`]) {
      setFormErrors(prev => ({
        ...prev,
        [`billing_${name}`]: null
      }));
    }
  };
  
  // Toggle billing address same as shipping
  const handleBillingToggle = () => {
    // Store new value to use in conditional logic
    const newValue = !billingIsSameAsShipping;
    
    // Update state with new value
    setBillingIsSameAsShipping(newValue);
    
    // If toggling to true (same as shipping), update the billing address to match shipping
    if (newValue) {
      setBillingAddress(shippingAddress);
    }
  };
  
  // Handle selecting a saved address for shipping
  const handleSelectShippingAddress = (addressId) => {
    const selected = savedAddresses.find(addr => addr.id === addressId);
    if (selected) {
      setShippingAddress({
        fullName: selected.fullName || '',
        addressLine1: selected.street || '',
        addressLine2: selected.apt || '',
        city: selected.city || '',
        state: selected.state || '',
        postalCode: selected.zipCode || '',
        country: selected.country || 'US',
        email: user?.email || '',
        phone: selected.phone || ''
      });
      setShowSavedAddresses(false);
    }
  };
  
  // Handle selecting a saved address for billing
  const handleSelectBillingAddress = (addressId) => {
    const selected = savedAddresses.find(addr => addr.id === addressId);
    if (selected) {
      // Extract first/last name from fullName if needed
      let firstName = '', lastName = '';
      if (selected.fullName) {
        const nameParts = selected.fullName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else {
        firstName = selected.firstName || '';
        lastName = selected.lastName || '';
      }
      
      setBillingAddress({
        firstName: firstName,
        lastName: lastName,
        addressLine1: selected.street || '',
        addressLine2: selected.apt || '',
        city: selected.city || '',
        state: selected.state || '',
        postalCode: selected.zipCode || '',
        country: selected.country || 'US',
        email: user?.email || '',
        phone: selected.phone || ''
      });
      setBillingIsSameAsShipping(false);
      setShowSavedAddresses(false);
    }
  };
  
  // Validate shipping and billing forms before proceeding to payment
  const validateShippingForm = () => {
    const errors = {};
    
    // Validate guest checkout fields if applicable
    if (isGuestCheckout) {
      // Guest email is required
      if (!guestEmail?.trim()) {
        errors.guestEmail = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(guestEmail)) {
        errors.guestEmail = 'Please enter a valid email address';
      }
      
      // Validate password if creating an account
      if (createAccount) {
        if (!guestPassword?.trim()) {
          errors.guestPassword = 'Password is required';
        } else if (guestPassword.length < 8) {
          errors.guestPassword = 'Password must be at least 8 characters';
        }
      }
    }
    
    // Required shipping fields
    const requiredFields = ['firstName', 'lastName', 'addressLine1', 'city', 'state', 'postalCode', 'email'];
    requiredFields.forEach(field => {
      if (!shippingAddress[field]?.trim()) {
        errors[field] = 'This field is required';
      }
    });
    
    // Email validation for shipping
    if (shippingAddress.email && !/\S+@\S+\.\S+/.test(shippingAddress.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // US postal code validation (5 digits or 5+4) for shipping
    if (shippingAddress.postalCode && !/^\d{5}(-\d{4})?$/.test(shippingAddress.postalCode)) {
      errors.postalCode = 'Please enter a valid ZIP code';
    }
    
    // US phone validation for shipping
    if (shippingAddress.phone && !/^(\+1|1)?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/.test(shippingAddress.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    // Validate billing address if it's different from shipping
    if (!billingIsSameAsShipping) {
      // Output debug info to console to help identify issues
      console.log("Validating billing address:", billingAddress);
      
      // Required billing fields - use the same fields as shipping
      const billingRequiredFields = ['firstName', 'lastName', 'addressLine1', 'city', 'state', 'postalCode', 'email'];
      
      // Check all required fields
      billingRequiredFields.forEach(field => {
        // Check if the field exists in the billingAddress object
        if (!billingAddress[field] || !billingAddress[field].toString().trim()) {
          errors[`billing_${field}`] = 'This field is required';
        }
      });
      
      // Email validation for billing
      if (billingAddress.email && !/\S+@\S+\.\S+/.test(billingAddress.email)) {
        errors.billing_email = 'Please enter a valid email address';
      }
      
      // US postal code validation (5 digits or 5+4) for billing
      if (billingAddress.postalCode && !/^\d{5}(-\d{4})?$/.test(billingAddress.postalCode)) {
        errors.billing_postalCode = 'Please enter a valid ZIP code';
      }
      
      // US phone validation for billing (optional)
      if (billingAddress.phone && !/^(\+1|1)?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/.test(billingAddress.phone)) {
        errors.billing_phone = 'Please enter a valid phone number';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Navigate to payment step
  const handleProceedToPayment = async () => {
    if (validateShippingForm()) {
      // Handle guest account creation if selected
      if (isGuestCheckout && createAccount) {
        try {
          // Here you would call a function to create a user account
          // For now, we'll just display a message
          console.log('Would create account with:', { email: guestEmail, password: guestPassword });
          
          // You'd typically use Firebase auth or your auth system to create an account
          // const { createUserWithEmailAndPassword } = require('firebase/auth');
          // await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
          
          // Then update the UI
          // setIsGuestCheckout(false);
        } catch (error) {
          console.error('Error creating account:', error);
          setFormErrors(prev => ({
            ...prev,
            guestAccountCreation: 'Failed to create account. Please try again.'
          }));
          return;
        }
      }
      
      // Save addresses if user selected the option and is authenticated
      if (saveAddress && user) {
        await saveNewAddressesToProfile();
      }
      
      // Update shipping email from guest email if guest checkout
      if (isGuestCheckout && guestEmail) {
        setShippingAddress(prev => ({
          ...prev,
          email: guestEmail
        }));
      }
      
      setCheckoutStep(2);
      
      // Scroll to top for better UX
      window.scrollTo(0, 0);
    }
  };
  
  // Handle creating a new account during checkout
  const handleCreateAccount = async () => {
    // Basic validation
    if (!guestEmail || !guestPassword) {
      setFormErrors(prev => ({
        ...prev,
        guestEmail: !guestEmail ? 'Email is required' : null,
        guestPassword: !guestPassword ? 'Password is required' : null
      }));
      return;
    }
    
    if (guestPassword.length < 8) {
      setFormErrors(prev => ({
        ...prev,
        guestPassword: 'Password must be at least 8 characters'
      }));
      return;
    }
    
    try {
      // TODO: Replace with actual Firebase auth call
      // const { createUserWithEmailAndPassword } = require('firebase/auth');
      // const userCredential = await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
      // const newUser = userCredential.user;
      
      console.log('Would create account with:', { 
        email: guestEmail, 
        password: guestPassword,
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName
      });
      
      // Show success message and maintain it
      setAccountCreated(true);
      
      // In a production app, you'd typically:
      // 1. Create the user account with Firebase Auth
      // 2. Update their profile with the name information
      // 3. Set the user's shipping address in their profile
      // 4. Migrate their guest cart to their user cart
      
      // The success message will remain visible throughout checkout
    } catch (error) {
      console.error('Error creating account:', error);
      setFormErrors(prev => ({
        ...prev,
        guestAccountCreation: 'Failed to create account. Please try again.'
      }));
    }
  };
  
  // Save new addresses to user profile
  const saveNewAddressesToProfile = async () => {
    try {
      if (!user || !user.uid) return;
      
      // Convert checkout addresses to the format used in settings
      const newAddresses = [...(user.profile?.addresses || [])];
      
      // Check if shipping address should be saved
      const shippingAddressToSave = {
        id: `addr_${Date.now()}_ship`,
        type: billingIsSameAsShipping ? 'both' : 'shipping',
        // If this is the first address saved, make it the default
        isDefault: newAddresses.length === 0 ? true : false,
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        street: shippingAddress.addressLine1,
        apt: shippingAddress.addressLine2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        phone: shippingAddress.phone
      };
      
      // See if this is a duplicate of an existing address - with better matching
      const isShippingDuplicate = newAddresses.some(addr => {
        // Create normalized versions of addresses for comparison
        const normalizedNew = `${shippingAddressToSave.street}|${shippingAddressToSave.city}|${shippingAddressToSave.state}|${shippingAddressToSave.zipCode}`.toLowerCase().replace(/\s+/g, ' ');
        const normalizedExisting = `${addr.street}|${addr.city}|${addr.state}|${addr.zipCode}`.toLowerCase().replace(/\s+/g, ' ');
        return normalizedNew === normalizedExisting;
      });
      
      // Add shipping address if it's not a duplicate
      if (!isShippingDuplicate) {
        newAddresses.push(shippingAddressToSave);
        console.log('Saved new shipping address to profile:', shippingAddressToSave);
      } else {
        console.log('Shipping address is a duplicate of an existing address - not saving');
        // If it's a duplicate, we should check if the existing address should have its type updated
        const existingAddress = newAddresses.find(addr => {
          const normalizedNew = `${shippingAddressToSave.street}|${shippingAddressToSave.city}|${shippingAddressToSave.state}|${shippingAddressToSave.zipCode}`.toLowerCase().replace(/\s+/g, ' ');
          const normalizedExisting = `${addr.street}|${addr.city}|${addr.state}|${addr.zipCode}`.toLowerCase().replace(/\s+/g, ' ');
          return normalizedNew === normalizedExisting;
        });
        
        // If the existing address is billing only and we're using it for shipping, update it to 'both'
        if (existingAddress && existingAddress.type === 'billing' && !billingIsSameAsShipping) {
          existingAddress.type = 'both';
          console.log('Updated existing address type to "both":', existingAddress);
        }
      }
      
      // Check if billing address should be saved (if different from shipping)
      if (!billingIsSameAsShipping) {
        const billingAddressToSave = {
          id: `addr_${Date.now()}_bill`,
          type: 'billing',
          // Make default billing address if no other billing addresses exist
          isDefault: !newAddresses.some(addr => (addr.type === 'billing' || addr.type === 'both') && addr.isDefault),
          firstName: billingAddress.firstName,
          lastName: billingAddress.lastName,
          street: billingAddress.addressLine1,
          apt: billingAddress.addressLine2,
          city: billingAddress.city,
          state: billingAddress.state,
          zipCode: billingAddress.postalCode,
          country: billingAddress.country,
          phone: billingAddress.phone
        };
        
        // See if this is a duplicate of an existing address
        const isBillingDuplicate = newAddresses.some(addr => {
          // Create normalized versions of addresses for comparison
          const normalizedNew = `${billingAddressToSave.street}|${billingAddressToSave.city}|${billingAddressToSave.state}|${billingAddressToSave.zipCode}`.toLowerCase().replace(/\s+/g, ' ');
          const normalizedExisting = `${addr.street}|${addr.city}|${addr.state}|${addr.zipCode}`.toLowerCase().replace(/\s+/g, ' ');
          return normalizedNew === normalizedExisting;
        });
        
        // Add billing address if it's not a duplicate
        if (!isBillingDuplicate) {
          newAddresses.push(billingAddressToSave);
          console.log('Saved new billing address to profile:', billingAddressToSave);
        } else {
          console.log('Billing address is a duplicate of an existing address - not saving');
          // If it's a duplicate, we should check if the existing address should have its type updated
          const existingAddress = newAddresses.find(addr => {
            const normalizedNew = `${billingAddressToSave.street}|${billingAddressToSave.city}|${billingAddressToSave.state}|${billingAddressToSave.zipCode}`.toLowerCase().replace(/\s+/g, ' ');
            const normalizedExisting = `${addr.street}|${addr.city}|${addr.state}|${addr.zipCode}`.toLowerCase().replace(/\s+/g, ' ');
            return normalizedNew === normalizedExisting;
          });
          
          // If the existing address is shipping only and we're using it for billing, update it to 'both'
          if (existingAddress && existingAddress.type === 'shipping') {
            existingAddress.type = 'both';
            console.log('Updated existing address type to "both":', existingAddress);
          }
        }
      }
      
      // If there are new addresses to save or we updated existing ones
      await updateUserAddress(user.uid, { addresses: newAddresses });
      setSavedAddresses(newAddresses);
      console.log('Updated addresses in user profile:', newAddresses);
      
    } catch (error) {
      console.error('Error saving addresses to profile:', error);
      // We don't block checkout if address saving fails
    }
  };
  
  // Go back to shipping step
  const handleBackToShipping = () => {
    setCheckoutStep(1);
    
    // Scroll to top for better UX
    window.scrollTo(0, 0);
  };
  
  // Format price as USD
  const formatPrice = (price) => {
    if (!price && price !== 0) return '$0';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Calculate subtotal
  const calculateSubtotal = () => {
    if (!cart || !cart.items || cart.items.length === 0) return 0;
    
    return cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  // Calculate estimated tax (for display purposes)
  const calculateEstimatedTax = () => {
    const subtotal = calculateSubtotal();
    // Assuming a 8.25% tax rate for display purposes
    return subtotal * 0.0825;
  };

  // Calculate total
  const calculateTotal = () => {
    return calculateSubtotal() + calculateEstimatedTax();
  };
  
  if (loading) {
    return (
      <div>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-benchlot-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-benchlot-primary font-medium">Preparing checkout...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
        <Link
          to="/cart"
          className="inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Return to Cart
        </Link>
      </div>
    );
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    return null; // This will be handled by the useEffect
  }
  
  return (
    <div>
      {/* Checkout Progress Indicator */}
      <div className="mb-8">
        <ol className="flex items-center w-full">
          <li className={`flex items-center text-benchlot-primary ${checkoutStep === 1 ? 'font-semibold' : ''}`}>
            <span className={`flex items-center justify-center w-6 h-6 rounded-full ${
              checkoutStep === 1 ? 'bg-benchlot-primary text-white' : 
              checkoutStep > 1 ? 'bg-green-100 text-green-600' : 'bg-stone-100'
            } mr-2`}>
              {checkoutStep > 1 ? <Check className="w-3 h-3" /> : '1'}
            </span>
            Shipping
          </li>
          <div className="w-24 h-[2px] mx-2 bg-stone-200"></div>
          <li className={`flex items-center ${checkoutStep === 2 ? 'text-benchlot-primary font-semibold' : 'text-stone-500'}`}>
            <span className={`flex items-center justify-center w-6 h-6 rounded-full ${
              checkoutStep === 2 ? 'bg-benchlot-primary text-white' : 'bg-stone-100'
            } mr-2`}>
              2
            </span>
            Payment
          </li>
        </ol>
      </div>
      
      <p className="text-benchlot-text-secondary mb-6">
        {checkoutStep === 1 ? 'Enter your shipping information' : 'Complete your purchase'}
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Order Summary - Left column on larger screens */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <div className="bg-white rounded-lg shadow-card overflow-hidden sticky top-8">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-xl font-serif font-semibold text-stone-800 mb-4">Order Summary</h2>
              
              <div className="divide-y divide-stone-100">
                {cart.items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-md bg-stone-100 overflow-hidden mr-3 flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-stone-400">No img</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-stone-800 line-clamp-1">{item.name}</div>
                        <div className="text-xs text-stone-500">Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-stone-800">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-stone-50">
              {/* Show shipping and billing info summary on step 2 */}
              {checkoutStep === 2 && (
                <div className="mb-4">
                  {/* Shipping Address */}
                  <div className="border-b border-stone-200 pb-4 mb-4">
                    <h3 className="text-sm font-medium text-stone-800 mb-2 flex items-center">
                      <Truck className="h-4 w-4 mr-1.5 text-benchlot-primary" />
                      Shipping To:
                    </h3>
                    <div className="text-sm text-stone-600">
                      <p className="font-medium">{`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()}</p>
                      <p>{shippingAddress.addressLine1}</p>
                      {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                      <p>{`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`}</p>
                      <p>{shippingAddress.country}</p>
                      <p className="mt-1">{shippingAddress.phone}</p>
                      <p>{shippingAddress.email}</p>
                    </div>
                  </div>
                  
                  {/* Billing Address (show only if different from shipping) */}
                  {!billingIsSameAsShipping && (
                    <div className="border-b border-stone-200 pb-4 mb-4">
                      <h3 className="text-sm font-medium text-stone-800 mb-2 flex items-center">
                        <CreditCardIcon className="h-4 w-4 mr-1.5 text-benchlot-primary" />
                        Billing Address:
                      </h3>
                      <div className="text-sm text-stone-600">
                        <p className="font-medium">{`${billingAddress.firstName} ${billingAddress.lastName}`.trim()}</p>
                        <p>{billingAddress.addressLine1}</p>
                        {billingAddress.addressLine2 && <p>{billingAddress.addressLine2}</p>}
                        <p>{`${billingAddress.city}, ${billingAddress.state} ${billingAddress.postalCode}`}</p>
                        <p>{billingAddress.country}</p>
                        <p className="mt-1">{billingAddress.phone}</p>
                        <p>{billingAddress.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* If billing is same as shipping, show note */}
                  {billingIsSameAsShipping && (
                    <div className="border-b border-stone-200 pb-4 mb-4">
                      <h3 className="text-sm font-medium text-stone-800 mb-2 flex items-center">
                        <CreditCardIcon className="h-4 w-4 mr-1.5 text-benchlot-primary" />
                        Billing Address:
                      </h3>
                      <div className="text-sm text-stone-600 italic">
                        Same as shipping address
                      </div>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleBackToShipping}
                    className="text-xs text-benchlot-primary hover:text-benchlot-secondary mt-2 inline-flex items-center"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Edit Addresses
                  </button>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-600">Subtotal:</span>
                  <span className="text-stone-800 font-medium">{formatPrice(calculateSubtotal())}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-stone-600">Estimated Tax:</span>
                  <span className="text-stone-800 font-medium">{formatPrice(calculateEstimatedTax())}</span>
                </div>
                
                {/* We could add shipping cost here if applicable */}
                <div className="flex justify-between pt-2 border-t border-stone-200">
                  <span className="text-stone-800 font-semibold">Total:</span>
                  <span className="text-xl text-benchlot-primary font-bold">{formatPrice(calculateTotal())}</span>
                </div>
              </div>
              
              <div className="mt-6">
                {checkoutStep === 1 ? (
                  <Link
                    to="/cart"
                    className="inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Cart
                  </Link>
                ) : (
                  <button
                    onClick={handleBackToShipping}
                    className="inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Shipping
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column - Shipping Address or Payment */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          {/* Step 1: Shipping Address Form */}
          {checkoutStep === 1 && (
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
              <div className="p-6 border-b border-stone-200">
                <h2 className="text-xl font-serif font-semibold text-stone-800 mb-2 flex items-center">
                  <Truck className="h-5 w-5 mr-2 text-benchlot-primary" />
                  Shipping Address
                </h2>
                <p className="text-stone-600 text-sm">Enter your shipping information for delivery</p>
              </div>
              
              <div className="p-6">
                <form className="space-y-5">
                  
                  {/* Contact Information Section - for all users */}
                  <div className="mb-6 border-b border-stone-200 pb-6">
                    <h3 className="text-md font-medium mb-3 text-stone-800 flex items-center">
                      <User className="h-4 w-4 mr-2 text-benchlot-primary" />
                      Contact Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* First Name */}
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                            formErrors.firstName ? 'border-red-300 bg-red-50' : 'border-stone-300'
                          }`}
                          value={shippingAddress.firstName}
                          onChange={handleInputChange}
                        />
                        {formErrors.firstName && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
                        )}
                      </div>
                      
                      {/* Last Name */}
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-stone-700 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                            formErrors.lastName ? 'border-red-300 bg-red-50' : 'border-stone-300'
                          }`}
                          value={shippingAddress.lastName}
                          onChange={handleInputChange}
                        />
                        {formErrors.lastName && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Phone (optional) */}
                    <div className="mb-4">
                      <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-1">
                        Phone (optional)
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          className={`w-full pl-9 pr-3 py-2 border rounded-md text-stone-800 ${
                            formErrors.phone ? 'border-red-300 bg-red-50' : 'border-stone-300'
                          }`}
                          value={shippingAddress.phone}
                          onChange={handleInputChange}
                          placeholder="(123) 456-7890"
                        />
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                      </div>
                      {formErrors.phone && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className={`w-full pl-9 pr-3 py-2 border rounded-md text-stone-800 ${
                            formErrors.email ? 'border-red-300 bg-red-50' : 'border-stone-300'
                          }`}
                          value={isGuestCheckout ? guestEmail : shippingAddress.email}
                          onChange={(e) => {
                            if (isGuestCheckout) {
                              setGuestEmail(e.target.value);
                              setShippingAddress(prev => ({...prev, email: e.target.value}));
                            } else {
                              handleInputChange(e);
                            }
                          }}
                          placeholder="Your email address"
                        />
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                      </div>
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                      )}
                      <p className="mt-1 text-xs text-stone-500">We'll send your order confirmation to this email</p>
                    </div>
                    
                    {/* Guest Checkout Options */}
                    {isGuestCheckout && (
                      <>
                        {/* Account Creation Success Message */}
                        {accountCreated ? (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
                            <Check className="h-5 w-5 mr-2 text-green-500" />
                            <div>
                              <p className="font-medium">Account created successfully!</p>
                              <p className="text-sm">You can now sign in with your email and password.</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Create account checkbox */}
                            <div className="flex items-center mb-4">
                              <input
                                id="createAccount"
                                name="createAccount"
                                type="checkbox"
                                className="h-4 w-4 rounded border-stone-300 text-benchlot-primary focus:ring-benchlot-primary"
                                checked={createAccount}
                                onChange={() => setCreateAccount(!createAccount)}
                              />
                              <label htmlFor="createAccount" className="ml-2 block text-sm text-stone-700">
                                Create an account for faster checkout next time
                              </label>
                            </div>
                            
                            {/* Password field - only shown if createAccount is checked */}
                            {createAccount && (
                              <div className="mb-4">
                                <label htmlFor="guestPassword" className="block text-sm font-medium text-stone-700 mb-1">
                                  Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="password"
                                  id="guestPassword"
                                  name="guestPassword"
                                  className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                                    formErrors.guestPassword ? 'border-red-300 bg-red-50' : 'border-stone-300'
                                  }`}
                                  value={guestPassword}
                                  onChange={(e) => setGuestPassword(e.target.value)}
                                  placeholder="Create a password"
                                />
                                {formErrors.guestPassword && (
                                  <p className="mt-1 text-sm text-red-600">{formErrors.guestPassword}</p>
                                )}
                                <p className="mt-1 text-xs text-stone-500">Must be at least 8 characters</p>
                                
                                {/* Create Account Button */}
                                <button
                                  type="button"
                                  onClick={handleCreateAccount}
                                  className="mt-3 px-4 py-2 bg-benchlot-primary text-white font-medium rounded-md hover:bg-benchlot-secondary transition-colors"
                                >
                                  Create Account
                                </button>
                                
                                {/* Show any specific account creation errors */}
                                {formErrors.guestAccountCreation && (
                                  <p className="mt-2 text-sm text-red-600">{formErrors.guestAccountCreation}</p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Shipping Address Section */}
                  <div>
                    <h3 className="text-md font-medium mb-3 text-stone-800 flex items-center">
                      <Home className="h-4 w-4 mr-2 text-benchlot-primary" />
                      Shipping Address
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-6">
                        <label htmlFor="addressLine1" className="block text-sm font-medium text-stone-700 mb-1">
                          Address Line 1 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="addressLine1"
                            name="addressLine1"
                            className={`w-full pl-9 pr-3 py-2 border rounded-md text-stone-800 ${
                              formErrors.addressLine1 ? 'border-red-300 bg-red-50' : 'border-stone-300'
                            }`}
                            value={shippingAddress.addressLine1}
                            onChange={handleInputChange}
                            placeholder="Street address or P.O. Box"
                          />
                          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                        </div>
                        {formErrors.addressLine1 && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.addressLine1}</p>
                        )}
                      </div>
                      
                      <div className="md:col-span-6">
                        <label htmlFor="addressLine2" className="block text-sm font-medium text-stone-700 mb-1">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          id="addressLine2"
                          name="addressLine2"
                          className="w-full px-3 py-2 border border-stone-300 rounded-md text-stone-800"
                          value={shippingAddress.addressLine2}
                          onChange={handleInputChange}
                          placeholder="Apartment, suite, unit, building, floor, etc."
                        />
                      </div>
                      
                      <div className="md:col-span-3">
                        <label htmlFor="city" className="block text-sm font-medium text-stone-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                            formErrors.city ? 'border-red-300 bg-red-50' : 'border-stone-300'
                          }`}
                          value={shippingAddress.city}
                          onChange={handleInputChange}
                        />
                        {formErrors.city && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.city}</p>
                        )}
                      </div>
                      
                      <div className="md:col-span-1">
                        <label htmlFor="state" className="block text-sm font-medium text-stone-700 mb-1">
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="state"
                          name="state"
                          className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                            formErrors.state ? 'border-red-300 bg-red-50' : 'border-stone-300'
                          }`}
                          value={shippingAddress.state}
                          onChange={handleInputChange}
                        >
                          <option value="">Select</option>
                          <option value="AL">AL</option>
                          <option value="AK">AK</option>
                          <option value="AZ">AZ</option>
                          <option value="AR">AR</option>
                          <option value="CA">CA</option>
                          <option value="CO">CO</option>
                          <option value="CT">CT</option>
                          <option value="DE">DE</option>
                          <option value="FL">FL</option>
                          <option value="GA">GA</option>
                          <option value="HI">HI</option>
                          <option value="ID">ID</option>
                          <option value="IL">IL</option>
                          <option value="IN">IN</option>
                          <option value="IA">IA</option>
                          <option value="KS">KS</option>
                          <option value="KY">KY</option>
                          <option value="LA">LA</option>
                          <option value="ME">ME</option>
                          <option value="MD">MD</option>
                          <option value="MA">MA</option>
                          <option value="MI">MI</option>
                          <option value="MN">MN</option>
                          <option value="MS">MS</option>
                          <option value="MO">MO</option>
                          <option value="MT">MT</option>
                          <option value="NE">NE</option>
                          <option value="NV">NV</option>
                          <option value="NH">NH</option>
                          <option value="NJ">NJ</option>
                          <option value="NM">NM</option>
                          <option value="NY">NY</option>
                          <option value="NC">NC</option>
                          <option value="ND">ND</option>
                          <option value="OH">OH</option>
                          <option value="OK">OK</option>
                          <option value="OR">OR</option>
                          <option value="PA">PA</option>
                          <option value="RI">RI</option>
                          <option value="SC">SC</option>
                          <option value="SD">SD</option>
                          <option value="TN">TN</option>
                          <option value="TX">TX</option>
                          <option value="UT">UT</option>
                          <option value="VT">VT</option>
                          <option value="VA">VA</option>
                          <option value="WA">WA</option>
                          <option value="WV">WV</option>
                          <option value="WI">WI</option>
                          <option value="WY">WY</option>
                          <option value="DC">DC</option>
                        </select>
                        {formErrors.state && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.state}</p>
                        )}
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="postalCode" className="block text-sm font-medium text-stone-700 mb-1">
                          ZIP Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="postalCode"
                          name="postalCode"
                          className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                            formErrors.postalCode ? 'border-red-300 bg-red-50' : 'border-stone-300'
                          }`}
                          value={shippingAddress.postalCode}
                          onChange={handleInputChange}
                          placeholder="12345"
                        />
                        {formErrors.postalCode && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.postalCode}</p>
                        )}
                      </div>
                      
                      <div className="md:col-span-6">
                        <label htmlFor="country" className="block text-sm font-medium text-stone-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          id="country"
                          name="country"
                          className="w-full px-3 py-2 border border-stone-300 rounded-md bg-stone-50 text-stone-800"
                          value={shippingAddress.country}
                          disabled
                        />
                        <p className="mt-1 text-xs text-stone-500">We currently only ship within the United States</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Saved addresses section */}
                  {savedAddresses.length > 0 && (
                    <div className="mb-6">
                      {/* Currently using saved address indicator */}
                      {selectedSavedAddress && (
                        <div className="mb-3 p-3 bg-stone-50 border border-stone-200 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <Check className="h-4 w-4 text-green-600 mr-2" />
                              <span className="text-sm font-medium text-stone-800">Using saved address</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setSelectedSavedAddress(null)}
                              className="text-xs text-stone-500 hover:text-benchlot-primary"
                            >
                              Clear
                            </button>
                          </div>
                          
                          {(() => {
                            const address = savedAddresses.find(addr => addr.id === selectedSavedAddress);
                            if (address) {
                              return (
                                <div className="text-xs text-stone-600">
                                  <p className="font-medium">{address.firstName && address.lastName ? `${address.firstName} ${address.lastName}` : address.fullName || ''}</p>
                                  <p>{address.street}{address.apt ? `, ${address.apt}` : ''}</p>
                                  <p>{address.city}, {address.state} {address.zipCode}</p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      
                      {/* Saved addresses dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                          className="w-full flex justify-between items-center px-4 py-2 border border-stone-300 rounded-md bg-white text-left"
                        >
                          <span className="flex items-center text-stone-800">
                            <Package className="h-4 w-4 mr-2 text-benchlot-primary" />
                            Select from saved addresses
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${showSavedAddresses ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showSavedAddresses && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            <ul className="py-1">
                              {savedAddresses
                                .filter(addr => addr.type === 'shipping' || addr.type === 'both')
                                .map(address => (
                                  <li 
                                    key={address.id}
                                    className={`px-4 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0 ${
                                      selectedSavedAddress === address.id ? 'bg-stone-100' : ''
                                    }`}
                                    onClick={() => handleSelectShippingAddress(address.id)}
                                  >
                                    <div className="flex justify-between">
                                      <span className="font-medium">{address.firstName && address.lastName ? `${address.firstName} ${address.lastName}` : address.fullName || ''}</span>
                                      <div className="flex items-center">
                                        {selectedSavedAddress === address.id && (
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mr-2">
                                            Selected
                                          </span>
                                        )}
                                        {address.isDefault && (
                                          <span className="text-xs bg-benchlot-accent text-benchlot-primary px-2 py-0.5 rounded-full">
                                            Default
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-start mt-1">
                                      <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded mr-2">
                                        {address.type === 'both' ? 'Shipping & Billing' : address.type}
                                      </span>
                                      <p className="text-sm text-stone-600 truncate">
                                        {address.street}{address.apt ? `, ${address.apt}` : ''}, {address.city}, {address.state} {address.zipCode}
                                      </p>
                                    </div>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Save address for future purchases */}
                  <div className="flex items-center mb-6">
                    <input
                      id="saveAddress"
                      name="saveAddress"
                      type="checkbox"
                      className="h-4 w-4 rounded border-stone-300 text-benchlot-primary focus:ring-benchlot-primary"
                      checked={saveAddress}
                      onChange={() => setSaveAddress(!saveAddress)}
                    />
                    <label htmlFor="saveAddress" className="ml-2 block text-sm text-stone-700">
                      Save this address for future purchases
                    </label>
                  </div>
                  
                  {/* Billing Address Section */}
                  <div className="mb-8 border-t border-stone-200 pt-6">
                    <h3 className="text-md font-medium mb-3 text-stone-800 flex items-center">
                      <CreditCardIcon className="h-4 w-4 mr-2 text-benchlot-primary" />
                      Billing Address
                    </h3>
                    
                    {/* Same as shipping checkbox */}
                    <div className="flex items-center mb-6">
                      <input
                        id="billingIsSameAsShipping"
                        name="billingIsSameAsShipping"
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-benchlot-primary focus:ring-benchlot-primary"
                        checked={billingIsSameAsShipping}
                        onChange={handleBillingToggle}
                      />
                      <label htmlFor="billingIsSameAsShipping" className="ml-2 block text-sm text-stone-700">
                        Billing address is the same as shipping address
                      </label>
                    </div>
                    
                    {/* Billing address form (show only if different from shipping) */}
                    {!billingIsSameAsShipping && (
                      <>
                        {/* Saved billing addresses section */}
                        {savedAddresses.length > 0 && (
                          <div className="mb-6">
                            {/* Currently using saved billing address indicator */}
                            {!billingIsSameAsShipping && selectedSavedAddress && (
                              <div className="mb-3 p-3 bg-stone-50 border border-stone-200 rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center">
                                    <Check className="h-4 w-4 text-green-600 mr-2" />
                                    <span className="text-sm font-medium text-stone-800">Using saved billing address</span>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => setSelectedSavedAddress(null)}
                                    className="text-xs text-stone-500 hover:text-benchlot-primary"
                                  >
                                    Clear
                                  </button>
                                </div>
                                
                                {(() => {
                                  const address = savedAddresses.find(addr => addr.id === selectedSavedAddress);
                                  if (address) {
                                    return (
                                      <div className="text-xs text-stone-600">
                                        <p className="font-medium">{address.firstName && address.lastName ? `${address.firstName} ${address.lastName}` : address.fullName || ''}</p>
                                        <p>{address.street}{address.apt ? `, ${address.apt}` : ''}</p>
                                        <p>{address.city}, {address.state} {address.zipCode}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                            
                            {/* Saved billing addresses dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                                className="w-full flex justify-between items-center px-4 py-2 border border-stone-300 rounded-md bg-white text-left"
                              >
                                <span className="flex items-center text-stone-800">
                                  <Wallet className="h-4 w-4 mr-2 text-benchlot-primary" />
                                  Select from saved billing addresses
                                </span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${showSavedAddresses ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {showSavedAddresses && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                  <ul className="py-1">
                                    {savedAddresses
                                      .filter(addr => addr.type === 'billing' || addr.type === 'both')
                                      .map(address => (
                                        <li 
                                          key={address.id}
                                          className={`px-4 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0 ${
                                            selectedSavedAddress === address.id ? 'bg-stone-100' : ''
                                          }`}
                                          onClick={() => handleSelectBillingAddress(address.id)}
                                        >
                                          <div className="flex justify-between">
                                            <span className="font-medium">{address.firstName && address.lastName ? `${address.firstName} ${address.lastName}` : address.fullName || ''}</span>
                                            <div className="flex items-center">
                                              {selectedSavedAddress === address.id && !billingIsSameAsShipping && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mr-2">
                                                  Selected
                                                </span>
                                              )}
                                              {address.isDefault && (
                                                <span className="text-xs bg-benchlot-accent text-benchlot-primary px-2 py-0.5 rounded-full">
                                                  Default
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-start mt-1">
                                            <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded mr-2">
                                              {address.type === 'both' ? 'Shipping & Billing' : address.type}
                                            </span>
                                            <p className="text-sm text-stone-600 truncate">
                                              {address.street}{address.apt ? `, ${address.apt}` : ''}, {address.city}, {address.state} {address.zipCode}
                                            </p>
                                          </div>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Billing Contact Information */}
                        <div className="mb-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="billing_firstName" className="block text-sm font-medium text-stone-700 mb-1">
                                First Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                id="billing_firstName"
                                name="firstName"
                                className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                                  formErrors.billing_firstName ? 'border-red-300 bg-red-50' : 'border-stone-300'
                                }`}
                                value={billingAddress.firstName}
                                onChange={handleBillingInputChange}
                              />
                              {formErrors.billing_firstName && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.billing_firstName}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="billing_lastName" className="block text-sm font-medium text-stone-700 mb-1">
                                Last Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                id="billing_lastName"
                                name="lastName"
                                className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                                  formErrors.billing_lastName ? 'border-red-300 bg-red-50' : 'border-stone-300'
                                }`}
                                value={billingAddress.lastName}
                                onChange={handleBillingInputChange}
                              />
                              {formErrors.billing_lastName && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.billing_lastName}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="billing_email" className="block text-sm font-medium text-stone-700 mb-1">
                                Email <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="email"
                                  id="billing_email"
                                  name="email"
                                  className={`w-full pl-9 pr-3 py-2 border rounded-md text-stone-800 ${
                                    formErrors.billing_email ? 'border-red-300 bg-red-50' : 'border-stone-300'
                                  }`}
                                  value={billingAddress.email}
                                  onChange={handleBillingInputChange}
                                />
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                              </div>
                              {formErrors.billing_email && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.billing_email}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="billing_phone" className="block text-sm font-medium text-stone-700 mb-1">
                                Phone (optional)
                              </label>
                              <div className="relative">
                                <input
                                  type="tel"
                                  id="billing_phone"
                                  name="phone"
                                  className={`w-full pl-9 pr-3 py-2 border rounded-md text-stone-800 ${
                                    formErrors.billing_phone ? 'border-red-300 bg-red-50' : 'border-stone-300'
                                  }`}
                                  value={billingAddress.phone}
                                  onChange={handleBillingInputChange}
                                  placeholder="(123) 456-7890"
                                />
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                              </div>
                              {formErrors.billing_phone && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.billing_phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Billing Address Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div className="md:col-span-6">
                            <label htmlFor="billing_addressLine1" className="block text-sm font-medium text-stone-700 mb-1">
                              Address Line 1 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                id="billing_addressLine1"
                                name="addressLine1"
                                className={`w-full pl-9 pr-3 py-2 border rounded-md text-stone-800 ${
                                  formErrors.billing_addressLine1 ? 'border-red-300 bg-red-50' : 'border-stone-300'
                                }`}
                                value={billingAddress.addressLine1}
                                onChange={handleBillingInputChange}
                                placeholder="Street address or P.O. Box"
                              />
                              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                            </div>
                            {formErrors.billing_addressLine1 && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.billing_addressLine1}</p>
                            )}
                          </div>
                          
                          <div className="md:col-span-6">
                            <label htmlFor="billing_addressLine2" className="block text-sm font-medium text-stone-700 mb-1">
                              Address Line 2
                            </label>
                            <input
                              type="text"
                              id="billing_addressLine2"
                              name="addressLine2"
                              className="w-full px-3 py-2 border border-stone-300 rounded-md text-stone-800"
                              value={billingAddress.addressLine2}
                              onChange={handleBillingInputChange}
                              placeholder="Apartment, suite, unit, building, floor, etc."
                            />
                          </div>
                          
                          <div className="md:col-span-3">
                            <label htmlFor="billing_city" className="block text-sm font-medium text-stone-700 mb-1">
                              City <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="billing_city"
                              name="city"
                              className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                                formErrors.billing_city ? 'border-red-300 bg-red-50' : 'border-stone-300'
                              }`}
                              value={billingAddress.city}
                              onChange={handleBillingInputChange}
                            />
                            {formErrors.billing_city && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.billing_city}</p>
                            )}
                          </div>
                          
                          <div className="md:col-span-1">
                            <label htmlFor="billing_state" className="block text-sm font-medium text-stone-700 mb-1">
                              State <span className="text-red-500">*</span>
                            </label>
                            <select
                              id="billing_state"
                              name="state"
                              className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                                formErrors.billing_state ? 'border-red-300 bg-red-50' : 'border-stone-300'
                              }`}
                              value={billingAddress.state}
                              onChange={handleBillingInputChange}
                            >
                              <option value="">Select</option>
                              <option value="AL">AL</option>
                              <option value="AK">AK</option>
                              <option value="AZ">AZ</option>
                              <option value="AR">AR</option>
                              <option value="CA">CA</option>
                              <option value="CO">CO</option>
                              <option value="CT">CT</option>
                              <option value="DE">DE</option>
                              <option value="FL">FL</option>
                              <option value="GA">GA</option>
                              <option value="HI">HI</option>
                              <option value="ID">ID</option>
                              <option value="IL">IL</option>
                              <option value="IN">IN</option>
                              <option value="IA">IA</option>
                              <option value="KS">KS</option>
                              <option value="KY">KY</option>
                              <option value="LA">LA</option>
                              <option value="ME">ME</option>
                              <option value="MD">MD</option>
                              <option value="MA">MA</option>
                              <option value="MI">MI</option>
                              <option value="MN">MN</option>
                              <option value="MS">MS</option>
                              <option value="MO">MO</option>
                              <option value="MT">MT</option>
                              <option value="NE">NE</option>
                              <option value="NV">NV</option>
                              <option value="NH">NH</option>
                              <option value="NJ">NJ</option>
                              <option value="NM">NM</option>
                              <option value="NY">NY</option>
                              <option value="NC">NC</option>
                              <option value="ND">ND</option>
                              <option value="OH">OH</option>
                              <option value="OK">OK</option>
                              <option value="OR">OR</option>
                              <option value="PA">PA</option>
                              <option value="RI">RI</option>
                              <option value="SC">SC</option>
                              <option value="SD">SD</option>
                              <option value="TN">TN</option>
                              <option value="TX">TX</option>
                              <option value="UT">UT</option>
                              <option value="VT">VT</option>
                              <option value="VA">VA</option>
                              <option value="WA">WA</option>
                              <option value="WV">WV</option>
                              <option value="WI">WI</option>
                              <option value="WY">WY</option>
                              <option value="DC">DC</option>
                            </select>
                            {formErrors.billing_state && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.billing_state}</p>
                            )}
                          </div>
                          
                          <div className="md:col-span-2">
                            <label htmlFor="billing_postalCode" className="block text-sm font-medium text-stone-700 mb-1">
                              ZIP Code <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="billing_postalCode"
                              name="postalCode"
                              className={`w-full px-3 py-2 border rounded-md text-stone-800 ${
                                formErrors.billing_postalCode ? 'border-red-300 bg-red-50' : 'border-stone-300'
                              }`}
                              value={billingAddress.postalCode}
                              onChange={handleBillingInputChange}
                              placeholder="12345"
                            />
                            {formErrors.billing_postalCode && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.billing_postalCode}</p>
                            )}
                          </div>
                          
                          <div className="md:col-span-6">
                            <label htmlFor="billing_country" className="block text-sm font-medium text-stone-700 mb-1">
                              Country
                            </label>
                            <input
                              type="text"
                              id="billing_country"
                              name="country"
                              className="w-full px-3 py-2 border border-stone-300 rounded-md bg-stone-50 text-stone-800"
                              value={billingAddress.country}
                              disabled
                            />
                            <p className="mt-1 text-xs text-stone-500">We currently only support US billing addresses</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Continue to Payment button */}
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={handleProceedToPayment}
                      className="w-full py-3 px-6 bg-benchlot-primary text-white font-medium rounded-md hover:bg-benchlot-secondary transition-colors flex items-center justify-center"
                    >
                      Continue to Payment
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Step 2: Payment Form */}
          {checkoutStep === 2 && (
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
              <div className="p-6 border-b border-stone-200">
                <h2 className="text-xl font-serif font-semibold text-stone-800 mb-2 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-benchlot-primary" />
                  Payment Details
                </h2>
                <p className="text-stone-600 text-sm">All transactions are secure and encrypted</p>
              </div>
              
              <div className="p-6">
                {/* Enhanced Security Badge */}
                <div className="mb-6 flex items-center bg-green-50 text-green-700 p-3 rounded-md">
                  <ShieldCheck className="h-5 w-5 mr-2 text-green-600" />
                  <div>
                    <span className="text-sm font-medium">Secure Checkout</span>
                    <p className="text-xs text-green-600 mt-1">Your payment information is protected with industry-standard encryption</p>
                  </div>
                </div>
                
                {/* Stripe Checkout Component */}
                <div className="mb-6">
                  <StripeCheckout 
                    cartId={cart.id} 
                    amount={calculateTotal()} 
                    shippingAddress={shippingAddress}
                    billingAddress={billingIsSameAsShipping ? shippingAddress : billingAddress}
                    billingIsSameAsShipping={billingIsSameAsShipping}
                    isGuestCheckout={isGuestCheckout}
                    guestEmail={guestEmail}
                  />
                </div>
                
                {/* Trust badges and information */}
                <div className="mt-8 pt-6 border-t border-stone-200">
                  <div className="flex items-start text-stone-600 text-sm mb-5">
                    <Lock className="h-4 w-4 text-stone-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Your personal data will be used to process your order, support your experience, and for other purposes described in our privacy policy.</span>
                  </div>
                  
                  {/* Customer testimonial */}
                  <div className="bg-stone-50 p-4 rounded-md border border-stone-200">
                    <div className="flex items-start">
                      <div className="mr-3 w-10 h-10 rounded-full bg-stone-300 flex items-center justify-center flex-shrink-0">
                        <span className="text-stone-600 font-medium">S</span>
                      </div>
                      <div>
                        <div className="flex text-yellow-400 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-xs italic text-stone-600">"As a woodworker, I needed quality tools quickly. The checkout process was simple and secure, and my order arrived in perfect condition."</p>
                        <p className="text-xs font-medium mt-1">Sarah K. - Verified Buyer</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;