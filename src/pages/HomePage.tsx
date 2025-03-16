import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import InviteModal from '../components/InviteModal';
import BottomNavigation from '../components/BottomNavigation';
import LoadingScreen from '../components/LoadingScreen';

const HomePage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const navigate = useNavigate();
  
  // タイムアウトと接続エラーの状態管理
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  
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
        
        // ユーザーが既に送信した招待（スカウト）を取得
        const { data: sentInvitations, error: invitationsError } = await supabase
          .from('invitations')
          .select('availability_id')
          .eq('sender_id', user.id);
          
        if (invitationsError) throw invitationsError;
        
        // 既にスカウトを送った予定のIDリストを作成
        const sentInvitationAvailabilityIds = sentInvitations.map((inv: any) => inv.availability_id);
        console.log('既にスカウトを送った予定IDs:', sentInvitationAvailabilityIds);
        
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
          
          // 既にスカウトを送った予定は表示しない
          if (sentInvitationAvailabilityIds.includes(item.id)) {
            console.log('既にスカウトを送った予定なので非表示:', item.id);
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
        
        // データが取得できたらタイムアウトとエラー状態をリセット
        setLoadingTimeout(false);
        setConnectionError(false);
        setReconnecting(false);
        
      } catch (error) {
        console.error('予定の取得に失敗しました', error);
        // エラーが発生した場合は接続エラーを設定
        setConnectionError(true);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchAvailabilities();
    }
  }, [user, selectedDate]);
  
  // ローディング状態のタイムアウト処理
  useEffect(() => {
    let timeoutId: number;
    
    if (loading && availabilities.length === 0) {
      // 3秒後にタイムアウトを設定
      timeoutId = window.setTimeout(() => {
        setLoadingTimeout(true);
        setConnectionError(true);
        console.log('予定データの読み込みがタイムアウトしました');
        toast.error('データの読み込みに時間がかかっています。再接続を試みます。');
        
        // 自動的に再接続を試みる
        setReconnecting(true);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 3000);
    } else if (availabilities.length > 0) {
      // データが読み込まれたらタイムアウトをリセット
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
  }, [loading, availabilities.length]);
  
  
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
      setShowInviteModal(false);
      
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
    return (
      <LoadingScreen
        loadingTimeout={loadingTimeout}
        connectionError={connectionError}
        reconnecting={reconnecting}
        onReconnect={() => {
          setReconnecting(true);
          setConnectionError(false);
          setLoadingTimeout(false);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="py-8">
      {/* 接続エラー表示 */}
      {connectionError && !loading && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <div className="flex items-center">
              <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>サーバーとの接続に問題が発生しています。ネットワーク環境を確認してください。</p>
            </div>
            <div className="mt-2">
              <button
                onClick={() => {
                  setReconnecting(true);
                  setConnectionError(false);
                  setLoadingTimeout(false);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-yellow-200 hover:bg-yellow-300 rounded-md text-sm transition-colors"
              >
                {reconnecting ? '再接続中...' : '再接続する'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 日付選択部分 - 左右にはみ出しても良い */}
      <div className="w-full mb-4">
        <div className="scroll_hide overflow-x-auto">
          <div className="flex space-x-2 pb-2 px-4">
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
                  genre: availability.genre || '',
                  time: `${availability.start_time?.slice(0, 5) || ''}～${availability.end_time?.slice(0, 5) || ''}`,
                  availabilityId: availability.id,
                  avatar_url: availability.user?.avatar_url || ''
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
                  {availability.genre && (
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="text-sm font-medium">{availability.genre}</div>
                    </div>
                  )}
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
          <div className="relative inline-block pointer-events-auto">
            <button 
              onClick={() => navigate('/create-availability')}
              className="flex pl-4 pr-5 py-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.30)] shadow-[0px_4px_18px_3px_rgba(0,0,0,0.15)] inline-flex justify-start items-center gap-3 rounded-full"
              style={{
                borderRadius: 100, 
                gap: "2px", 
                backgroundColor: "#ff662f",
                position: "relative",
                zIndex: 1
              }}
            >
            <div className="w-6 h-6 relative">
              <div className="w-4 h-4 left-[4px] top-[4px] ">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <div className="text-center justify-center text-white text-md font-semibold leading-tight">予定を登録</div>
            </button>
          </div>
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