import React, { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

// ボタンのバリアント（種類）を定義
type ButtonVariant = 'primary' | 'secondary';

// ボタンのプロパティを拡張
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
  customStyle?: React.CSSProperties;
}

/**
 * 再利用可能なボタンコンポーネント
 * リファクタリングポイント: UIコンポーネントを小さく分割して再利用性を高める
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  // バリアントに基づいてスタイルを決定
  const baseStyles = 'px-4 py-2 rounded-full focus:outline-none transition-colors';
  
  const variantStyles = {
    primary: 'text-black',
    secondary: 'text-gray-700 border border-gray-300'
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // スタイルを結合
  const buttonStyles = twMerge(
    baseStyles,
    variantStyles[variant],
    widthStyles,
    className
  );
  
  // クロスブラウザ対応のためのスタイル
  const buttonStyle: React.CSSProperties = {
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    backgroundColor: variant === 'primary' ? '#f97316' : 'white',
    border: variant === 'secondary' ? '1px solid #e5e7eb' : 'none',
    cursor: 'pointer',
    color: variant === 'primary' ? "#fff" : "#374151",
    padding: '16px',
    borderRadius: '9999px',
    fontWeight: 500,
    display: 'inline-block',
    width: fullWidth ? '100%' : 'auto',
    textAlign: 'center',
    fontSize: '1rem',
    lineHeight: '1.5rem',
    transition: 'all 0.2s ease-in-out',
    boxShadow: 'none',
    outline: 'none',
    ...props.customStyle,
  };
  
  return (
    <button 
      className={buttonStyles} 
      style={buttonStyle} 
      {...props}
      onClick={props.onClick}
    >
      {children}
    </button>
  );
};

export default Button;
