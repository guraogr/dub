import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import BottomNavigation from '../components/BottomNavigation';

const CreateAvailabilityPage = () => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 終日フラグを追加
  const [isFullDay, setIsFullDay] = useState(false);
  // ジャンル選択用のstate
  const [genre, setGenre] = useState('その他');
  const navigate = useNavigate();

  // 日付のデフォルト値を今日に設定
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setDate(formattedDate);
    
    // 現在時刻以降の30分単位の時間スロットを生成
    updateAvailableTimeSlots(today);
  }, []);

  // 選択した日付が変更されたときに利用可能な時間スロットを更新
  useEffect(() => {
    if (date) {
      const selectedDate = new Date(date);
      const today = new Date();
      
      // 日付が今日かどうかチェック
      const isToday = selectedDate.toDateString() === today.toDateString();
      
      if (isToday) {
        // 今日の場合は現在時刻以降のスロットを生成
        updateAvailableTimeSlots(today);
      } else {
        // 今日以外の場合は全ての時間スロットを生成
        generateAllTimeSlots();
      }
    }
  }, [date]);
  
  // 現在時刻以降の利用可能な時間スロットを更新する関数
  const updateAvailableTimeSlots = (currentDate: Date) => {
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    
    // 現在の30分単位の時間を計算
    let currentSlot = hours;
    let currentMinuteSlot = minutes < 30 ? 0 : 30;
    
    // 次の30分単位のスロットに進める
    if (minutes > 30) {
      currentSlot += 1;
      currentMinuteSlot = 0;
    } else if (minutes > 0 && minutes <= 30) {
      currentMinuteSlot = 30;
    }
    
    const slots: string[] = [];
    
    // 現在時刻以降の30分単位のスロットを生成
    for (let h = currentSlot; h < 24; h++) {
      const startMinute = h === currentSlot ? currentMinuteSlot : 0;
      
      for (let m = startMinute; m < 60; m += 30) {
        const formattedHour = h.toString().padStart(2, '0');
        const formattedMinute = m.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    
    setAvailableTimeSlots(slots);
    
    // デフォルト値を設定
    if (slots.length > 0) {
      setStartTime(slots[0]);
      setEndTime(slots.length > 1 ? slots[1] : slots[0]);
    }
  };
  
  // 全ての30分単位の時間スロットを生成する関数
  const generateAllTimeSlots = () => {
    const slots: string[] = [];
    
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const formattedHour = h.toString().padStart(2, '0');
        const formattedMinute = m.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    
    setAvailableTimeSlots(slots);
    
    // デフォルト値を設定
    if (slots.length > 0) {
      setStartTime(slots[0]);
      setEndTime(slots.length > 1 ? slots[1] : slots[0]);
    }
  };
  
  // 終日フラグが変更された時の処理
  useEffect(() => {
    if (isFullDay) {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const startMinute = currentMinute < 30 ? 30 : 60;
      const startHour = now.getHours() + (startMinute === 60 ? 1 : 0);
      const formattedStartHour = startHour.toString().padStart(2, '0');
      const formattedStartMinute = startMinute.toString().padStart(2, '0');
      setStartTime(`${formattedStartHour}:${formattedStartMinute}`);
      setEndTime('23:30');
    } else if (availableTimeSlots.length > 0) {
      // フラグがOFFになった時、利用可能な最初のスロットに設定
      setStartTime(availableTimeSlots[0]);
      setEndTime(availableTimeSlots.length > 1 ? availableTimeSlots[1] : availableTimeSlots[0]);
    }
  }, [isFullDay, availableTimeSlots]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 入力値のバリデーション
      if (!date) {
        setError('日付を入力してください');
        return;
      }

      if (!isFullDay && (!startTime || !endTime)) {
        setError('時間を入力してください');
        return;
      }

      // 現在のユーザー情報を取得
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) {
        throw new Error('ユーザーが見つかりません');
      }

      // 空き時間情報をデータベースに登録
      const { error } = await supabase
        .from('availabilities')
        .insert({
          user_id: userData.user.id,
          date,
          start_time: startTime,
          end_time: endTime,
          comment,
          genre
        });

      if (error) throw error;

      // 登録成功したらホーム画面に戻る
      navigate('/');
      
      // トースト通知を表示
      toast.success('空いてる予定を設定しました。', {
        duration: 3000,
        style: { background: '#111111', color: "#fff" }
      });

    } catch (error: any) {
      console.error('エラー:', error);
      setError(error.message || '予定の登録に失敗しました');
      
      // エラー時のトースト
      toast.error(`予定の登録に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-10 text-center pt-8">空いてる予定を登録する</h1>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 終日トグル */}
        <div className="flex items-center justify-between mb-4">
          <label htmlFor="toggle-full-day" className="block text-sm font-medium text-gray-700">終日</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="toggle-full-day"
              className="sr-only peer"
              checked={isFullDay}
              onChange={() => setIsFullDay(!isFullDay)}
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
        
        {/* 日付選択 */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            日付
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        {/* 時間選択（終日がOFFの場合のみ表示） */}
        {!isFullDay ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                開始時間
              </label>
              <select
                id="startTime"
                value={startTime}
                onChange={(e) => {
                  const newStartTime = e.target.value;
                  setStartTime(newStartTime);
                  
                  // 開始時間が終了時間より後の場合、終了時間を調整
                  if (newStartTime >= endTime) {
                    // 開始時間の次のスロットを探す
                    const startIndex = availableTimeSlots.indexOf(newStartTime);
                    if (startIndex < availableTimeSlots.length - 1) {
                      setEndTime(availableTimeSlots[startIndex + 1]);
                    } else {
                      setEndTime(newStartTime);
                    }
                  }
                }}
                className="mt-1 block w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {availableTimeSlots.map((timeSlot, index) => (
                  <option key={index} value={timeSlot}>
                    {timeSlot}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                終了時間
              </label>
              <select
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {availableTimeSlots
                  .filter(time => time >= startTime) // 開始時間以降のスロットのみ表示
                  .map((timeSlot, index) => (
                    <option key={index} value={timeSlot}>
                      {timeSlot}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
            <div className="text-sm text-gray-500">
              設定時間: {startTime} - 23:30（終日）
            </div>
          </div>
        )}
                
        {/* ジャンル選択 */}
        <div>
          <label htmlFor="genre" className="block text-sm font-medium text-gray-700">
            ジャンル
          </label>
          <select
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="フットサル">フットサル</option>
            <option value="テニス">テニス</option>
            <option value="ジム/筋トレ">ジム/筋トレ</option>
            <option value="スポーツ観戦">スポーツ観戦</option>
            <option value="ショッピング">ショッピング</option>
            <option value="映画">映画</option>
            <option value="ライブ">ライブ</option>
            <option value="サウナ">サウナ</option>
            <option value="散歩">散歩</option>
            <option value="カフェ">カフェ</option>
            <option value="朝活">朝活</option>
            <option value="ランチ">ランチ</option>
            <option value="飲み会">飲み会</option>
            <option value="その他">その他</option>
          </select>
          <div className="mt-1 text-xs text-gray-500">
            遊びのジャンルを選択してください
          </div>
        </div>
        
        {/* コメント入力 */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
            一言コメント
          </label>
          <input
            type="text"
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例: テルマー湯に一緒に行こう〜！"
            className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="mt-1 text-xs text-gray-500">
            出かけたい特定の場所や、遊びたい内容を書いてみよう！
          </div>
        </div>
        
        {/* 送信ボタン */}
        <div className="relative w-full">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 hover:bg-orange-600 text-white font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            style={{
              borderRadius: "300px", 
              padding: "16px 0", 
              backgroundColor: "#f97316",
              position: "relative",
              zIndex: 1
            }}
          >
            {loading ? '登録中...' : '予定を登録する'}
          </button>
        </div>
      </form>
      
      <BottomNavigation />
    </div>
  );
};

export default CreateAvailabilityPage;