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
    <div className="max-w-md mx-auto p-4 pb-20 bg-white">
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* プロフィール画像 */}
        <div className="flex flex-col items-center mt-6 mb-8">
          <div className="w-32 h-32 bg-gray-200 rounded-full mb-3 overflow-hidden">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="プロフィール" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <label className="cursor-pointer text-blue-500 font-medium text-sm">
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
        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            名前
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="名前を入力"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
          />
        </div>
        
        {/* 更新ボタン */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 inline-flex justify-center items-center gap-3 text-white"
            style={{borderRadius: "300px", padding: "16px 0"}}
          >
            {loading ? '更新中...' : 'プロフィールを更新'}
          </button>
        </div>
      </form>
      
      {/* ログアウトボタン */}
      <div className="pt-3">
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/login');
          }}
          className="w-full px-4 py-3 text-red-500 font-medium text-base rounded-lg"
        >
          ログアウト
        </button>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;