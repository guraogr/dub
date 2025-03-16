import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExtendedMessageType } from '../types';
import { useSupabase } from '../contexts/SupabaseContext';
import { useMessages } from './useMessages';
import { toast } from 'sonner';

/**
 * MessagesPageのロジックを分離したカスタムフック
 * リファクタリングポイント: UIとロジックを分離して、テスト可能性を向上
 */
export const useMessagesPage = () => {
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    [key: string]: any;
  } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ExtendedMessageType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  
  // メッセージ操作用カスタムフックを使用
  const {
    messages,
    loading,
    activeTab,
    setActiveTab,
    fetchMessages,
    handleResponseToInvitation,
    createEnhancedMessage,
    markAsRead
  } = useMessages();

  // ユーザーの認証状態を確認
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
      } else {
        navigate('/login');
      }
    };
    
    checkUser();
  }, [navigate, supabase]);

  // ユーザーデータが取得できたらメッセージを取得
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, fetchMessages]);

  // メッセージをクリックしたときの処理
  const handleMessageClick = useCallback((message: ExtendedMessageType) => {
    // すべてのメッセージタイプに対応
    // 拡張メッセージを作成してモーダルに表示
    const enhancedMessage = createEnhancedMessage(message);
    
    // メッセージが未読の場合は既読にする
    if (!message.is_read && message.id) {
      // markAsRead関数を呼び出して既読にする
      markAsRead(message.id);
    }
    
    setSelectedMessage(enhancedMessage);
    setModalOpen(true);
  }, [createEnhancedMessage, markAsRead]);

  // タブ切り替え
  const handleTabChange = useCallback((tab: 'inbox' | 'sent') => {
    setActiveTab(tab);
    // タブを切り替えた時点でモーダルを閉じる
    setModalOpen(false);
  }, [setActiveTab]);

  // モーダルを閉じる
  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // 招待を承諾する
  const acceptInvitation = useCallback(async (messageId: string, invitationId: string) => {
    const result = await handleResponseToInvitation(messageId, invitationId, 'accepted');
    if (result) {
      // 承諾画面に遷移
      navigate(`/appointment-completed/${invitationId}`);
    }
    return result;
  }, [handleResponseToInvitation, navigate]);

  // 招待を拒否する
  const rejectInvitation = useCallback(async (messageId: string, invitationId: string) => {
    const result = await handleResponseToInvitation(messageId, invitationId, 'rejected');
    if (result) {
      // トースト通知を表示
      toast.success('遊びの誘いをお断りしました', {
        duration: 3000,
        style: { background: '#111111', color: '#fff' }
      });
      setModalOpen(false);
    }
    return result;
  }, [handleResponseToInvitation]);

  return {
    user,
    messages,
    loading,
    activeTab,
    selectedMessage,
    modalOpen,
    handleMessageClick,
    handleTabChange,
    closeModal,
    acceptInvitation,
    rejectInvitation
  };
};
