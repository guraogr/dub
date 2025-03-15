import React from 'react';
import { ExtendedMessageType } from '../types';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import Button from './ui/Button';
import { useResponseModal } from '../hooks/useResponseModal';
import { FaLine } from 'react-icons/fa';
import { FaInstagram } from 'react-icons/fa';

interface ResponseModalProps {
  message: ExtendedMessageType | null;
  isOpen: boolean;
  activeTab: 'inbox' | 'sent';
  onClose: () => void;
  onAccept: (messageId: string, invitationId: string) => void;
  onReject: (messageId: string, invitationId: string) => void;
}



/**
 * メッセージ詳細モーダル
 * リファクタリングポイント:
 * 1. UIコンポーネントを小さく分割
 * 2. ロジックをカスタムフックに分離
 * 3. 再利用可能なUIコンポーネントを使用
 */
const ResponseModal: React.FC<ResponseModalProps> = ({ 
  message, 
  isOpen, 
  activeTab,
  onClose,
  onAccept, 
  onReject 
}) => {
  // ロジックをカスタムフックに分離
  const isInbox = activeTab === 'inbox';
  const { messageData, executeAction } = useResponseModal(message, isInbox);
  
  if (!isOpen || !message || !messageData) return null;

  // メッセージタイプとステータスに基づいてタイトルを設定
  const getModalTitle = () => {
    // 受信箱の場合
    if (messageData.isInbox) {
        if (message.invitation?.status === 'pending') {
          return '遊びの誘いを承諾しますか？';
        } else if (message.invitation?.status === 'accepted') {
          return '遊びの約束が決まりました';
        } else if (message.invitation?.status === 'rejected') {
          return '遊びの詳細';
        }
    }
    // 送信箱の場合
    else if (message.type === 'acceptance'){
        return '遊びの約束が決まりました';
    }
    
    return '遊びの詳細';
  };

  // メッセージタイプに基づいてボタンを表示するか判定
  // 受信箱の保留中の招待の場合のみアクションボタンを表示
  const showActionButtons = messageData.isInbox && message.type === 'invitation' && message.invitation?.status === 'pending';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
    >
      {/* ユーザー情報 */}
      <div className="flex flex-col mb-4">
        <div className="flex items-center mb-3">
          <Avatar 
            src={messageData.avatarUrl} 
            alt={messageData.senderName} 
            size="lg" 
            fallback={messageData.senderName.charAt(0)}
          />
          <div className="ml-4">
            <div className="font-medium">{messageData.senderName}</div>
          </div>
        </div>
        
        {/* 遊びの詳細情報 */}
        {(messageData.messageType === 'invitation' || messageData.messageType === 'acceptance' || messageData.messageType === 'rejection') && (
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm font-medium mb-1">募集詳細</div>
            <div className="text-sm text-gray-700">時間：{messageData.timeInfo}</div>
            {messageData.activityDetails && messageData.activityDetails !== ' ' && (
              <div className="text-sm text-gray-700 mt-1">コメント: {messageData.activityDetails}</div>
            )}
          </div>
        )}
      </div>
      
      {showActionButtons ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            誘いを承諾すると、一緒に遊ぶための連絡を取り合います。拒否した場合、相手には予定が埋まった通知が送られます。
          </p>
          
          <div className="flex justify-end space-x-2">
            {/* 拒否ボタン */}
            <Button
              variant="secondary"
              onClick={() => executeAction('reject', onAccept, onReject)}
              disabled={!messageData.isActionable}
            >
              拒否する
            </Button>
            
            {/* 承諾ボタン */}
            <Button
              variant="primary"
              onClick={() => executeAction('accept', onAccept, onReject)}
              disabled={!messageData.isActionable}
            >
              承諾する
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* 承諾済みの場合、SNSリンクを表示 */}
          {(message.invitation?.status === 'accepted' || message.type === 'acceptance') && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                LINE や Instagram 等の SNS を通じて、友達と遊びに出かけよう！
              </p>
              <div className="space-y-2 justify-center">
                <button
                  onClick={() => window.open('https://line.me/R/')}
                  className="flex w-full  items-center justify-center bg-[#06C755] text-white px-6 py-2"
                  style={{borderRadius: 1000, padding: "12px 0"}}
                >
                  <FaLine className="mr-2" /> LINEを開く
                </button>
                <button
                  onClick={() => window.open('https://www.instagram.com/')}
                  className="flex w-full items-center justify-center bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white px-6 py-2"
                  style={{borderRadius: 1000, padding: "12px 0"}}
                >
                  <FaInstagram className="mr-2" /> Instagramを開く
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default ResponseModal;
