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
    
    // クリーンアップ関数を返す
    return () => {
      // コンポーネントがアンマウントされたときの処理
    };
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
// デフォルトでは今日の日付を選択状態にする
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const todayFormatted = `${year}-${month}-${day}`;
const [selectedDate, setSelectedDate] = useState(todayFormatted);

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

  // 今日かどうかチェックの関数は使用しないため削除

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
      
      // AppointmentCompletedPageに遷移する
      navigate(`/appointment-completed/${invitationData[0].id}`);
      
  
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
    <div className="py-8">
      {/* 日付選択部分 - 左右にはみ出しても良い */}
      <div className="w-full mb-4">
        <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="flex space-x-2 pb-2 px-4" style={{ scrollbarWidth: 'none' }}>
            {dateList.map((date, index) => {
              // 曜日の色を設定する関数
              const getWeekdayColor = (date: Date) => {
                const day = date.getDay();
                if (day === 0) return 'text-red-500'; // 日曜日は赤色
                if (day === 6) return 'text-sky-500'; // 土曜日は青色
                return 'text-gray-700'; // それ以外はデフォルト色
              };
              
              return (
                <button
                  key={date.formattedDate}
                  className={`flex-none flex flex-col items-center justify-center w-56px h-56px rounded-full transition duration-150 ease-in-out ${
                    selectedDate === date.formattedDate ? 'bg-yellow-400 text-black font-bold' : 'bg-white'
                  } hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500`}
                  style={{border: "1px solid #e5e7eb", }}
                  onClick={() => {
                    console.log(`${date.day}日ボタンをクリック: ${date.formattedDate}`);
                    setSelectedDate(date.formattedDate);
                  }}
                >
                  <div className={`text-xs font-normal ${index === 0 ? '' : getWeekdayColor(date.date)}`}>
                    {index === 0 ? '今日' : date.weekday}
                  </div>
                  <div className="text-lg font-bold">{date.day}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* 予定一覧 - 画面幅に収まるようにする */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="w-full">
          {availabilities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">予定が見つかりません</div>
          ) : (
            availabilities.map(availability => (
              <div 
                key={availability.id}
                className="flex items-center px-4 py-5 bg-white cursor-pointer hover:bg-gray-50 w-full border-b border-gray-100"
                onClick={() => handleUserSelect({
                  id: availability.user?.id || availability.user_id,
                  name: availability.user?.name || '名前なし',
                  comment: availability.comment || '',
                  time: `${availability.start_time?.slice(0, 5) || ''}～${availability.end_time?.slice(0, 5) || ''}`,
                  availabilityId: availability.id
                })}
              >
                <div className="w-16 h-16 bg-gray-300 rounded-full mr-4 flex-shrink-0">
                  {availability.user?.avatar_url && (
                    <img 
                      src={availability.user.avatar_url} 
                      alt={availability.user.name} 
                      className="w-full h-full object-cover rounded-full"
                    />
                  )}
                </div>
                <div className="w-full">
                  <div className="flex-grow min-w-0 mr-2 flex justify-between">
                    <div className="font-bold truncate">{availability.user?.name || '名前なし'}</div>
                    <div className="whitespace-nowrap">{`${availability.start_time?.slice(0, 5) || ''}～${availability.end_time?.slice(0, 5) || ''}`}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="text-sm text-gray-500 truncate">{availability.comment || ''}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* プロフィールの少し上に予定登録ボタンを配置 */}
      <div className="fixed bottom-28 right-0 left-0 z-10 flex justify-center pointer-events-none">
        <div className="w-full max-w-md px-4 flex justify-end">
          <button 
            onClick={() => navigate('/create-availability')}
            className="flex pl-4 pr-5 py-4 bg-[#ff662f] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.30)] shadow-[0px_4px_18px_3px_rgba(0,0,0,0.15)] inline-flex justify-start items-center gap-3 pointer-events-auto rounded-full"
            style={{borderRadius: 100, gap: "2px"}}
          >
            <div className="w-6 h-6 relative">
              <div className="w-4 h-4 left-[4px] top-[4px] ">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <div className="text-center justify-center text-white text-sm font-semibold font-['Inter'] leading-tight">予定を登録</div>
          </button>
        </div>
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