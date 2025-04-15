// src/components/ui/select.js
import React from 'react';

const Select = ({
  id,
  label,
  options = [],
  placeholder = 'Select an option',
  error,
  className = '',
  containerClassName = '',
  required = false,
  disabled = false,
  ...rest
}) => {
  const selectClasses = `form-select w-full rounded-md shadow-sm border-gray-300 focus:border-benchlot-primary focus:ring focus:ring-benchlot-accent focus:ring-opacity-50 ${
    error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
  } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`;

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="form-label block text-sm font-medium text-benchlot-text-primary">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        className={selectClasses}
        disabled={disabled}
        required={required}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default Select;