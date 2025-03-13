import { createClient } from '@supabase/supabase-js';

// テスト用のダミーURL・キー
const supabaseUrl = 'https://example.supabase.co';
const supabaseAnonKey = 'test-anon-key';

// テスト用Supabaseクライアントの作成
export const supabaseMock = createClient(supabaseUrl, supabaseAnonKey);
