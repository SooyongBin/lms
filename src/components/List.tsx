import * as React from 'react';

type ListProps = {
  children: React.ReactNode;
  className?: string;
};

export default function List({ children, className = '' }: ListProps) {
  return (
    <ul className={"divide-y divide-gray-200 " + className}>
      {React.Children.map(children, (child, idx) => (
        <li key={idx} className="py-2">{child}</li>
      ))}
    </ul>
  );
} 