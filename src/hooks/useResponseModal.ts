import { useMemo } from 'react';
import { ExtendedMessageType } from '../types';

/**
 * ResponseModalのロジックを分離したカスタムフック
 * リファクタリングポイント: UIとロジックを分離して、テスト可能性を向上
 */
export const useResponseModal = (message: ExtendedMessageType | null, isInbox: boolean = true) => {
  // 安全なアクセスのためのヘルパー変数を計算
  const messageData = useMemo(() => {
    if (!message) return null;

    // 受信箱か送信箱かは外部から渡されたパラメータを使用
    // 受信箱：自分が受信者の場合
    // 送信箱：自分が送信者の場合

    // メッセージタイプに基づいて表示する情報を決定
    let senderName = message.sender?.name || 'ユーザー';
    let avatarUrl = message.sender?.avatar_url;
    let timeInfo = message.time && message.time !== 'undefined ~ undefined' 
      ? message.time 
      : '時間情報なし';
    let commentText = message.comment && message.comment.trim() !== '' ? message.comment : '';
    let activityDetails = '';
    
    // メッセージタイプに基づいて表示する情報を調整
    if (message.type === 'invitation') {
      activityDetails = message.invitation?.availability?.comment || ' ';
      
      // PART1: スカウトを送る/スカウトが届く
      // PART2: スカウトに応答する
      // PART3: スカウトの返事が届く
      
      if (isInbox) {
        // 受信箱の場合
        if (message.invitation?.status === 'pending') {
          // 2. [受信箱]遊びの誘いが届きました（相手が自分の遊びの募集にスカウトを送る）
          commentText = '遊びの誘いが届きました';
        } else if (message.invitation?.status === 'accepted') {
          // 1. [受信箱] 誘いが承諾されました
          commentText = '誘いが承諾されました';
        } else if (message.invitation?.status === 'rejected') {
          // 2. [受信箱] 相手の予定が埋まってしまいました
          commentText = '相手の予定が埋まってしまいました';
        }
      } else {
        // 送信箱の場合
        if (message.invitation?.status === 'pending') {
          // 1. [送信箱]スカウト送信済み（自分が相手の遊び募集にスカウトを送る）
          commentText = 'スカウト送信済み';
        } else if (message.invitation?.status === 'accepted') {
          // 1. [送信箱]遊びの誘いを承諾しました（相手が送ってきたスカウトに対して、自分が承諾ボタンをおす）
          commentText = '遊びの誘いを承諾しました';
        } else if (message.invitation?.status === 'rejected') {
          // 2. [送信箱]遊びの誘いをお断りしました（相手が送ってきたスカウトに対して、自分が拒否ボタンをおした場合）
          commentText = '遊びの誘いをお断りしました';
        }
      }
    } else {
      // その他のメッセージタイプの場合
      commentText = message.content || '';
    }
    
    // メッセージIDと招待IDの有効性をチェック
    // 受信箱の保留中の招待のみアクション可能
    const isActionable = isInbox && Boolean(message.id && message.invitation?.id && message.invitation?.status === 'pending');

    return {
      senderName,
      avatarUrl,
      timeInfo,
      commentText,
      activityDetails,
      isActionable,
      messageId: message.id,
      invitationId: message.invitation?.id,
      messageType: message.type,
      isInbox
    };
  }, [message, isInbox]);

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
