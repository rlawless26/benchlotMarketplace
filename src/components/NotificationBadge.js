import React from 'react';
import { Bell } from 'lucide-react';

/**
 * NotificationBadge component
 * Shows a notification icon with a badge for unread notifications
 */
const NotificationBadge = ({ count = 0, onClick }) => {
  return (
    <button 
      className="text-stone-700 hover:text-benchlot-primary relative"
      aria-label={`${count} unread notifications`}
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-benchlot-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};

export default NotificationBadge;