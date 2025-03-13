import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Input from '../components/Input';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // ログイン成功したらメインページへリダイレクト
      window.location.href = '/';
    } catch (error: any) {
      setMessage(error.message || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg">
        <h1 className="text-2xl font-bold text-center">「dub」へようこそ！</h1>
        
        {message && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded">
            {message}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
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
            label="パスワード"
            placeholder="パスワードを入力"
          />
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-white bg-orange-500 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 appearance-none"
              style={{
                WebkitAppearance: 'none',
                appearance: 'none',
                color: 'white',
                border: 'none',
                padding: '16px 0',
                borderRadius: '1000px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'block',
                width: '100%'
              }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
          
          <div className="text-center">
            <a href="/register" className="text-sm text-orange-600 hover:underline">
              アカウントをお持ちでない方は登録してください
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;