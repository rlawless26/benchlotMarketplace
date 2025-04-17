/**
 * PasswordSettings Component
 * Allows users to change their password
 */
import React, { useState } from 'react';
import { Eye, EyeOff, Check, AlertCircle, Loader } from 'lucide-react';
import { updatePassword } from '../../firebase/models/userModel';

const PasswordSettings = () => {
  // State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Password validation states
  const [validations, setValidations] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
    passwordsMatch: false
  });
  
  // Handle form changes and validate in real-time
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate password as user types
    if (name === 'newPassword') {
      setValidations({
        hasMinLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
        hasSpecial: /[^A-Za-z0-9]/.test(value),
        passwordsMatch: value === passwordData.confirmPassword
      });
    }
    
    // Check if passwords match
    if (name === 'confirmPassword') {
      setValidations(prev => ({
        ...prev,
        passwordsMatch: value === passwordData.newPassword
      }));
    }
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    switch (field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'new':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword);
        break;
      default:
        break;
    }
  };
  
  // Validate password requirements
  const validatePassword = () => {
    const { newPassword, confirmPassword } = passwordData;
    
    const validations = {
      hasMinLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
      passwordsMatch: newPassword === confirmPassword
    };
    
    setValidations(validations);
    
    return Object.values(validations).every(Boolean);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    
    // Form validation
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    // Validate password requirements
    if (!validatePassword()) {
      setError('Password does not meet all requirements');
      return;
    }
    
    // Update password
    setSaving(true);
    setError(null);
    
    try {
      await updatePassword(currentPassword, newPassword);
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      let errorMessage = 'Failed to update password';
      if (err.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  
  // Render password strength indicator
  const renderPasswordStrength = () => {
    const { hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial } = validations;
    
    // Calculate strength (0-5)
    const strength = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
    
    // Strength labels and colors
    const strengthLabels = ['Very weak', 'Weak', 'Moderate', 'Strong', 'Very strong'];
    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
    
    // Only show if user has started typing
    if (passwordData.newPassword) {
      return (
        <div className="mt-2">
          <div className="flex gap-1 h-1.5 mb-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className={`h-full flex-1 rounded-full ${i < strength ? strengthColors[strength - 1] : 'bg-stone-200'}`}
              />
            ))}
          </div>
          <p className="text-xs text-stone-500">{strength > 0 ? strengthLabels[strength - 1] : 'Very weak'} password</p>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Password</h2>
        <p className="text-stone-600 text-sm mt-1">Update your password to keep your account secure</p>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit}>
        {/* Status messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Password updated successfully!
          </div>
        )}
        
        {/* Current Password */}
        <div className="mb-6">
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              id="currentPassword"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-700"
              onClick={() => togglePasswordVisibility('current')}
            >
              {showCurrentPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* New Password */}
        <div className="mb-6">
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              id="newPassword"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-700"
              onClick={() => togglePasswordVisibility('new')}
            >
              {showNewPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {/* Password strength indicator */}
          {renderPasswordStrength()}
          
          {/* Password requirements */}
          <div className="mt-3 space-y-2">
            <p className="text-sm text-stone-700 font-medium">Password Requirements:</p>
            <ul className="space-y-1 text-sm text-stone-600">
              <li className="flex items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${validations.hasMinLength ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                  {validations.hasMinLength && <Check className="h-3 w-3" />}
                </div>
                At least 8 characters
              </li>
              <li className="flex items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${validations.hasUppercase ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                  {validations.hasUppercase && <Check className="h-3 w-3" />}
                </div>
                At least one uppercase letter
              </li>
              <li className="flex items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${validations.hasLowercase ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                  {validations.hasLowercase && <Check className="h-3 w-3" />}
                </div>
                At least one lowercase letter
              </li>
              <li className="flex items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${validations.hasNumber ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                  {validations.hasNumber && <Check className="h-3 w-3" />}
                </div>
                At least one number
              </li>
              <li className="flex items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${validations.hasSpecial ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                  {validations.hasSpecial && <Check className="h-3 w-3" />}
                </div>
                At least one special character
              </li>
            </ul>
          </div>
        </div>
        
        {/* Confirm Password */}
        <div className="mb-6">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-700"
              onClick={() => togglePasswordVisibility('confirm')}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {/* Password match indicator */}
          {passwordData.confirmPassword && (
            <div className="mt-2 flex items-center">
              {validations.passwordsMatch ? (
                <>
                  <Check className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">Passwords match</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600 mr-1" />
                  <span className="text-sm text-red-600">Passwords don't match</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:ring-offset-2 flex items-center"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : 'Update Password'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default PasswordSettings;