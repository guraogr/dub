import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import InviteModal from '../components/InviteModal';
import BottomNavigation from '../components/BottomNavigation';

interface Invitation {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  sender_id: string;
  recipient_id: string;
  availability_id: string;
}

interface UserProfile {
  id: string;
  name: string;
  avatar_url: string;
}

interface Availability {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  comment: string;
  user: UserProfile;
  invitations?: Invitation[];
}

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
        // 現在の日時を取得
        const now = new Date();
        
        // YYYY-MM-DD形式の今日の日付
        const todayStr = now.toISOString().split('T')[0];
        console.log('今日の日付:', todayStr);
        
        // 現在の時間（HH:MM形式）
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHour}:${currentMinute}`;
        console.log('現在の時間:', currentTimeStr);
        
        // このユーザーが関わる全ての招待状態を取得
        const { data: userInvitations, error: invitationsError } = await supabase
          .from('invitations')
          .select('id, status, availability_id, sender_id, recipient_id')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
          
        if (invitationsError) {
          console.error('招待状態の取得エラー:', invitationsError);
        }
        
        // 承認または拒否された可用性IDのリストを作成
        const respondedAvailabilityIds = userInvitations
          ?.filter(inv => inv.status === 'accepted' || inv.status === 'rejected')
          .map(inv => inv.availability_id) || [];
          
        console.log('承認・拒否済みの可用性ID:', respondedAvailabilityIds);
        
        // 予定を取得（まずは日付時間で絞り込み）
        const { data, error } = await supabase
          .from('availabilities')
          .select(`
            *,
            user:user_id(id, name, avatar_url)
          `)
          .gte('date', todayStr)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });
          
        if (error) {
          console.error('予定の取得エラー:', error);
          throw error;
        }
        
        // フィルタリング:
        // 1. 自分の予定は除外
        // 2. 承認・拒否済みの予定は除外
        // 3. 時間が過ぎた予定は除外
        const filteredAvailabilities = data?.filter(item => {
          // 自分の予定は除外
          if (item.user_id === user.id) {
            return false;
          }
          
          // 承認・拒否済みの予定は除外
          if (respondedAvailabilityIds.includes(item.id)) {
            console.log('承認・拒否済みのため非表示:', item);
            return false;
          }
          
          // 日付が今日より後なら表示
          if (item.date > todayStr) return true;
          
          // 日付が今日と同じ場合は時間をチェック
          if (item.date === todayStr) {
            // 開始時間が現在時刻より後なら表示
            return item.start_time > currentTimeStr;
          }
          
          return false;
        }) || [];
        
        console.log('フィルタリング後の予定:', filteredAvailabilities);
        setAvailabilities(filteredAvailabilities);
        
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
          availabilities.map(availability => (
            <div 
              key={availability.id}
              className="flex items-center p-4 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50"
              onClick={() => handleUserSelect({
                id: availability.user?.id || availability.user_id,
                name: availability.user?.name || '名前なし',
                comment: availability.comment || '',
                time: `${availability.start_time?.slice(0, 5) || ''}～${availability.end_time?.slice(0, 5) || ''}`,
                availabilityId: availability.id
              })}
            >
              <div className="w-12 h-12 bg-gray-300 rounded-full mr-4">
                {availability.user?.avatar_url && (
                  <img 
                    src={availability.user.avatar_url} 
                    alt={availability.user.name} 
                    className="w-full h-full object-cover rounded-full"
                  />
                )}
              </div>
              <div>
                <div className="font-medium">{availability.user?.name || '名前なし'}</div>
                <div className="text-sm text-gray-500">{availability.comment || ''}</div>
              </div>
              <div className="ml-auto text-right">
                <div>{`${availability.start_time?.slice(0, 5) || ''}～${availability.end_time?.slice(0, 5) || ''}`}</div>
                <div className="text-xs text-gray-500">
                  {availability.date && new Date(availability.date).toLocaleDateString('ja-JP')}
                </div>
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
      <BottomNavigation />
      
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