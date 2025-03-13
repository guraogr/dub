import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * 再利用可能なモーダルコンポーネント
 * リファクタリングポイント: UIコンポーネントを小さく分割して再利用性を高める
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white p-6 w-80 max-w-md relative rounded-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
        
        {title && (
          <h3 className="text-lg font-medium mb-4">{title}</h3>
        )}
        
        {children}
      </div>
    </div>
  );
};

export default Modal;
