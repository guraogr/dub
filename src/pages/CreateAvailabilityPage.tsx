import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const CreateAvailabilityPage = () => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    try {
      // 現在のユーザー情報を取得
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) {
        throw new Error('ユーザーが見つかりません');
      }
  
      // usersテーブルにユーザーが存在するか確認
      const { data: userExists, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userData.user.id)
        .single();
  
      // ユーザーが存在しない場合は作成
      if (!userExists) {
        const { error: insertUserError } = await supabase
          .from('users')
          .insert([{ 
            id: userData.user.id, 
            email: userData.user.email, 
            name: userData.user.email?.split('@')[0] || 'ユーザー' // 仮の名前
          }]);
        
        if (insertUserError) {
          throw new Error('ユーザープロフィールの作成に失敗しました');
        }
      }
  
      // 空き時間情報をデータベースに登録
      const { error } = await supabase.from('availabilities').insert([
        {
          user_id: userData.user.id,
          date,
          start_time: startTime,
          end_time: endTime,
          comment
        }
      ]);
  
      if (error) throw error;
  
      // 登録成功したらホーム画面に戻る
      navigate('/');
      
      // 成功メッセージを表示
      alert('予定を登録しました！');
    } catch (error: any) {
      console.error('エラー:', error);
      setError(error.message || '予定の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">空いてる予定を登録する</h1>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            日付
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
              開始時間
            </label>
            <input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
              終了時間
            </label>
            <input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
            一言コメント
          </label>
          <input
            id="comment"
            type="text"
            placeholder="例: 暇だからお出かけしましょう〜！"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? '登録中...' : '予定を登録する'}
          </button>
        </div>
        
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:underline"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAvailabilityPage;