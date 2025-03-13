import React, { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as supabaseClient } from '../lib/supabaseClient';

// Supabaseクライアントの型定義
export interface SupabaseContextType {
  supabase: SupabaseClient;
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
  return (
    <SupabaseContext.Provider value={{ supabase: client }}>
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
