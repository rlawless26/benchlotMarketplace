import React from 'react';
import { getEnvironment } from '../utils/environment';

const EnvironmentDisplay = () => {
  const environment = getEnvironment();
  
  // Only show the badge if environment is not production on benchlot.com
  if (environment === 'production' && window.location.hostname === 'benchlot.com') {
    return null;
  }
  
  // Use specific styling for staging environment
  const badgeStyle = environment === 'staging' 
    ? "fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 p-2 rounded shadow text-xs font-medium"
    : "fixed bottom-4 right-4 bg-white p-2 rounded shadow text-xs";
  
  return (
    <div className={badgeStyle}>
      Environment: <strong>{environment}</strong>
    </div>
  );
};

export default EnvironmentDisplay;