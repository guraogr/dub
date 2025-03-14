import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Input from '../components/Input';
import { useNavigate } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 会員登録処理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 入力チェック
    if (!name || !email || !password) {
      setMessage('すべての項目を入力してください');
      return;
    }
    
    // ローディング開始
    setLoading(true);
    setMessage('');
  
    try {
      // 1. Supabaseにユーザー登録を行う
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name, // ユーザーメタデータに名前を保存
          },
        },
      });
      
      if (error) {
        throw error;
      }
      
      if (!data || !data.user) {
        throw new Error('ユーザー登録に失敗しました');
      }
      
      // 2. ユーザープロフィール情報をusersテーブルに保存
      const { error: profileError } = await supabase
        .from('users')
        .insert([{ 
          id: data.user.id, 
          email: email, 
          name: name 
        }]);
      
      if (profileError) {
        console.error('プロフィール作成エラー:', profileError);
        // プロフィール作成エラーはユーザーに表示するが、登録自体は完了しているのでエラーとして扱わない
      }
      
      // 3. 成功メッセージを表示
      setMessage('登録が完了しました！メールアドレスの確認メールを確認してください。メール内のリンクをクリックしてアカウントを有効化してください。');
      
      // メール確認後のログインのためのリスナーを設定
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // メール確認後にログインしたらホームページに遷移
          navigate('/');
        }
      });
      
    } catch (error: any) {
      // エラーメッセージを表示
      console.error('登録エラー:', error);
      setMessage(error.message || '登録に失敗しました');
    } finally {
      // ローディング終了
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg">
        <h1 className="text-2xl font-bold text-center">会員登録</h1>
        
        {message && (
          <div className={`p-3 text-sm rounded ${message.includes('完了') || message.includes('確認') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleRegister} className="space-y-6">
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            label="名前"
            placeholder="名前を入力"
          />
          
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            label="メールアドレス"
            placeholder="メールアドレスを入力"
          />
          
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            label="パスワード"
            placeholder="パスワードを入力"
          />
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 rounded-full"
              style={{
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                backgroundColor: '#f97316', /* orange-500の16進数カラーコード */
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'block',
                width: '100%',
                borderRadius: '300px',
                padding: "16px 0",
              }}
            >
              {loading ? '登録中...' : '登録する'}
            </button>
          </div>
          
          <div className="text-center">
            <a href="/login" className="text-sm text-orange-600 hover:underline">
              すでにアカウントをお持ちの方はログイン
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;