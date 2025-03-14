import React, { useState } from 'react';

interface InviteModalProps {
  user: {
    id: string;
    name: string;
    comment: string;
    time: string;
    avatar_url?: string; 
  };
  isOpen: boolean;
  onClose: () => void;
  onInvite: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ user, isOpen, onClose, onInvite }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white p-6 w-80 max-w-md rounded-2xl">
        <h3 className="text-lg font-medium mb-4">遊びに誘いますか？</h3>
        <div className="flex items-center mb-4">
          {user.avatar_url && !imageError ? (
            <img 
              src={user.avatar_url} 
              alt={`${user.name}のアバター`} 
              className="w-15 h-15 rounded-full mr-4 object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-300 rounded-full mr-4 flex items-center justify-center">
              <span className="text-gray-500 text-lg font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-gray-500">{user.comment}</div>
            <div className="text-sm">{user.time}</div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            onClick={onInvite}
            className="px-4 py-2 bg-yellow-400 text-black rounded-full hover:bg-yellow-500"
            style={{borderRadius: 100, }}
            >
            遊びに誘う
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;