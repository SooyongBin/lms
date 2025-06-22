import * as React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="mb-2">
      {label && <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={
          'w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ' +
          (error ? 'border-red-400' : 'border-gray-300') +
          ' ' +
          className
        }
        {...props}
      />
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
} 