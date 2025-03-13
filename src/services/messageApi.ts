import { SupabaseClient } from '@supabase/supabase-js';
import { ExtendedMessageType } from '../types';
import { enhanceMessagesWithTimeInfo } from './messageService';

/**
 * メッセージAPIサービス
 * Supabaseとの通信を担当する関数群
 */

/**
 * 受信メッセージを取得する
 */
export const fetchInboxMessages = async (
  supabase: SupabaseClient, 
  userId: string
): Promise<ExtendedMessageType[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id(*),
      invitation:invitation_id(*,
        availability:availability_id(*)
      )
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('受信メッセージの取得エラー:', error);
    throw error;
  }
  
  return enhanceMessagesWithTimeInfo(data || []);
};

/**
 * 送信メッセージを取得する
 */
export const fetchSentMessages = async (
  supabase: SupabaseClient, 
  userId: string
): Promise<ExtendedMessageType[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      recipient:recipient_id(*),
      invitation:invitation_id(*,
        availability:availability_id(*)
      )
    `)
    .eq('sender_id', userId)
    .not('invitation.status', 'in', '("accepted","rejected")')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('送信メッセージの取得エラー:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * メッセージを既読にする
 */
export const markMessageAsRead = async (
  supabase: SupabaseClient, 
  messageId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId);
    
  if (error) {
    console.error('メッセージの既読処理に失敗しました:', error);
    return false;
  }
  
  return true;
};

/**
 * 招待への応答を処理する
 */
export const respondToInvitation = async (
  supabase: SupabaseClient,
  messageId: string, 
  invitationId: string, 
  status: 'accepted' | 'rejected',
  currentUserId: string
): Promise<boolean> => {
  try {
    // invitationsテーブルのステータスを更新
    const { error: invitationError } = await supabase
      .from('invitations')
      .update({ status })
      .eq('id', invitationId);
      
    if (invitationError) {
      console.error('Invitation update error:', invitationError);
      throw invitationError;
    }
    
    // メッセージを既読にする
    const { error: messageError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
      
    if (messageError) {
      console.error('Message update error:', messageError);
      throw messageError;
    }
    
    // 元のメッセージ情報を取得
    const { data: originalMessage } = await supabase
      .from('messages')
      .select(`
        sender_id,
        recipient_id,
        content,
        invitation_id
      `)
      .eq('id', messageId)
      .single();
    
    if (originalMessage) {
      // 自分から相手へのメッセージ作成（自分が送信者）
      const senderMessage = status === 'accepted' 
        ? '遊びの誘いを承諾しました' 
        : '遊びの誘いをお断りしました';
        
      const { error: senderMsgError } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId, // 必ず自分のIDを送信者に
          recipient_id: originalMessage.sender_id,
          invitation_id: invitationId,
          type: status === 'accepted' ? 'acceptance' : 'rejection',
          content: senderMessage,
          is_read: false
        });
        
      if (senderMsgError) {
        console.error('Sender message error:', senderMsgError);
        throw senderMsgError;
      }
    }
    
    return true;
  } catch (error) {
    console.error('招待への応答処理に失敗しました:', error);
    return false;
  }
};
