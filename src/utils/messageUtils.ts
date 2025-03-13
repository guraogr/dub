import React from 'react';
import { ExtendedMessageType } from '../types';

/**
 * メッセージのステータステキストを取得する
 * @param message メッセージオブジェクト
 * @param isInbox 受信箱かどうか
 * @returns ステータステキスト
 */
export const getStatusText = (message: ExtendedMessageType, isInbox: boolean): string => {
  if (isInbox) {
    // 受信箱のステータス文言
    switch (message.type) {
      case 'invitation':
        // invitationタイプの場合、招待のステータスによって表示を変える
        if (message.invitation?.status === 'pending') {
          return '遊びの誘いが届きました';
        } else if (message.invitation?.status === 'accepted') {
          return '誘いが承認されました';
        } else {
          return '遊びの誘いが届きました';
        }
      case 'rejection':
        return '相手の予定が埋まってしまいました';
      default:
        return message.content || '';
    }
  } else {
    // 送信箱のステータス文言
    switch (message.type) {
      case 'invitation':
        // 送信箱の場合は常に「スカウト送信済み」と表示
        return 'スカウト送信済み';
      case 'rejection':
        return '遊びの誘いをお断りしました';
      default:
        return message.content || '';
    }
  }
};

/**
 * メッセージアイコンを取得する
 * @param type メッセージタイプ
 * @param isInbox 受信箱かどうか
 * @returns アイコン文字列
 */
export const getMessageIcon = (type: string, isInbox: boolean): React.ReactNode => {
  // 受信箱の場合
  if (isInbox) {
    switch (type) {
      case 'invitation':
        return '↘'; // 緑色の下矢印
      case 'invitation_pending':
        return '↧'; // 黄色の下矢印
      case 'rejection':
        return '×'; // 灰色のクロス
      default:
        return '↘'; // デフォルトは緑色の下矢印
    }
  } 
  // 送信箱の場合
  else {
    switch (type) {
      case 'invitation':
        return '↖︎'; // 緑色の下矢印
      case 'invitation_pending':
        return '↩'; // 黄色の右矢印
      case 'rejection':
        return '×'; // 灰色のクロス
      default:
        return '↖︎'; // デフォルトは緑色の下矢印
    }
  }
};

/**
 * アイコンの背景色を取得する
 * @param type メッセージタイプ
 * @param isInbox 受信箱かどうか
 * @param message メッセージオブジェクト
 * @returns 背景色のクラス名
 */
export const getIconColor = (type: string, isInbox: boolean, message: ExtendedMessageType): string => {
  // 承認済みの誘いの場合は緑色
  if (type === 'invitation' && message?.invitation?.status === 'accepted') {
    return 'bg-green-500'; // 承認済みの誘いは緑色
  }
  
  // 受信箱の場合
  if (isInbox) {
    switch (type) {
      case 'invitation':
        return 'bg-[#FFC82F]'; // 黄色(#FFC82F)
      case 'rejection':
        return 'bg-gray-400'; // 灰色
      default:
        return 'bg-[#FFC82F]'; // デフォルトは黄色
    }
  } 
  // 送信箱の場合
  else {
    switch (type) {
      case 'invitation':
        return 'bg-[#FFC82F]'; // 黄色(#FFC82F)
      case 'rejection':
        return 'bg-gray-400'; // 灰色
      default:
        return 'bg-[#FFC82F]'; // デフォルトは黄色
    }
  }
};

/**
 * 日付のフォーマット（例：3/25(火)）
 * @param dateStr 日付文字列
 * @returns フォーマットされた日付
 */
export const formatDateWithDay = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  
  return `${month}/${day}(${dayOfWeek})`;
};
