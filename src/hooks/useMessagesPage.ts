import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExtendedMessageType } from '../types';
import { useSupabase } from '../contexts/SupabaseContext';
import { useMessages } from './useMessages';
import { toast } from 'sonner';
import { handleSupabaseError } from '../lib/supabaseClient';
import { clearMessageCache, checkConnectionStatus } from '../services/messageApi';

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

  // タイムアウトと接続状態管理用の参照を保持
  const timeoutRef = useRef<number | null>(null);
  const connectionCheckRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const reconnectingRef = useRef<boolean>(false);

  // ユーザーデータが取得できたらメッセージを取得
  useEffect(() => {
    if (user) {
      // メッセージ取得を実行
      const fetchAndHandleErrors = async () => {
        try {
          await fetchMessages();
          // 成功時は再接続フラグをリセット
          reconnectingRef.current = false;
        } catch (error: any) {
          console.error('メッセージ取得エラー:', error);
          const errorMessage = handleSupabaseError(error);
          toast.error(errorMessage);
          
          // エラーが発生した場合はキャッシュをクリア
          if (error?.message?.includes('CLOSED') || 
              error?.message?.includes('connection') || 
              error?.message?.includes('timeout') || 
              error?.message?.includes('タイムアウト')) {
            clearMessageCache();
            // 再接続中でない場合は自動再接続を試みる
            if (!reconnectingRef.current) {
              reconnectingRef.current = true;
              toast.info('接続が切れました。再接続しています...');
              // 3秒後に再試行
              setTimeout(() => {
                fetchAndHandleErrors();
              }, 3000);
            }
          }
        }
      };
      
      fetchAndHandleErrors();
      
      // 10秒後にタイムアウトを設定
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = window.setTimeout(() => {
        if (loading) {
          console.log('メッセージ読み込みがタイムアウトしました');
          // タイムアウト時はキャッシュをクリアして再読み込みを促す
          clearMessageCache();
          toast.error('データの読み込みがタイムアウトしました。再読み込みしてください。');
          window.dispatchEvent(new CustomEvent('supabase:timeout'));
        }
      }, 10000) as unknown as number;
      
      // 定期的な接続確認を設定
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
      
      // 60秒ごとに接続状態を確認
      connectionCheckRef.current = window.setInterval(async () => {
        // 最後のアクティビティからの経過時間を確認
        const now = Date.now();
        const inactiveTime = now - lastActivityRef.current;
        
        // 10分以上経過している場合は接続確認
        if (inactiveTime > 10 * 60 * 1000 && !loading) {
          console.log('長時間の非アクティブ状態を検出。接続を確認します。');
          
          // 接続確認関数を使用
          try {
            const isConnected = await checkConnectionStatus(supabase);
            if (isConnected) {
              console.log('接続確認成功');
              lastActivityRef.current = Date.now(); // アクティビティ時間を更新
            } else {
              console.error('接続確認失敗');
              // 接続エラーの場合はイベントを発行
              window.dispatchEvent(new CustomEvent('supabase:connection-error'));
              clearMessageCache();
              // 再接続を試みる
              if (!reconnectingRef.current) {
                reconnectingRef.current = true;
                toast.info('接続が切れました。再接続しています...');
                setTimeout(() => {
                  fetchAndHandleErrors();
                }, 3000);
              }
            }
          } catch (error) {
            console.error('接続確認中にエラーが発生しました:', error);
            window.dispatchEvent(new CustomEvent('supabase:connection-error'));
            clearMessageCache();
          }
        }
      }, 60000) as unknown as number;
      
      // Supabaseの再接続イベントをリッスン
      const handleUserActivity = () => {
        lastActivityRef.current = Date.now();
      };
      
      // ユーザーのアクティビティを追跡
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      window.addEventListener('touchstart', handleUserActivity);
      window.addEventListener('click', handleUserActivity);
      
      // ユーザーが非アクティブになったときのイベントをリッスン
      const handleUserInactive = async () => {
        // アクティビティ時間を更新して、即座にタイムアウトしないようにする
        lastActivityRef.current = Date.now();
        try {
          // 接続確認関数を使用
          const isConnected = await checkConnectionStatus(supabase);
          if (isConnected) {
            console.log('非アクティブ状態での接続確認成功');
          } else {
            console.error('非アクティブ状態での接続確認失敗');
            window.dispatchEvent(new CustomEvent('supabase:connection-error'));
            // 再接続を試みる
            if (!reconnectingRef.current) {
              reconnectingRef.current = true;
              toast.info('接続が切れました。再接続しています...');
              setTimeout(() => {
                fetchAndHandleErrors();
              }, 3000);
            }
          }
        } catch (error) {
          console.error('非アクティブ状態での接続確認中にエラーが発生しました:', error);
          window.dispatchEvent(new CustomEvent('supabase:connection-error'));
        }
      };
      
      window.addEventListener('user:inactive', handleUserInactive);
      
      // クリーンアップ関数
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (connectionCheckRef.current) {
          clearInterval(connectionCheckRef.current);
        }
        
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('touchstart', handleUserActivity);
        window.removeEventListener('click', handleUserActivity);
        window.removeEventListener('user:inactive', handleUserInactive);
      };
    }
  }, [user, fetchMessages, loading]);
  


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
