import React, { useState, useEffect, useRef } from 'react';
import BottomNavigation from '../components/BottomNavigation';
import ResponseModal from '../components/ResponseModal';
import MessageList from '../components/MessageList';
import Tabs from '../components/ui/Tabs';
import { useMessagesPage } from '../hooks/useMessagesPage';
import { toast } from 'sonner';
import { clearMessageCache } from '../services/messageApi';
import ConnectionMonitor from '../components/ConnectionMonitor';
import LoadingScreen from '../components/LoadingScreen';

/**
 * メッセージページコンポーネント
 * リファクタリングポイント:
 * 1. UIとロジックを分離（カスタムフックを使用）
 * 2. 小さなコンポーネントに分割
 * 3. 再利用可能なUIコンポーネントを使用
 */
const MessagesPage: React.FC = () => {
  // ロジックをカスタムフックに分離
  const {
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
  } = useMessagesPage();
  
  // タイムアウトと接続エラーの状態管理
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const inactivityTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // ユーザーのアクティビティを追跡
  useEffect(() => {
    // ユーザーのアクティビティを記録する関数
    const updateLastActivity = () => {
      lastActivityRef.current = Date.now();
      // アクティビティがあればエラー状態をリセット
      if (connectionError || loadingTimeout) {
        setConnectionError(false);
        setLoadingTimeout(false);
        setReconnecting(true);
        // キャッシュをクリアして再読み込み
        clearMessageCache();
        // リロード前に少し遅延を入れる
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };
    
    // アクティビティイベントを登録
    window.addEventListener('mousemove', updateLastActivity);
    window.addEventListener('keydown', updateLastActivity);
    window.addEventListener('touchstart', updateLastActivity);
    window.addEventListener('click', updateLastActivity);
    
    // 定期的に非アクティブ状態をチェック
    inactivityTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;
      
      // 10分間非アクティブな場合、接続を確認
      if (inactiveTime > 10 * 60 * 1000) {
        console.log(`ユーザーが${Math.floor(inactiveTime / 1000)}秒間非アクティブです。接続を確認します。`);
        // ピングイベントを発行
        window.dispatchEvent(new CustomEvent('user:inactive'));
      }
    }, 120000) as unknown as number; // 2分ごとにチェック
    
    // Supabaseの再接続イベントをリッスン
    const handleReconnect = () => {
      console.log('再接続イベントを受信しました');
      setConnectionError(false);
      setLoadingTimeout(false);
      setReconnecting(true);
      toast.success('接続が回復しました', { duration: 3000 });
      // キャッシュをクリアして再読み込み
      clearMessageCache();
      window.location.reload();
    };
    
    const handleReconnectFailed = () => {
      console.log('再接続失敗イベントを受信しました');
      setConnectionError(true);
      setReconnecting(false);
      toast.error('接続の回復に失敗しました。再読み込みしてください。', { duration: 5000 });
    };
    
    const handleConnectionError = () => {
      console.log('接続エラーイベントを受信しました');
      setConnectionError(true);
      setReconnecting(true);
    };
    
    const handleTimeout = () => {
      console.log('タイムアウトイベントを受信しました');
      setLoadingTimeout(true);
      setReconnecting(true);
    };
    
    // イベントリスナーを登録
    window.addEventListener('supabase:reconnected', handleReconnect);
    window.addEventListener('supabase:reconnect-failed', handleReconnectFailed);
    window.addEventListener('supabase:connection-error', handleConnectionError);
    window.addEventListener('supabase:timeout', handleTimeout);
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('mousemove', updateLastActivity);
      window.removeEventListener('keydown', updateLastActivity);
      window.removeEventListener('touchstart', updateLastActivity);
      window.removeEventListener('click', updateLastActivity);
      window.removeEventListener('supabase:reconnected', handleReconnect);
      window.removeEventListener('supabase:reconnect-failed', handleReconnectFailed);
      window.removeEventListener('supabase:connection-error', handleConnectionError);
      window.removeEventListener('supabase:timeout', handleTimeout);
      
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [connectionError, loadingTimeout]);
  
  // ローディング状態のタイムアウト処理
  useEffect(() => {
    let timeoutId: number;
    
    if (loading && messages.length === 0) {
      // 3秒後にタイムアウトを設定
      timeoutId = window.setTimeout(() => {
        setLoadingTimeout(true);
        setConnectionError(true);
        console.log('メッセージ読み込みがタイムアウトしました');
        toast.error('データの読み込みに時間がかかっています。ネットワーク環境を確認して再読み込みをお試しください。');
      }, 3000);
    } else if (messages.length > 0) {
      // メッセージが読み込まれたらタイムアウトをリセット
      setLoadingTimeout(false);
      setConnectionError(false);
      setReconnecting(false);
    }
    
    // クリーンアップ関数
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, messages.length]);
  
  // 再読み込み処理
  const handleRetry = () => {
    setReconnecting(true);
    toast.info('再接続しています...', { duration: 2000 });
    clearMessageCache();
    // 少し遅延させてリロード
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
  
  // オフライン状態のチェック
  useEffect(() => {
    const handleOnline = () => {
      console.log('オンライン状態に戻りました');
      if (connectionError || loadingTimeout) {
        toast.success('インターネット接続が回復しました', { duration: 3000 });
        handleRetry();
      }
    };
    
    const handleOffline = () => {
      console.log('オフライン状態になりました');
      setConnectionError(true);
      toast.error('インターネット接続が切断されました', { duration: 5000 });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionError, loadingTimeout]);

  console.log(messages)
  // タブオプションの定義
  const tabOptions = [
    { id: 'inbox', label: '受信箱' },
    { id: 'sent', label: '送信箱' }
  ];

  // ローディング中の表示
  if (loading && messages.length === 0) {
    return (
      <LoadingScreen
        loadingTimeout={loadingTimeout}
        connectionError={connectionError}
        reconnecting={reconnecting}
        onReconnect={handleRetry}
      />
    );
  }

  return (
    <ConnectionMonitor>
      <div className="max-w-md mx-auto p-4 pb-20">
        {/* タブコンポーネント */}
        <Tabs 
          options={tabOptions} 
          activeTab={activeTab} 
          onChange={(tabId) => handleTabChange(tabId as 'inbox' | 'sent')} 
        />
  
        {/* メッセージリストコンポーネント */}
        <MessageList 
          messages={messages}
          activeTab={activeTab}
          loading={loading}
          onMessageClick={handleMessageClick}
        />
        
        {/* 応答モーダルコンポーネント */}
        <ResponseModal
          message={selectedMessage}
          isOpen={modalOpen}
          activeTab={activeTab}
          onClose={closeModal}
          onAccept={acceptInvitation}
          onReject={rejectInvitation}
        />
        
        {/* 下部ナビゲーション */}
        <BottomNavigation />
      </div>
    </ConnectionMonitor>
  );
};

export default MessagesPage;