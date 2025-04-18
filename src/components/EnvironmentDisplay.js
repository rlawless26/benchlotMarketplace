import React from 'react';
import { getEnvironment } from '../utils/environment';

const EnvironmentDisplay = () => {
  const environment = getEnvironment();
  
  return (
    <div className="fixed bottom-4 right-4 bg-white p-2 rounded shadow text-xs">
      Environment: <strong>{environment}</strong>
    </div>
  );
};

export default EnvironmentDisplay;