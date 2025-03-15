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
  const [loading, setLoading] = useState(false);
  
  // モーダルが開かれた時に初期値をセット
  useEffect(() => {
    if (isOpen && availability) {
      setDate(availability.date || '');
      setStartTime(availability.start_time?.slice(0, 5) || '');
      setEndTime(availability.end_time?.slice(0, 5) || '');
      setComment(availability.comment || '');
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
              <input
                type="time"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                step="1800"
                className="mt-1 block w-full border border-gray-300 rounded-full p-2"
                required
              />

              {/* <input
                type="time"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-full p-2"
                required
              /> */}
            </div>
            
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">終了時間</label>
              <input
                type="time"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                step="1800"
                className="mt-1 block w-full border border-gray-300 rounded-full p-2"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700">コメント</label>
            <input
              type="text"
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="例: 暇だからお出かけしよう〜！"
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