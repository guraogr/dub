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
    primary: 'bg-[#FFC82F] text-black',
    secondary: 'bg-white text-gray-700 border border-gray-300'
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // スタイルを結合
  const buttonStyles = twMerge(
    baseStyles,
    variantStyles[variant],
    widthStyles,
    className
  );
  
  return (
    <button className={buttonStyles} {...props}>
      {children}
    </button>
  );
};

export default Button;
