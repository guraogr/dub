import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

interface EditAvailabilityModalProps {
  availability: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const EditAvailabilityModal = ({ availability, isOpen, onClose, onUpdate }: EditAvailabilityModalProps) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comment, setComment] = useState('');
  const [genre, setGenre] = useState('その他');
  const [loading, setLoading] = useState(false);
  
  // モーダルが開かれた時に初期値をセット
  useEffect(() => {
    if (isOpen && availability) {
      setDate(availability.date || '');
      setStartTime(availability.start_time?.slice(0, 5) || '');
      setEndTime(availability.end_time?.slice(0, 5) || '');
      setComment(availability.comment || '');
      setGenre(availability.genre || 'その他');
    }
  }, [isOpen, availability]);
  
  if (!isOpen || !availability) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // 入力値の検証
      if (!date || !startTime || !endTime) {
        toast.error('日付と時間を入力してください');
        return;
      }
      
      // Supabaseでデータを更新
      const { error } = await supabase
        .from('availabilities')
        .update({
          date,
          start_time: startTime,
          end_time: endTime,
          comment,
          genre,
          updated_at: new Date()
        })
        .eq('id', availability.id);
        
      if (error) throw error;
      
      // 成功通知
      toast.success('予定を更新しました');
      
      // モーダルを閉じて親コンポーネントに通知
      onClose();
      onUpdate();
      
    } catch (error: any) {
      console.error('予定の更新に失敗しました', error);
      toast.error(`予定の更新に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white p-6 w-80 max-w-md rounded-2xl">
        <h3 className="text-lg font-medium mb-4">予定を編集</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">日付</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-full p-2"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">開始時間</label>
              <select
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Array.from({ length: 48 }).map((_, i) => (
                  <option key={i} value={`${("0" + Math.floor(i / 2)).slice(-2)}:${(i % 2) ? "30" : "00"}`}>
                    {`${("0" + Math.floor(i / 2)).slice(-2)}:${(i % 2) ? "30" : "00"}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">終了時間</label>
              <select
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Array.from({ length: 48 }).map((_, i) => (
                  <option key={i} value={`${("0" + Math.floor(i / 2)).slice(-2)}:${(i % 2) ? "30" : "00"}`}>
                    {`${("0" + Math.floor(i / 2)).slice(-2)}:${(i % 2) ? "30" : "00"}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-gray-700">ジャンル</label>
            <select
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
          </div>
          
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700">コメント</label>
            <input
              type="text"
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="例: テルマー湯に一緒に行こう〜！"
              className="mt-1 block w-full border border-gray-300 rounded-full p-2"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100"
              style={{borderRadius: "1000px"}}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-500 text-white rounded-full disabled:opacity-50"
              style={{borderRadius: "1000px"}}
            >
              {loading ? '更新中...' : '更新する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAvailabilityModal;