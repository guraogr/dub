import React from 'react';
import { ExtendedMessageType } from '../types';

/**
 * メッセージのステータステキストを取得する
 * @param message メッセージオブジェクト
 * @param isInbox 受信箱かどうか
 * @param currentUserId 現在のユーザーID
 * @returns ステータステキスト
 */
export const getStatusText = (message: ExtendedMessageType, isInbox: boolean, currentUserId?: string): string => {
  // 仕様に従ってステータス文言を表示する
  if (isInbox) {
    // 受信箱のステータス文言
    if (message.invitation?.status === 'accepted') {
      return '遊びの誘いが承諾されました';
    } else if (message.invitation?.status === 'rejected') {
      return '相手の予定が埋まってしまいました';
    }
    // デフォルトの場合はメッセージ内容を表示
    return message.content || '';
  } else {
    // 送信箱のステータス文言
    if (message.type === 'invitation') {
      if (message.invitation?.status === 'pending') {
        // 保留中の場合
        return 'スカウト送信済み';
      }
    }
    // デフォルトの場合はメッセージ内容を表示
    return message.content || '';
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
        return '↘'; 
      case 'rejection':
        return '×'; 
      default:
        return '↘';
    }
  } 
  // 送信箱の場合
  else {
    switch (type) {
      case 'invitation':
        return '↖︎'; 
      case 'rejection':
        return '×'; 
      default:
        return '↖︎';
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
