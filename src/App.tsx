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
import NotificationModal from './components/NotificationModal'; 
import ProfilePage from './pages/ProfilePage';
import MyAvailabilitiesPage from './pages/MyAvailabilitiesPage';
import AppLayout from './layouts/AppLayout';
import ConnectionMonitor from './components/ConnectionMonitor';

// 型定義をインポート
import { SessionType, NotificationType, MessageType } from './types';

function App() {
  const [session, setSession] = useState<SessionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);

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
   * 通知データを取得する関数
   * @param message 新しいメッセージ
   */
  const fetchNotificationData = async (message: MessageType) => {
    try {
      // 送信者情報を取得
      const { data: senderData, error: senderError } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', message.sender_id)
        .single();
      
      if (senderError) {
        throw new Error(`送信者情報の取得エラー: ${senderError.message}`);
      }
        
      // 招待IDの確認
      if (!message.invitation_id) {
        throw new Error('メッセージに招待IDが含まれていません');
      }
      
      // 招待情報を取得
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .select(`
          id,
          availability_id
        `)
        .eq('id', message.invitation_id)
        .single();
      
      if (invitationError) {
        throw new Error(`誘い情報の取得エラー: ${invitationError.message}`);
      }
      
      if (!invitationData || !invitationData.availability_id) {
        throw new Error('誘いに関連する予定情報がありません');
      }
        
      // 予定情報を取得
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availabilities')
        .select('date, start_time, end_time, comment')
        .eq('id', invitationData.availability_id)
        .single();
      
      if (availabilityError) {
        throw new Error(`予定情報の取得エラー: ${availabilityError.message}`);
      }
      
      if (!availabilityData) {
        throw new Error('予定情報が見つかりませんでした');
      }
          
      // 通知データを設定
      const notificationData: NotificationType = {
        id: message.id,
        invitation_id: message.invitation_id,
        sender: senderData,
        availability: availabilityData,
        created_at: message.created_at
      };
      
      setNotification(notificationData);
      setShowNotification(true);
      
    } catch (error) {
      // エラーメッセージを表示
      const errorMessage = error instanceof Error ? error.message : '通知データの取得に失敗しました';
      console.error('通知データの取得エラー:', error);
      toast.error(errorMessage);
    }
  };

  /**
   * メッセージ受信時のハンドラー
   * @param payload 受信したペイロード
   */
  const handleMessageReceived = (payload: any) => {
    const newMessage = payload.new as MessageType;
    
    // Toasterを使用して通知
    toast.info('新しいメッセージを受信しました');
    
    // 誘いタイプのメッセージのみ通知モーダルを表示
    if (newMessage.type === 'invitation') {
      fetchNotificationData(newMessage);
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
          
          {/* 通知モーダル */}
          {showNotification && notification && (
            <NotificationModal
              notification={notification}
              onClose={() => setShowNotification(false)}
            />
          )}
          
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