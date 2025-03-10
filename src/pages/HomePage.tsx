import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import InviteModal from '../components/InviteModal';

const HomePage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const currentDate = new Date();
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const navigate = useNavigate();

  // ユーザーの認証状態を確認
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
      } else {
        navigate('/login');
      }
      setLoading(false);
    };
    
    checkUser();
  }, [navigate]);

  // 予定データを取得するuseEffect
  useEffect(() => {
    const fetchAvailabilities = async () => {
      if (!user) return;
      
      try {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD形式
        
        // 今日以降の予定を取得
        const { data, error } = await supabase
          .from('availabilities')
          .select(`
            *,
            user:user_id(id, name, avatar_url)
          `)
          .gte('date', formattedDate) // 今日以降の日付
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });
          
        if (error) throw error;
        
        // 全ての予定を表示（テスト段階では自分の予定も表示）
        setAvailabilities(data || []);
        
        // 本番環境では以下のように自分以外の予定のみ表示
        // const othersAvailabilities = data?.filter(item => item.user_id !== user.id) || [];
        // setAvailabilities(othersAvailabilities);
      } catch (error) {
        console.error('予定の取得に失敗しました', error);
      }
    };
    
    if (user) {
      fetchAvailabilities();
    }
  }, [user]);

  // カレンダーの日付を取得
  const getDaysInWeek = () => {
    const days = [];
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - currentDate.getDay()); // 週の始まり（日曜日）に設定

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  // 日付のフォーマット
  const formatDate = (date: Date) => {
    return date.getDate();
  };

  // 曜日のフォーマット
  const formatDay = (date: Date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  };

  // 今日かどうかチェック
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // ユーザーを選択して誘いモーダルを表示
  const handleUserSelect = (userData: any) => {
    setSelectedUser(userData);
    setShowInviteModal(true);
  };

  // 誘いを送信
  const handleSendInvite = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // 誘いをinvitationsテーブルに登録
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .insert([
          {
            sender_id: user.id,
            recipient_id: selectedUser.id,
            availability_id: selectedUser.availabilityId,
            status: 'pending'
          }
        ])
        .select();
        
      if (invitationError) throw invitationError;
      
      // メッセージもmessagesテーブルに登録
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            recipient_id: selectedUser.id,
            invitation_id: invitationData[0].id,
            type: 'invitation',
            content: `「${selectedUser.time} ${selectedUser.comment}」の募集に遊びの誘いが届きました。`,
            is_read: false
          }
        ])
        .select();
        
      if (messageError) {
        console.error('メッセージ登録エラー:', messageError);
        throw messageError;
      }

      console.log('登録されたメッセージ:', messageData);
      
      setShowInviteModal(false);
      alert('遊びの誘いを送信しました！');
      
    } catch (error: any) {
      console.error('誘いの送信に失敗しました', error);
      alert(`誘いの送信に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">あそびませんか？</h1>
        <button
          onClick={() => navigate('/profile')}
          className="text-sm text-blue-500 hover:underline"
        >
          プロフィール設定
        </button>
      </div>
      {/* カレンダー表示 */}
      <div className="mb-8">
        <div className="flex mb-4">
          {getDaysInWeek().map((date, index) => (
            <div 
              key={index} 
              className={`flex-1 text-center p-2 rounded-lg ${
                isToday(date) ? 'bg-yellow-400 text-black font-bold' : ''
              }`}
            >
              <div className="text-lg">{formatDate(date)}</div>
              <div className="text-sm text-gray-500">{formatDay(date)}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 予定一覧 */}
      <div className="space-y-4">
  {availabilities.length === 0 ? (
    <div className="text-center py-8 text-gray-500">予定が見つかりません</div>
  ) : (
    availabilities.map((availability) => (
      <div 
        key={availability.id}
        className="flex items-center p-4 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50"
        onClick={() => handleUserSelect({
          id: availability.user.id,
          name: availability.user.name,
          comment: availability.comment,
          time: `${availability.start_time.slice(0, 5)}-${availability.end_time.slice(0, 5)}`,
          availabilityId: availability.id
        })}
      >
        <div className="w-12 h-12 bg-gray-300 rounded-full mr-4">
          {availability.user.avatar_url && (
            <img 
              src={availability.user.avatar_url} 
              alt={availability.user.name} 
              className="w-full h-full object-cover rounded-full"
            />
          )}
        </div>
        <div>
          <div className="font-medium">{availability.user.name}</div>
          <div className="text-sm text-gray-500">{availability.comment}</div>
        </div>
        <div className="ml-auto text-right">
          <div>{`${availability.start_time.slice(0, 5)}-${availability.end_time.slice(0, 5)}`}</div>
          <div className="text-xs text-gray-500">{new Date(availability.date).toLocaleDateString('ja-JP')}</div>
        </div>
      </div>
    ))
  )}
</div>
      
      {/* 右下の予定登録FABボタン */}
      <div className="fixed right-4 bottom-20">
        <button 
          onClick={() => navigate('/create-availability')}
          className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>
      
      {/* 下部ナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-4">
        <button 
          className="text-center"
          onClick={() => navigate('/')}
        >
          <div className="text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-xs mt-1">遊びに誘う</div>
        </button>
        
        <button 
          className="text-center"
          onClick={() => navigate('/messages')}
        >
          <div className="text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-xs mt-1">スカウトを見る</div>
        </button>
      </div>
      
      {/* 誘いモーダル */}
      {selectedUser && (
        <InviteModal
          user={selectedUser}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleSendInvite}
        />
      )}
    </div>
  );
};

export default HomePage;