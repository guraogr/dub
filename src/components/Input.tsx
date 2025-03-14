import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  customStyle?: React.CSSProperties;
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  error,
  className,
  ...props
}) => {
  return (
    <div className="mb-6">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none ${className || ''}`}
        style={{
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          fontSize: '1rem',
          lineHeight: '1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#d1d5db',
          padding: '0.75rem 1rem',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease-in-out',
          outline: 'none',
          ...props.customStyle,
        }}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;
