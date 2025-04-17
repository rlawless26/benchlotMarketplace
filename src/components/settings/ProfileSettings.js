/**
 * ProfileSettings Component
 * Allows users to update their profile information
 */
import React, { useState, useEffect } from 'react';
import { User, Camera, Check, Loader, AlertCircle } from 'lucide-react';
import { updateUserProfile, uploadProfileImage } from '../../firebase/models/userModel';

const ProfileSettings = ({ user }) => {
  // State
  const [profileData, setProfileData] = useState({
    displayName: '',
    fullName: '',
    bio: '',
    location: '',
    email: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        fullName: user.profile?.fullName || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        email: user.email || ''
      });
      
      if (user.photoURL) {
        setImagePreview(user.photoURL);
      }
    }
  }, [user]);
  
  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle image selection
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size and type
      const isValidSize = file.size <= 2 * 1024 * 1024;
      const isValidType = file.type.startsWith('image/');
      
      if (!isValidSize) {
        setError('Profile image must be less than 2MB');
        return;
      }
      
      if (!isValidType) {
        setError('File must be an image (JPEG, PNG, etc.)');
        return;
      }
      
      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Update profile data
      await updateUserProfile(user.uid, {
        displayName: profileData.displayName,
        fullName: profileData.fullName,
        bio: profileData.bio,
        location: profileData.location
      });
      
      // Upload profile image if selected
      if (profileImage) {
        await uploadProfileImage(user.uid, profileImage);
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  
  // Render form
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Profile Information</h2>
        <p className="text-stone-600 text-sm mt-1">Update your profile information and account details</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        {/* Status messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Profile updated successfully!
          </div>
        )}
        
        {/* Profile image */}
        <div className="mb-6">
          <div className="flex items-center">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border border-stone-200">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-stone-100">
                  <User className="h-12 w-12 text-stone-400" />
                </div>
              )}
            </div>
            <div className="ml-4">
              <div className="relative">
                <input
                  type="file"
                  id="profile-image"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*"
                />
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm text-benchlot-primary bg-benchlot-accent-light rounded border border-benchlot-primary hover:bg-benchlot-accent flex items-center"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Change Photo
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-1">JPG or PNG. 2MB max.</p>
            </div>
          </div>
        </div>
        
        {/* Email - readonly */}
        <div className="mb-6">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={profileData.email}
            readOnly
            className="w-full px-3 py-2 border border-stone-300 rounded-md bg-stone-50 text-stone-500 cursor-not-allowed"
          />
          <p className="text-xs text-stone-500 mt-1">Your email cannot be changed</p>
        </div>
        
        {/* Display Name */}
        <div className="mb-6">
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={profileData.displayName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          />
        </div>
        
        {/* Full Name */}
        <div className="mb-6">
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={profileData.fullName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          />
        </div>
        
        {/* Location */}
        <div className="mb-6">
          <label
            htmlFor="location"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={profileData.location}
            onChange={handleChange}
            placeholder="City, State"
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
          />
        </div>
        
        {/* Bio */}
        <div className="mb-6">
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={profileData.bio}
            onChange={handleChange}
            rows="4"
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
            placeholder="Tell us about yourself..."
          ></textarea>
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
                Saving...
              </>
            ) : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;