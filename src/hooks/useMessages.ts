import { useState, useEffect, useCallback } from 'react';
import { ExtendedMessageType } from '../types';
import { useSupabase } from '../contexts/SupabaseContext';
import { fetchInboxMessages, fetchSentMessages, markMessageAsRead, respondToInvitation } from '../services/messageApi';
import { createEnhancedInvitationMessage } from '../services/messageService';

/**
 * メッセージ操作用のカスタムフック
 * メッセージの取得、既読処理、招待への応答などを管理
 * 
 * リファクタリングポイント:
 * 1. Supabaseクライアントを直接使わず、コンテキスト経由で取得（依存性の注入）
 * 2. データ処理ロジックをサービスに分離
 * 3. API通信をサービスに分離
 * 4. 純粋な関数とReactの状態管理を分離
 */
export const useMessages = () => {
  const [messages, setMessages] = useState<ExtendedMessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [userId, setUserId] = useState<string | null>(null);
  const { supabase } = useSupabase(); // コンテキストからSupabaseクライアントを取得

  // ユーザーIDの取得
  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    
    fetchUserId();
  }, [supabase]);

  // メッセージの取得
  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      let fetchedMessages: ExtendedMessageType[] = [];
      
      if (activeTab === 'inbox') {
        // 受信メッセージの取得（APIサービスを使用）
        fetchedMessages = await fetchInboxMessages(supabase, userId);
        
        // 受信箱のメッセージをフィルタリング
        // - 自分が送信者の場合：招待が承諾/拒否された場合のみ表示
        // - 自分が受信者の場合：保留中の招待のみ表示
        fetchedMessages = fetchedMessages.filter(msg => {
          if (msg.type === 'invitation') {
            if (msg.sender_id === userId) {
              // 自分が送信者の場合（自分が送ったスカウトへの返事）
              return msg.invitation?.status === 'accepted' || msg.invitation?.status === 'rejected';
            } else {
              // 自分が受信者の場合（相手からのスカウト）
              return msg.invitation?.status === 'pending';
            }
          }
          return true; // 招待タイプ以外のメッセージはすべて表示
        });
      } else {
        // 送信メッセージの取得（APIサービスを使用）
        fetchedMessages = await fetchSentMessages(supabase, userId);
        
        // 送信箱のメッセージをフィルタリング
        // - 自分が送信者の場合：保留中の招待のみ表示
        // - 自分が受信者の場合：招待に対する自分の応答を表示
        fetchedMessages = fetchedMessages.filter(msg => {
          if (msg.type === 'invitation') {
            if (msg.sender_id === userId) {
              // 自分が送信者の場合（自分が送ったスカウト）
              return msg.invitation?.status === 'pending';
            } else {
              // 自分が受信者の場合（相手からのスカウトに対する自分の応答）
              return msg.invitation?.status === 'accepted' || msg.invitation?.status === 'rejected';
            }
          }
          return true; // 招待タイプ以外のメッセージはすべて表示
        });
      }
      
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('メッセージの取得に失敗しました', error);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab, supabase]);

  // タブ変更時にメッセージを再取得
  useEffect(() => {
    if (userId) {
      fetchMessages();
    }
  }, [userId, activeTab, fetchMessages]);

  // メッセージを既読にする
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      // APIサービスを使用
      const success = await markMessageAsRead(supabase, messageId);
      
      if (success) {
        // 既読状態を更新
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
      }
      
      return success;
    } catch (error) {
      console.error('メッセージの既読処理でエラーが発生しました:', error);
      return false;
    }
  }, [supabase]);

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
      
      // APIサービスを使用して招待応答を処理
      const success = await respondToInvitation(
        supabase, 
        messageId, 
        invitationId, 
        status
        // currentUserIdパラメータは不要になったため削除
      );
      
      if (success) {
        // メッセージリストを更新
        await fetchMessages();
      }
      
      return success;
    } catch (error) {
      console.error('招待への応答処理に失敗しました:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchMessages, supabase]);

  // 招待メッセージから表示用の拡張メッセージを作成する
  const createEnhancedMessage = useCallback((message: ExtendedMessageType): ExtendedMessageType => {
    return createEnhancedInvitationMessage(message);
  }, []);

  return {
    messages,
    loading,
    activeTab,
    setActiveTab,
    fetchMessages,
    markAsRead,
    handleResponseToInvitation,
    createEnhancedMessage,
    userId // 現在のユーザーIDを返す
  };
};
