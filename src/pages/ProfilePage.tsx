import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSupabase } from '../contexts/SupabaseContext';
import BottomNavigation from '../components/BottomNavigation';
import Input from '../components/Input';

const ProfilePage = () => {
  // Supabaseコンテキストから認証情報とプロフィール情報を取得
  const { user, profile, loading: authLoading, refreshProfile } = useSupabase();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // プロフィール情報が変更されたときに状態を更新
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAvatarUrl(profile.avatar_url || '');
      // プレビューがない場合はプロフィール画像を表示
      if (!previewUrl) {
        setPreviewUrl(null);
      }
    } else if (user?.user_metadata?.name) {
      // プロフィールがない場合はメタデータから名前を取得
      setName(user.user_metadata.name);
    }
  }, [profile, user, previewUrl]);
  
  // 認証状態に基づいてリダイレクト
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // プロフィール更新
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // 画像サイズの再チェック
    if (avatarFile) {
      const fileSizeInMB = avatarFile.size / (1024 * 1024);
      if (fileSizeInMB > 6) {
        setError('画像サイズが大きすぎます。6MB以下の画像を選択してください。');
        return;
      }
    }
    
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
      
      // コンテキスト内のプロフィール情報を更新
      await refreshProfile();
      
      // プレビューをクリア
      setPreviewUrl(null);
      setAvatarFile(null);
      
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
            {imageLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : previewUrl ? (
              <img 
                src={previewUrl} 
                alt="プレビュー" 
                className="w-full h-full object-cover"
              />
            ) : avatarUrl ? (
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
          <label className="cursor-pointer font-medium text-sm">
            画像を変更
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const fileSizeInMB = file.size / (1024 * 1024);
                  
                  // ファイルサイズチェック (6MB以下のみ許可)
                  if (fileSizeInMB > 6) {
                    setError('画像サイズが大きすぎます。6MB以下の画像を選択してください。');
                    // ファイル入力をリセット
                    e.target.value = '';
                    return;
                  }
                  
                  // エラーをクリア
                  setError('');
                  setAvatarFile(file);
                  setImageLoading(true);
                  
                  // ファイルを読み込んでプレビュー用URLを生成
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setPreviewUrl(reader.result as string);
                    setImageLoading(false);
                  };
                  reader.onerror = () => {
                    console.error('画像の読み込みに失敗しました');
                    setImageLoading(false);
                    setError('画像の読み込みに失敗しました。別の画像をお試しください。');
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>
        
        {/* 名前 */}
        <Input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="名前を入力"
          label="名前"
        />
        
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