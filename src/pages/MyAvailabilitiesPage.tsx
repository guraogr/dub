import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import BottomNavigation from '../components/BottomNavigation';
import EditAvailabilityModal from '../components/EditAvailabilityModal';

const MyAvailabilitiesPage = () => {
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  // 編集用の状態を追加
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<any>(null);
  const navigate = useNavigate();

  // ユーザー情報の取得
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
      } else {
        navigate('/login');
      }
    };
    
    getUser();
  }, [navigate]);

  // 自分の予定を取得する関数
  const fetchMyAvailabilities = async () => {
    if (!user) {
      console.log('ユーザー情報がありません');
      return;
    }
    
    console.log('ユーザーID:', user.id);
    
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
      
      // まず単純に自分の予定を全て取得してみる
      const { data: allData, error: allError } = await supabase
        .from('availabilities')
        .select('*')
        .eq('user_id', user.id);
        
      console.log('全ての予定データ:', allData);
      
      if (allError) {
        console.error('全予定取得エラー:', allError);
      }
      
      // 自分の予定を取得（招待情報も含む）
      const { data, error } = await supabase
        .from('availabilities')
        .select(`
          *,
          invitations(id, status)
        `)
        .eq('user_id', user.id)
        // .gte('date', todayStr) // 日付フィルターを一時的に無効化
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
        
      if (error) {
        console.error('予定取得エラー:', error);
        throw error;
      }
      
      console.log('取得した予定データ:', data);
      
      if (!data || data.length === 0) {
        console.log('予定データがありません');
        setAvailabilities([]);
        return;
      }
      
      // フィルタリング処理
      const filteredData = data?.filter(item => {
        console.log('フィルタリング対象:', item.id, item.date, item.start_time, item.end_time);
        
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
        
        // 日付が今日より後の場合は表示
        if (item.date > todayStr) {
          console.log('未来の日付なので表示:', item.id);
          return true;
        }
        
        // 日付が今日で、開始時間が現在時刻より後の場合は表示
        if (item.date === todayStr) {
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
      toast.error('予定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ユーザー情報が取得できたら予定を取得
  useEffect(() => {
    if (user) {
      fetchMyAvailabilities();
    }
  }, [user]);

  // 予定削除機能
  const handleDeleteAvailability = async (id: string) => {
    try {
      // 削除前に確認ダイアログを表示
      if (!window.confirm('この予定を削除してもよろしいですか？')) {
        return;
      }
      
      // Supabaseから予定を削除
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('削除エラー:', error);
        throw error;
      }
      
      console.log('予定を削除しました:', id);
      
      // 削除成功後、リストを更新
      setAvailabilities(prev => prev.filter(item => item.id !== id));
      
      // トースト通知
      toast.success('予定を削除しました', {
        duration: 3000
      });
      
    } catch (error: any) {
      console.error('予定の削除に失敗しました', error);
      toast.error(`予定の削除に失敗しました: ${error.message}`);
    }
  };

  // 予定編集モーダルを開く
  const handleEditAvailability = (availability: any) => {
    setSelectedAvailability(availability);
    setEditModalOpen(true);
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      {loading ? (
        <div className="text-center py-8">データを読み込み中...</div>
      ) : availabilities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">募集中の予定はありません</div>
      ) : (
        <div className=" mb-20">
          {availabilities.map(availability => (
            <div 
              key={availability.id}
              className="flex items-center px-4 py-6 bg-white border-b border-gray-100"
            >
              <div className="flex-1">
                <div className="font-medium">
                  {availability.date && new Date(availability.date).toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {availability.start_time?.slice(0, 5) || ''}～{availability.end_time?.slice(0, 5) || ''}
                </div>
                <div className='flex'>
                {availability.genre && (
                  <div className="text-sm text-gray-500">{availability.genre}</div>
                )}
                {(availability.genre && availability.comment) && (
                  <div className="text-sm text-gray-500">:</div>)}
                {availability.comment && (
                  <div className="text-sm text-gray-500">{availability.comment || ''}</div>
                )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditAvailability(availability)}
                  className="px-3 py-1 text-sm text-blue-500 border border-blue-300 rounded-full hover:bg-blue-50"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDeleteAvailability(availability.id)}
                  className="px-3 py-1 text-sm text-red-500 border border-red-300 rounded-full hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 編集モーダル */}
      <EditAvailabilityModal
        availability={selectedAvailability}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdate={fetchMyAvailabilities}
      />
      
      <BottomNavigation />
    </div>
  );
};

export default MyAvailabilitiesPage;