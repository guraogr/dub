import { Toaster } from 'sonner';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import MessagesPage from './pages/MessagesPage';
import CreateAvailabilityPage from './pages/CreateAvailabilityPage';
import AppointmentCompletedPage from './pages/AppointmentCompletedPage';
import NotificationModal from './components/NotificationModal'; 
import ProfilePage from './pages/ProfilePage';
import MyAvailabilitiesPage from './pages/MyAvailabilitiesPage';


function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // リアルタイム通知の設定
useEffect(() => {
  if (!session) return;

  console.log('リアルタイム通知のセットアップ開始...', session.user.id);

  // メッセージテーブルのサブスクリプション
  const channel = supabase
    .channel('realtime-messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${session.user.id}`,
    }, (payload) => {
      console.log('リアルタイムイベントを受信:', payload);
      const newMessage = payload.new;
      
      // 簡易通知を表示（デバッグ用）
      alert(`新しいメッセージを受信: ${JSON.stringify(newMessage)}`);
      
      // 誘いタイプのメッセージのみ通知
      if (newMessage.type === 'invitation') {
        // 送信者情報を取得
        const fetchSenderAndShowNotification = async () => {
          try {
            const { data: senderData } = await supabase
              .from('users')
              .select('name, avatar_url')
              .eq('id', newMessage.sender_id)
              .single();
              
            // 可用性（予定）情報を取得
            const { data: invitationData } = await supabase
              .from('invitations')
              .select(`
                id,
                availability_id
              `)
              .eq('id', newMessage.invitation_id)
              .single();
              
            if (invitationData) {
              const { data: availabilityData } = await supabase
                .from('availabilities')
                .select('date, start_time, end_time, comment')
                .eq('id', invitationData.availability_id)
                .single();
                
              // 通知データを設定
              const notificationData = {
                id: newMessage.id,
                invitation_id: newMessage.invitation_id,
                sender: senderData,
                availability: availabilityData,
                created_at: newMessage.created_at
              };
              
              console.log('通知データを設定:', notificationData);
              setNotification(notificationData);
              setShowNotification(true);
            }
          } catch (error) {
            console.error('通知データの取得に失敗:', error);
          }
        };
        
        fetchSenderAndShowNotification();
      }
    });

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
    return <div>Loading...</div>;
  }

  return (
    <Router>
       {/* Toasterコンポーネントを追加 */}
       <Toaster position="top-center" richColors />
      
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
        <Route path="/appointmentcompleted/:id" element={session ? <AppointmentCompletedPage /> : <Navigate to="/login" />} />
        <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/myavailabilities" element={session ? <MyAvailabilitiesPage /> : <Navigate to="/login" />} /> {/* 新しいルート */}
        <Route path="/" element={session ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/create-availability" element={session ? <CreateAvailabilityPage /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;