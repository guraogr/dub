import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { supabase as supabaseClient } from '../lib/supabaseClient';

// ユーザープロフィールの型定義
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

// Supabaseコンテキストの型定義
export interface SupabaseContextType {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

// コンテキストの作成
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// プロバイダーコンポーネント
interface SupabaseProviderProps {
  children: ReactNode;
  client?: SupabaseClient; // テスト用にモックを注入できるようにする
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ 
  children, 
  client = supabaseClient // デフォルトは実際のクライアント
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // プロフィール情報を取得する関数
  const fetchProfile = async (userId: string) => {
    try {
      // プロフィール情報の取得を試みる
      const { data, error } = await client
        .from('users')
        .select('id, name, email, avatar_url')
        .eq('id', userId)
        .single();
        
      if (error) {
        // プロフィール情報がない場合、新しく作成する
        if (error.code === 'PGRST116') { // 「The result contains 0 rows」エラー
          console.log('プロフィール情報が見つからないため、新規作成します');
          
          const authUser = await client.auth.getUser();
          const userName = authUser.data.user?.user_metadata?.name || '';
          const userEmail = authUser.data.user?.email || '';
          
          // プロフィール情報を作成
          const { data: newProfile, error: insertError } = await client
            .from('users')
            .insert([{ 
              id: userId, 
              name: userName,
              email: userEmail
            }])
            .select()
            .single();
            
          if (insertError) {
            console.error('プロフィール情報の作成に失敗しました', insertError);
            return null;
          }
          
          return newProfile;
        } else {
          console.error('プロフィール情報の取得に失敗しました', error);
          return null;
        }
      }
      
      return data;
    } catch (error) {
      console.error('プロフィール取得中にエラーが発生しました', error);
      return null;
    }
  };

  // プロフィール情報を更新する関数
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
    }
  };

  useEffect(() => {
    // 現在のセッションを取得
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('認証初期化中にエラーが発生しました', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();

    // 認証状態の変化を監視（メモリリークを防ぐために一度だけ設定）
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      console.log('認証状態の変更:', event);
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        if (profileData) {
          setProfile(profileData);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client]);

  return (
    <SupabaseContext.Provider value={{ 
      supabase: client,
      session,
      user,
      profile,
      loading,
      refreshProfile
    }}>
      {children}
    </SupabaseContext.Provider>
  );
};

// カスタムフック
export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
