// src/components/ui/input.js
import React from 'react';

const Input = ({
  id,
  label,
  type = 'text',
  placeholder,
  error,
  className = '',
  containerClassName = '',
  required = false,
  disabled = false,
  ...rest
}) => {
  const inputClasses = `form-input w-full rounded-md shadow-sm border-gray-300 focus:border-benchlot-primary focus:ring focus:ring-benchlot-accent focus:ring-opacity-50 ${
    error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
  } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`;

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="form-label block text-sm font-medium text-benchlot-text-primary">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className={inputClasses}
        disabled={disabled}
        required={required}
        {...rest}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default Input;