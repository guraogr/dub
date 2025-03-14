import { ExtendedMessageType, MessageType } from '../types';

/**
 * メッセージデータを処理するための純粋な関数を提供するサービス
 * Supabaseとの通信は行わず、データ処理のみを担当
 */

/**
 * メッセージに時間情報を追加する
 */
export const enhanceMessagesWithTimeInfo = (messages: MessageType[]): ExtendedMessageType[] => {
  // 日付をフォーマットする関数
  const formatDateWithDay = (dateStr: string) => {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    
    return `${month}/${day}(${dayOfWeek})`;
  };

  return messages.map(message => {
    let time = '';
    let comment = '';
    
    // @ts-ignore - 型拡張の問題を一時的に無視
    if (message.invitation?.availability) {
      // @ts-ignore
      const { date, start_time, end_time } = message.invitation.availability;
      const formattedDate = formatDateWithDay(date);
      time = `${formattedDate} ${start_time?.slice(0, 5) || ''} ~ ${end_time?.slice(0, 5) || ''}`;
      // @ts-ignore
      comment = message.invitation.availability.comment || '';
    }
    
    return {
      ...message,
      time,
      comment
    } as ExtendedMessageType;
  });
};

/**
 * 招待メッセージから表示用の拡張メッセージを作成する
 */
export const createEnhancedInvitationMessage = (message: ExtendedMessageType): ExtendedMessageType => {
  // availability情報から日付と時間を取得
  let timeInfo = '';
  if (message.invitation?.availability) {
    const date = message.invitation.availability.date;
    const startTime = message.invitation.availability.start_time?.slice(0, 5);
    const endTime = message.invitation.availability.end_time?.slice(0, 5);
    
    // 日付をフォーマットする関数
    const formatDateWithDay = (dateStr: string) => {
      if (!dateStr) return '';
      
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
      
      return `${month}/${day}(${dayOfWeek})`;
    };
    
    const formattedDate = formatDateWithDay(date);
    
    if (startTime && endTime) {
      timeInfo = `${formattedDate} ${startTime} ~ ${endTime}`;
    }
  }
  
  // メッセージをそのまま使用し、必要な情報を追加
  return {
    ...message,
    time: timeInfo || '時間情報なし',
    comment: message.content.includes('「') 
      ? message.content.split('「')[1]?.split('」')[0] 
      : message.content
  };
};

/**
 * 招待応答時のメッセージ内容を生成する
 */
export const createResponseMessageContent = (status: 'accepted' | 'rejected'): string => {
  return status === 'accepted' 
    ? '遊びの誘いを承諾しました' 
    : '遊びの誘いをお断りしました';
};

/**
 * 招待応答時のメッセージタイプを決定する
 */
export const getResponseMessageType = (status: 'accepted' | 'rejected'): 'acceptance' | 'rejection' => {
  return status === 'accepted' ? 'acceptance' : 'rejection';
};
