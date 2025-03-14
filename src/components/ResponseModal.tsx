import React from 'react';
import { ExtendedMessageType } from '../types';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import Button from './ui/Button';
import { useResponseModal } from '../hooks/useResponseModal';

interface ResponseModalProps {
  message: ExtendedMessageType | null;
  isOpen: boolean;
  activeTab: 'inbox' | 'sent';
  onClose: () => void;
  onAccept: (messageId: string, invitationId: string) => void;
  onReject: (messageId: string, invitationId: string) => void;
}

/**
 * ユーザー情報コンポーネント
 * リファクタリングポイント: 大きなコンポーネントを小さく分割
 */
const UserInfo: React.FC<{
  name: string;
  avatarUrl?: string | null;
  timeInfo: string;
  comment: string;
  activityDetails?: string;
  messageType?: string;
}> = ({ name, avatarUrl, timeInfo, comment, activityDetails, messageType }) => (
  <div className="flex flex-col mb-4">
    <div className="flex items-center mb-3">
      <Avatar 
        src={avatarUrl} 
        alt={name} 
        size="lg" 
        fallback={name.charAt(0)}
      />
      <div className="ml-4">
        <div className="font-medium">{name}</div>
      </div>
    </div>
    
    {/* 遊びの詳細情報 */}
    {(messageType === 'invitation' || messageType === 'acceptance' || messageType === 'rejection') && (
      <div className="bg-gray-50 p-3 rounded-md">
        <div className="text-sm font-medium mb-1">募集詳細</div>
        <div className="text-sm text-gray-700">時間：{timeInfo}</div>
        {activityDetails && activityDetails !== ' ' && (
          <div className="text-sm text-gray-700 mt-1">コメント: {activityDetails}</div>
        )}
      </div>
    )}
    
    {/* メッセージステータス */}
    {/* <div className="text-sm mt-1">
      <div className="font-medium mb-1 text-gray-700">ステータス</div>
      <div className="">{comment}</div>
    </div> */}
  </div>
);

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
      if (message.type === 'invitation') {
        if (message.invitation?.status === 'pending') {
          return '遊びの誘いを承諾しますか？';
        } else if (message.invitation?.status === 'accepted') {
          return '遊びの詳細';
        } else if (message.invitation?.status === 'rejected') {
          return '遊びの詳細';
        }
      }
    }
    // 送信箱の場合
    else {
      if (message.type === 'invitation') {
        if (message.invitation?.status === 'pending') {
          return '遊びの詳細';
        } else if (message.invitation?.status === 'accepted') {
          return '遊びの詳細';
        } else if (message.invitation?.status === 'rejected') {
          return '遊びの詳細';
        }
      }
    }
    
    return 'メッセージ詳細';
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
      {/* ユーザー情報コンポーネント */}
      <UserInfo
        name={messageData.senderName}
        avatarUrl={messageData.avatarUrl}
        timeInfo={messageData.timeInfo}
        comment={messageData.commentText}
        activityDetails={messageData.activityDetails}
        messageType={messageData.messageType}
      />
      
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
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            閉じる
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default ResponseModal;
