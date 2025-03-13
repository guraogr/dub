import React from 'react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  fallback?: React.ReactNode;
}

/**
 * 再利用可能なアバターコンポーネント
 * リファクタリングポイント: UIコンポーネントを小さく分割して再利用性を高める
 */
const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  size = 'md',
  fallback
}) => {
  // サイズに基づいてクラスを決定
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  
  const baseClasses = `${sizeClasses[size]} rounded-full overflow-hidden bg-gray-300 flex items-center justify-center`;
  
  return (
    <div className={baseClasses}>
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-gray-500">
          {fallback || alt.charAt(0).toUpperCase() || '?'}
        </div>
      )}
    </div>
  );
};

export default Avatar;
