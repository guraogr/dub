import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  const [modalOpen, setModalOpen] = useState(false);
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
  
  // 日付一覧を生成する関数
  const generateDateList = () => {
    const dates = [];
    const today = new Date();
    
    // 今日から2週間後までの日付を生成
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // 年月日を個別に取得して文字列に変換（タイムゾーンの影響を受けない）
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // YYYY-MM-DD形式の文字列を作成（これをデータベースのクエリに使用）
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log(`${date.getDate()}日の表示日付:`, formattedDate);
      
      const dateObj = {
        date: date,
        formattedDate: formattedDate, // この値がデータベースの日付と一致するようにする
        day: date.getDate(),
        month: date.getMonth() + 1,
        weekday: new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(date)
      };
      
      dates.push(dateObj);
    }
    
    return dates;
  };
  
// 日付リストと選択された日付のステート
const [dateList, setDateList] = useState(generateDateList());
const [selectedDate, setSelectedDate] = useState(dateList[0]?.formattedDate || '');

  // 予定データを取得するuseEffect
  useEffect(() => {
    const fetchAvailabilities = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // 現在の日時を取得
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHour}:${currentMinute}`;
        
        console.log('今日の日付:', todayStr);
        console.log('現在の時間:', currentTimeStr);
        
        // 選択された日付の予定を取得
        const targetDate = selectedDate || todayStr;
        
        // 予定を取得
        const { data, error } = await supabase
          .from('availabilities')
          .select(`
            *,
            user:user_id(id, name, avatar_url),
            invitations(id, status)
          `)
          .eq('date', targetDate)
          .order('start_time', { ascending: true });
          
        if (error) throw error;
        
        console.log('取得した予定データ:', data);
        
        // 完全に新しいフィルタリング実装
        const filteredData = data?.filter(item => {
          console.log('フィルタリング対象:', item.id, item.date, item.start_time, item.end_time);
          
          // 自分の予定は表示しない
          if (item.user_id === user.id) {
            console.log('自分の予定なので非表示:', item.id);
            return false;
          }
          
          // 承諾済み招待の確認
          const hasAcceptedInvitation = item.invitations && 
            item.invitations.some((inv: any) => inv.status === 'accepted');
          
          if (hasAcceptedInvitation) {
            console.log('承諾済みのため除外:', item.id);
            return false;
          }
          
          // 特別なケース：00:00-23:59の終日予定は常に表示
          if ((item.start_time === '00:00' || item.start_time === '00:00:00') && 
              (item.end_time === '23:59' || item.end_time === '23:59:00')) {
            console.log('終日予定なので表示:', item.id);
            return true;
          }
          
          // 選択された日付が今日より後の場合は時間に関係なく表示
          if (targetDate > todayStr) {
            console.log('未来の日付なので表示:', item.id);
            return true;
          }
          
          // 選択された日付が今日の場合、開始時間が現在時刻より後のみ表示
          if (targetDate === todayStr) {
            // 時間部分だけを抽出して比較（秒を除く）
            const startTimeParts = item.start_time.split(':');
            const startTimeFormatted = `${startTimeParts[0]}:${startTimeParts[1]}`;
            
            const currentTimeParts = currentTimeStr.split(':');
            const currentTimeFormatted = `${currentTimeParts[0]}:${currentTimeParts[1]}`;
            
            const isAfterCurrentTime = startTimeFormatted > currentTimeFormatted;
            console.log('時間比較:', startTimeFormatted, '>', currentTimeFormatted, '=', isAfterCurrentTime);
            
            return isAfterCurrentTime;
          }
          
          console.log('表示しない予定:', item.id);
          return false;
        }) || [];
        
        console.log('フィルタリング後の予定:', filteredData);
        setAvailabilities(filteredData);
        
      } catch (error) {
        console.error('予定の取得に失敗しました', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchAvailabilities();
    }
  }, [user,selectedDate]);
  
  


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
  // handleSendInvite関数内で、成功時にトーストを表示
  const handleSendInvite = async () => {
    try {
      setLoading(true);
      
      // 現在のユーザー情報を取得
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) {
        throw new Error('ユーザーが見つかりません');
      }
  
      // 誘いを登録してIDを取得
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .insert({
          sender_id: userData.user.id,
          recipient_id: selectedUser.id,
          availability_id: selectedUser.availabilityId,
          status: 'pending'
        })
        .select(); // .select()を追加してデータを取得
        
      if (invitationError) throw invitationError;
      
      if (!invitationData || invitationData.length === 0) {
        throw new Error('招待データの取得に失敗しました');
      }
  
      // メッセージも登録
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          sender_id: userData.user.id,
          recipient_id: selectedUser.id,
          invitation_id: invitationData[0].id, // これで正しく動作するはず
          type: 'invitation',
          content: `「${selectedUser.time} ${selectedUser.comment}」の募集に遊びの誘いが届きました。`,
          is_read: false
        });
        
      if (msgError) throw msgError;
  
      // モーダルを閉じる
      setModalOpen(false);
      
      // トースト通知を表示
      toast.success(`${selectedUser.name}さんを遊びに誘いました。`, {
        duration: 3000,
        style: { background: '#4ade80' } // 任意のスタイル
      });
  
    } catch (error: any) {
      console.error('誘いの送信に失敗しました', error);
      toast.error(`誘いの送信に失敗しました: ${error.message}`);
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
      {/* 日付選択部分 */}
      <div className="flex overflow-x-auto space-x-2 mb-4 pb-2">
        {dateList.map((date, index) => (
          <button
            key={date.formattedDate}
            className={`flex-none p-2 min-w-16 text-center rounded-lg ${
              selectedDate === date.formattedDate
                ? 'bg-yellow-400 text-black font-bold'
                : 'bg-white text-gray-700'
            }`}
            onClick={() => {
              console.log(`${date.day}日ボタンをクリック: ${date.formattedDate}`);
              setSelectedDate(date.formattedDate);
            }}
          >
            <div className="text-sm">{index === 0 ? '今日' : date.weekday}</div>
            <div className="text-lg">{date.day}</div>
            <div className="text-xs">{date.month}月</div>
          </button>
          ))}
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