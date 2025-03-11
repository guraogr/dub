import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import BottomNavigation from '../components/BottomNavigation';

const ProfilePage = () => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // ユーザー情報の取得
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }
      
      setUser(user);
      
      // プロフィール情報の取得
      const { data, error } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('プロフィール情報の取得に失敗しました', error);
        return;
      }
      
      if (data) {
        setName(data.name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    };
    
    getUser();
  }, [navigate]);

  // プロフィール更新
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      let newAvatarUrl = avatarUrl;
      
      // 新しい画像がある場合はアップロード
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `avatars/${user.id}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);
          
        if (uploadError) throw uploadError;
        
        // 公開URLを取得
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        if (data) {
          newAvatarUrl = data.publicUrl;
        }
      }
      
      // プロフィール情報の更新
      const { error } = await supabase
        .from('users')
        .update({
          name,
          avatar_url: newAvatarUrl,
          updated_at: new Date()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // 成功メッセージを表示
      alert('プロフィールを更新しました！');
      navigate('/');
      
    } catch (error: any) {
      console.error('プロフィール更新エラー:', error);
      setError(error.message || 'プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">プロフィール設定</h1>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* プロフィール画像 */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-300 rounded-full mb-2 overflow-hidden">
            {avatarUrl && (
              <img 
                src={avatarUrl} 
                alt="プロフィール" 
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <label className="cursor-pointer text-blue-500">
            画像を変更
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setAvatarFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
        
        {/* 名前 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            名前
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* 更新ボタン */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? '更新中...' : 'プロフィールを更新'}
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
      
      {/* ログアウトボタン */}
      <div className="mt-8 border-t pt-6">
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/login');
          }}
          className="w-full px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          ログアウト
        </button>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;