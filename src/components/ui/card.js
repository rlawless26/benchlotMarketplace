// src/components/ui/card.js
import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  shadow = 'default',
  padding = 'default',
  ...rest 
}) => {
  const baseClasses = 'bg-white rounded-lg overflow-hidden';
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    default: 'shadow-card',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    default: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };
  
  const cardClasses = `${baseClasses} ${shadowClasses[shadow] || shadowClasses.default} ${paddingClasses[padding] || paddingClasses.default} ${className}`;
  
  return (
    <div className={cardClasses} {...rest}>
      {children}
    </div>
  );
};

export default Card;