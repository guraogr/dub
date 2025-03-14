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
  // PART1: スカウトを送る/スカウトが届く
  // PART2: スカウトに応答する
  // PART3: スカウトの返事が届く
  
  if (isInbox) {
    // 受信箱のステータス文言
    if (message.type === 'invitation') {
      // 招待タイプの場合、ステータスによって表示を変える
      if (message.invitation?.status === 'pending') {
        // 2. [受信箱]遊びの誘いが届きました（相手が自分の遊びの募集にスカウトを送る）
        return '遊びの誘いが届きました';
      } else if (message.invitation?.status === 'accepted') {
        // 1. [受信箱] 誘いが承諾されました
        // 自分が招待を送った場合のみ表示する
        // 自分が送信者の場合は、自分が招待を送った場合
        if (currentUserId && message.sender_id === currentUserId) {
          return '誘いが承諾されました';
        }
        return '';
      } else if (message.invitation?.status === 'rejected') {
        // 2. [受信箱] 相手の予定が埋まってしまいました
        // 自分が招待を送った場合のみ表示する
        // 自分が送信者の場合は、自分が招待を送った場合
        if (currentUserId && message.sender_id === currentUserId) {
          return '相手の予定が埋まってしまいました';
        }
        return '';
      }
    }
    
    // デフォルトの場合はメッセージ内容を表示
    return message.content || '';
  } else {
    // 送信箱のステータス文言
    if (message.type === 'invitation') {
      // 招待タイプの場合、ステータスによって表示を変える
      if (message.invitation?.status === 'pending') {
        // 1. [送信箱]スカウト送信済み（自分が相手の遊び募集にスカウトを送る）
        return 'スカウト送信済み';
      } else if (message.invitation?.status === 'accepted') {
        // 1. [送信箱]遊びの誘いを承諾しました（相手が送ってきたスカウトに対して、自分が承諾ボタンをおす）
        return '遊びの誘いを承諾しました';
      } else if (message.invitation?.status === 'rejected') {
        // 2. [送信箱]遊びの誘いをお断りしました（相手が送ってきたスカウトに対して、自分が拒否ボタンをおした場合）
        return '遊びの誘いをお断りしました';
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
