import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ExtendedMessageType } from '../types';

/**
 * メッセージ操作用のカスタムフック
 * メッセージの取得、既読処理、招待への応答などを管理
 */
export const useMessages = () => {
  const [messages, setMessages] = useState<ExtendedMessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [userId, setUserId] = useState<string | null>(null);

  // ユーザーIDの取得
  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    
    fetchUserId();
  }, []);

  // メッセージの取得
  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      if (activeTab === 'inbox') {
        // 受信メッセージの取得
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
          setLoading(false);
          return;
        }
        
        // 日付と時間情報を追加
        const messagesWithTime = data?.map(message => {
          let time = '';
          let comment = '';
          
          if (message.invitation?.availability) {
            const { date, start_time, end_time } = message.invitation.availability;
            time = `${date} ${start_time || ''} ~ ${end_time || ''}`;
            comment = message.invitation.availability.comment || '';
          }
          
          return {
            ...message,
            time,
            comment
          };
        }) || [];
        
        setMessages(messagesWithTime);
      } else {
        // 送信メッセージの取得
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
          setLoading(false);
          return;
        }
        
        setMessages(data || []);
      }
    } catch (error) {
      console.error('メッセージの取得に失敗しました', error);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab]);

  // タブ変更時にメッセージを再取得
  useEffect(() => {
    if (userId) {
      fetchMessages();
    }
  }, [userId, activeTab, fetchMessages]);

  // メッセージを既読にする
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
        
      if (error) {
        console.error('メッセージの既読処理に失敗しました:', error);
        return false;
      }
      
      // 既読状態を更新
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
      
      return true;
    } catch (error) {
      console.error('メッセージの既読処理でエラーが発生しました:', error);
      return false;
    }
  }, []);

  // 招待への応答処理
  const handleResponseToInvitation = useCallback(async (messageId: string, invitationId: string, status: 'accepted' | 'rejected') => {
    try {
      setLoading(true);
      
      // 現在のユーザー情報を再取得
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      
      if (!currentUserId) {
        throw new Error('ユーザー情報が取得できません');
      }
      
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
      
      // メッセージリストを更新
      await fetchMessages();
      
      return true;
    } catch (error) {
      console.error('招待への応答処理に失敗しました:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);

  return {
    messages,
    loading,
    activeTab,
    setActiveTab,
    fetchMessages,
    markAsRead,
    handleResponseToInvitation
  };
};
