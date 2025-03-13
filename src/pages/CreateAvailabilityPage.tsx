import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import BottomNavigation from '../components/BottomNavigation';

const CreateAvailabilityPage = () => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 終日フラグを追加
  const [isFullDay, setIsFullDay] = useState(false);
  const navigate = useNavigate();

  // 日付のデフォルト値を今日に設定
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setDate(formattedDate);
  }, []);

  // 終日フラグが変更された時の処理
  useEffect(() => {
    if (isFullDay) {
      setStartTime('00:00');
      setEndTime('23:59');
    } else {
      // フラグがOFFになった時、値をリセット（またはデフォルト値に設定）
      setStartTime('');
      setEndTime('');
    }
  }, [isFullDay]);

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
          comment
        });

      if (error) throw error;

      // 登録成功したらホーム画面に戻る
      navigate('/');
      
      // トースト通知を表示
      toast.success('空いてる予定を設定しました。', {
        duration: 3000,
        style: { background: '#60a5fa' }
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
      <input
        type="time"
        id="startTime"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        required
      />
    </div>
    <div>
      <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
        終了時間
      </label>
      <input
        type="time"
        id="endTime"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        required
      />
    </div>
  </div>
) : (
  <div className="p-2 bg-gray-50 rounded-full border border-gray-200">
    <div className="text-sm text-gray-500">
      設定時間: 00:00 - 23:59（終日）
    </div>
  </div>
)}
        
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
            placeholder="例: 暇だからお出かけしよう〜！"
            className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="mt-1 text-xs text-gray-500">
            みんなに呼びかけるメッセージを書いてみよう！
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