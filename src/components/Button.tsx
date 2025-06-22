import * as React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
};

export default function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  let base = 'px-4 py-2 rounded font-semibold transition-colors ';
  if (variant === 'primary') base += 'bg-blue-600 text-white hover:bg-blue-700';
  else if (variant === 'secondary') base += 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  else if (variant === 'danger') base += 'bg-red-500 text-white hover:bg-red-600';
  return (
    <button className={base + ' ' + className} {...props}>
      {children}
    </button>
  );
} 