import React from 'react';
import { ExtendedMessageType } from '../types';
import { getStatusText, getMessageIcon } from '../utils/messageUtils';

interface MessageListProps {
  messages: ExtendedMessageType[];
  activeTab: 'inbox' | 'sent';
  loading: boolean;
  onMessageClick: (message: ExtendedMessageType) => void;
  userId?: string; // 現在のユーザーIDを追加
}

/**
 * メッセージリストコンポーネント
 * 受信箱または送信箱のメッセージ一覧を表示
 */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  activeTab,
  loading,
  onMessageClick,
  userId // 現在のユーザーIDを受け取る
}) => {
  // アイコンの背景色を取得
  const getIconColor = (type: string, isInbox: boolean) => {
    // 受信箱の場合
    if (isInbox) {
      switch (type) {
        case 'invitation':
          return 'bg-yellow-500'; // 黄色に変更
        case 'invitation_pending':
          return 'bg-yellow-500'; // 黄色
        case 'rejection':
          return 'bg-gray-400'; // 灰色
        default:
          return 'bg-green-500'; // デフォルトは緑色
      }
    } 
    // 送信箱の場合
    else {
      switch (type) {
        case 'invitation':
          return 'bg-yellow-500'; // 黄色に変更
        case 'invitation_pending':
          return 'bg-yellow-500'; // 黄色
        case 'rejection':
          return 'bg-gray-400'; // 灰色
        default:
          return 'bg-green-500'; // デフォルトは緑色
      }
    }
  };


  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>{activeTab === 'inbox' ? '受信メッセージはありません' : '送信メッセージはありません'}</p>
      </div>
    );
  }

  return (
    <div className="mb-20">
      {messages.map((message) => (
        <div 
          key={message.id}
          className="relative bg-white cursor-pointer px-4 py-6 border-b border-gray-100"
          onClick={() => onMessageClick(message)}
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

            <div className="flex-1">
              <div className="flex justify-between">
                {/* 中央：ユーザー情報とメッセージ */}
                <div>
                  {/* ユーザー名 */}
                  <div className="text-lg font-bold">
                    {activeTab === 'inbox' 
                      ? message.sender?.name || '送信者' 
                      : message.recipient?.name || '受信者'}
                  </div>
                </div>                 
                
                {/* 右側：時間情報 */}
                <div className="flex flex-col items-end">
                    <div className="text-gray-500 mt-1 text-sm">
                    {new Intl.DateTimeFormat('ja-JP', {month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric' }).format(new Date(message.created_at))}
                    </div>
                </div>
              </div>

              {/* メッセージステータス - アイコンとテキスト */}
              <div className="flex items-start mt-2">
                <div className={`w-[17px] h-[16px] rounded-full flex items-center justify-center mr-1 ${getIconColor(message.type, activeTab === 'inbox')}`}>
                  <span className="text-white text-xs">{getMessageIcon(message.type, activeTab === 'inbox')}</span>
                </div>
                <div className="text-[#61717D] text-sm font-bold w-full">
                  {getStatusText(message, activeTab === 'inbox', userId)}
                </div>
              </div>
              
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
