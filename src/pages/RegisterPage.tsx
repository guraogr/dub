import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Input from '../components/Input';
import Button from '../components/ui/Button';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
  
    try {
      // Supabaseに新しいユーザーを登録
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) throw signUpError;
  
      // ユーザープロフィール情報をusersテーブルに保存
      if (authData && authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([{ 
            id: authData.user.id, 
            email: email, 
            name: name 
          }]);
        
        if (profileError) throw profileError;
      }
  
      setMessage('登録が完了しました！メールを確認してください。');
    } catch (error: any) {
      setMessage(error.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg">
        <h1 className="text-2xl font-bold text-center">会員登録</h1>
        
        {message && (
          <div className={`p-3 text-sm rounded ${message.includes('完了') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              fullWidth
              className="py-4"

            >
              {loading ? '登録中...' : '登録する'}
            </Button>
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