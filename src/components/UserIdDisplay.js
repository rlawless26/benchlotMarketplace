/**
 * Temporary component to display the current user's ID
 * Add this to any page to see the current user ID
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../firebase/hooks/useAuth';

const UserIdDisplay = () => {
  const { user, isAuthenticated } = useAuth();
  const [userId, setUserId] = useState('Not logged in');
  
  useEffect(() => {
    if (user && user.uid) {
      setUserId(user.uid);
    }
  }, [user]);

  if (!isAuthenticated()) {
    return (
      <div className="bg-yellow-100 p-4 rounded-md mb-4">
        <p className="text-yellow-800 font-medium">Please log in to see your user ID.</p>
      </div>
    );
  }

  return (
    <div className="bg-green-100 p-4 rounded-md mb-4">
      <p className="text-green-800 font-medium">Your User ID:</p>
      <div className="mt-2 p-2 bg-white rounded border border-green-300 font-mono">
        {userId}
      </div>
      <p className="mt-2 text-sm text-green-700">
        Use this ID to create a test conversation:
        <br />
        <code className="bg-white px-2 py-1 rounded">
          node create-test-conversation.js {userId}
        </code>
      </p>
    </div>
  );
};

export default UserIdDisplay;