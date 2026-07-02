import React, { InputHTMLAttributes, ReactNode } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`input-group ${error ? 'has-error' : ''} ${className}`}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} {...props} />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
