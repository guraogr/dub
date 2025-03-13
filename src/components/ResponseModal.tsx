import React from 'react';
import { ExtendedMessageType } from '../types';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import Button from './ui/Button';
import { useResponseModal } from '../hooks/useResponseModal';

interface ResponseModalProps {
  message: ExtendedMessageType | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (messageId: string, invitationId: string) => void;
  onReject: (messageId: string, invitationId: string) => void;
}

/**
 * 招待者情報コンポーネント
 * リファクタリングポイント: 大きなコンポーネントを小さく分割
 */
const InviterInfo: React.FC<{
  name: string;
  avatarUrl?: string | null;
  timeInfo: string;
  comment: string;
}> = ({ name, avatarUrl, timeInfo, comment }) => (
  <div className="flex items-center mb-4">
    <Avatar 
      src={avatarUrl} 
      alt={name} 
      size="lg" 
      fallback={name.charAt(0)}
    />
    <div className="ml-4">
      <div className="font-medium">{name}</div>
      <div className="text-sm">{timeInfo}</div>
      <div className="text-sm text-gray-600">{comment}</div>
    </div>
  </div>
);

/**
 * メッセージの招待に対する応答モーダル
 * リファクタリングポイント:
 * 1. UIコンポーネントを小さく分割
 * 2. ロジックをカスタムフックに分離
 * 3. 再利用可能なUIコンポーネントを使用
 */
const ResponseModal: React.FC<ResponseModalProps> = ({ 
  message, 
  isOpen, 
  onClose,
  onAccept, 
  onReject 
}) => {
  // ロジックをカスタムフックに分離
  const { messageData, executeAction } = useResponseModal(message);
  
  if (!isOpen || !message || !messageData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="遊びの誘いを承認しますか？"
    >
      {/* 招待者情報コンポーネント */}
      <InviterInfo
        name={messageData.senderName}
        avatarUrl={messageData.avatarUrl}
        timeInfo={messageData.timeInfo}
        comment={messageData.commentText}
      />
      
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
    </Modal>
  );
};

export default ResponseModal;
