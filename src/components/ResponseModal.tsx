import React from 'react';
import { ExtendedMessageType } from '../types';

interface ResponseModalProps {
  message: ExtendedMessageType | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (messageId: string, invitationId: string) => void;
  onReject: (messageId: string, invitationId: string) => void;
}

/**
 * メッセージの招待に対する応答モーダル
 */
const ResponseModal: React.FC<ResponseModalProps> = ({ 
  message, 
  isOpen, 
  onClose,
  onAccept, 
  onReject 
}) => {
  if (!isOpen || !message) return null;

  // 安全なアクセスのためのヘルパー変数
  const senderName = message.sender?.name || 'ユーザー';
  const avatarUrl = message.sender?.avatar_url;
  const timeInfo = message.time && message.time !== 'undefined ~ undefined' 
    ? message.time 
    : '時間情報なし';
  const commentText = message.comment || 'コメントなし';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white p-6 w-80 max-w-md relative rounded-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
        <h3 className="text-lg font-medium mb-4">
          遊びの誘いを承認しますか？
        </h3>
        
        <div className="flex items-center mb-4">
          <div className="w-15 h-15 bg-gray-300 rounded-full mr-4">
            {avatarUrl && (
              <img 
                src={avatarUrl} 
                alt={senderName} 
                className="w-full h-full object-cover rounded-full"
              />
            )}
          </div>
          <div>
            <div className="font-medium">{senderName}</div>
            <div className="text-sm">{timeInfo}</div>
            <div className="text-sm text-gray-600">{commentText}</div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          誘いを承諾すると、一緒に遊ぶための連絡を取り合います。拒否した場合、相手には予定が埋まった通知が送られます。
        </p>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              if (message.id && message.invitation?.id) {
                onReject(message.id, message.invitation.id);
              }
            }}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100"
            disabled={!message.id || !message.invitation?.id}
          >
            拒否する
          </button>
          <button
            onClick={() => {
              if (message.id && message.invitation?.id) {
                onAccept(message.id, message.invitation.id);
              }
            }}
            className="px-4 py-2 bg-yellow-400 text-black rounded-full hover:bg-yellow-500"
            disabled={!message.id || !message.invitation?.id}
          >
            承諾する
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResponseModal;
