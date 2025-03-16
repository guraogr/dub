import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { CustomToaster, initCustomToast } from './components/CustomToast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { SupabaseProvider } from './contexts/SupabaseContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import MessagesPage from './pages/MessagesPage';
import CreateAvailabilityPage from './pages/CreateAvailabilityPage';
import AppointmentCompletedPage from './pages/AppointmentCompletedPage';
import ProfilePage from './pages/ProfilePage';
import MyAvailabilitiesPage from './pages/MyAvailabilitiesPage';
import AppLayout from './layouts/AppLayout';
import ConnectionMonitor from './components/ConnectionMonitor';

// 型定義をインポート
import { SessionType, MessageType } from './types';

function App() {
  const [session, setSession] = useState<SessionType | null>(null);
  const [loading, setLoading] = useState(true);
  // メッセージページでメッセージを確認するため、リアルタイムでモーダルは表示しないようにしました

  useEffect(() => {
    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // _eventとしてパラメータ名を変更してリントエラーを回避
      setSession(session);
      setLoading(false);
    });

    // カスタムToastの初期化
    initCustomToast();

    return () => subscription.unsubscribe();
  }, []);



  /**
   * メッセージ受信時のハンドラー
   * @param payload 受信したペイロード
   */
  const handleMessageReceived = (payload: any) => {
    const newMessage = payload.new as MessageType;
    
    // メッセージタイプに応じた通知を表示
    if (newMessage.type === 'invitation') {
      // 誘いタイプのメッセージの場合は特別な通知を表示
      toast.info('遊びの誘いが届きました。スカウト画面から確認してください。', {
        duration: 5000,
        position: 'top-center'
      });
    } else {
      // その他のメッセージの場合は通常の通知を表示
      toast.info('新しいメッセージを受信しました');
    }
  };
  
  // リアルタイム通知の設定
  useEffect(() => {
    if (!session) return;

    // メッセージテーブルのサブスクリプション
    const channel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${session.user.id}`,
      }, handleMessageReceived);

    // サブスクリプションの開始
    channel.subscribe((status) => {
      console.log('リアルタイムサブスクリプションステータス:', status);
      if (status === 'SUBSCRIBED') {
        console.log('リアルタイムサブスクリプション成功');
      } else {
        console.error('リアルタイムサブスクリプション失敗:', status);
      }
    });

    return () => {
      console.log('リアルタイムサブスクリプション解除');
      supabase.removeChannel(channel);
    };
  }, [session]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <SupabaseProvider>
      <ConnectionMonitor>
        <Router>
          {/* 全体をAppLayoutで囲む */}
          <AppLayout>
          {/* カスタムToasterコンポーネントを追加 */}
          <CustomToaster />
          
          {/* リアルタイムでモーダルを表示しないようにしました */}
          
          <Routes>
            <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/register" element={!session ? <RegisterPage /> : <Navigate to="/" />} />
            <Route path="/messages" element={session ? <MessagesPage /> : <Navigate to="/login" />} />
            <Route path="/appointment-completed/:id" element={session ? <AppointmentCompletedPage /> : <Navigate to="/login" />} />
            <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/login" />} />
            <Route path="/myavailabilities" element={session ? <MyAvailabilitiesPage /> : <Navigate to="/login" />} />
            <Route path="/" element={session ? <HomePage /> : <Navigate to="/login" />} />
            <Route path="/create-availability" element={session ? <CreateAvailabilityPage /> : <Navigate to="/login" />} />
          </Routes>
          </AppLayout>
        </Router>
      </ConnectionMonitor>
    </SupabaseProvider>
  );
}

export default App;