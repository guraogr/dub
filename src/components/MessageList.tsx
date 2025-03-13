import React from 'react';
import { ExtendedMessageType } from '../types';
import { getStatusText, getMessageIcon } from '../utils/messageUtils';

interface MessageListProps {
  messages: ExtendedMessageType[];
  activeTab: 'inbox' | 'sent';
  isLoading: boolean;
  onMessageClick: (message: ExtendedMessageType) => void;
}

/**
 * メッセージリストコンポーネント
 * 受信箱または送信箱のメッセージ一覧を表示
 */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  activeTab,
  isLoading,
  onMessageClick
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>{activeTab === 'inbox' ? '受信メッセージはありません' : '送信メッセージはありません'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div 
          key={message.id}
          className={`
            p-4 rounded-xl shadow-sm border border-gray-100
            ${message.is_read ? 'bg-white' : 'bg-yellow-50'}
            ${message.type === 'invitation' && message.invitation?.status === 'pending' ? 'cursor-pointer' : ''}
          `}
          onClick={() => {
            if (message.type === 'invitation' && message.invitation?.status === 'pending') {
              onMessageClick(message);
            }
          }}
        >
          <div className="flex items-center">
            {/* 左側：アバター画像 */}
            <div className="w-[64px] h-[64px] rounded-full overflow-hidden mr-3 bg-gray-100 flex items-center justify-center">
              {activeTab === 'inbox' && message.sender?.avatar_url ? (
                <img 
                  src={message.sender.avatar_url} 
                  alt={message.sender?.name || '送信者'} 
                  className="w-full h-full object-cover"
                />
              ) : activeTab === 'sent' && message.recipient?.avatar_url ? (
                <img 
                  src={message.recipient.avatar_url} 
                  alt={message.recipient?.name || '受信者'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xl text-yellow-500">
                  {getMessageIcon(message.type, activeTab === 'inbox')}
                </div>
              )}
            </div>
            
            {/* 右側：メッセージ内容 */}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div className="font-medium">
                  {activeTab === 'inbox' 
                    ? message.sender?.name || '不明なユーザー'
                    : message.recipient?.name || '不明なユーザー'
                  }
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              <div className="text-sm mt-1">
                {getStatusText(message, activeTab === 'inbox')}
              </div>
              
              {message.time && (
                <div className="text-xs text-gray-500 mt-1">
                  {message.time}
                </div>
              )}
              
              {message.comment && (
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {message.comment}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
