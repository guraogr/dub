import { useMemo } from 'react';
import { ExtendedMessageType } from '../types';

/**
 * ResponseModalのロジックを分離したカスタムフック
 * リファクタリングポイント: UIとロジックを分離して、テスト可能性を向上
 */
export const useResponseModal = (message: ExtendedMessageType | null) => {
  // 安全なアクセスのためのヘルパー変数を計算
  const messageData = useMemo(() => {
    if (!message) return null;

    const senderName = message.sender?.name || 'ユーザー';
    const avatarUrl = message.sender?.avatar_url;
    const timeInfo = message.time && message.time !== 'undefined ~ undefined' 
      ? message.time 
      : '時間情報なし';
    const commentText = message.comment || 'コメントなし';
    
    // メッセージIDと招待IDの有効性をチェック
    const isActionable = Boolean(message.id && message.invitation?.id);

    return {
      senderName,
      avatarUrl,
      timeInfo,
      commentText,
      isActionable,
      messageId: message.id,
      invitationId: message.invitation?.id
    };
  }, [message]);

  // アクション実行のためのヘルパー関数
  const executeAction = (
    actionType: 'accept' | 'reject',
    onAccept: (messageId: string, invitationId: string) => void,
    onReject: (messageId: string, invitationId: string) => void
  ) => {
    if (!messageData?.isActionable) return;
    
    const { messageId, invitationId } = messageData;
    
    if (actionType === 'accept' && messageId && invitationId) {
      onAccept(messageId, invitationId);
    } else if (actionType === 'reject' && messageId && invitationId) {
      onReject(messageId, invitationId);
    }
  };

  return {
    messageData,
    executeAction
  };
};
