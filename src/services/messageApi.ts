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
  status: 'accepted' | 'rejected'
  // currentUserId パラメータは不要になったため削除
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
    
    // 不要なメッセージ作成を削除しました
    // 元のメッセージのステータスを更新するだけで十分です
    
    return true;
  } catch (error) {
    console.error('招待への応答処理に失敗しました:', error);
    return false;
  }
};
