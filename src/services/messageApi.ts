import { SupabaseClient } from '@supabase/supabase-js';
import { ExtendedMessageType } from '../types';
import { enhanceMessagesWithTimeInfo } from './messageService';

/**
 * メッセージAPIサービス
 * Supabaseとの通信を担当する関数群
 */

// メッセージキャッシュを保持
let messageCache: {
  inbox: { data: ExtendedMessageType[], timestamp: number } | null,
  sent: { data: ExtendedMessageType[], timestamp: number } | null
} = {
  inbox: null,
  sent: null
};

// キャッシュの有効期限（30秒）
const CACHE_TTL = 30 * 1000;

// クエリのタイムアウト設定
const QUERY_TIMEOUT = 5000; // 5秒

// タイムアウト付きのクエリ実行関数
const executeQueryWithTimeout = async <T>(queryFn: () => Promise<T>): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  
  // タイムアウト用のプロミス
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('クエリがタイムアウトしました'));
    }, QUERY_TIMEOUT);
  });
  
  try {
    // クエリとタイムアウトのレース状態
    const result = await Promise.race([queryFn(), timeoutPromise]) as T;
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
};

/**
 * 受信メッセージを取得する
 */
export const fetchInboxMessages = async (
  supabase: SupabaseClient, 
  userId: string
): Promise<ExtendedMessageType[]> => {
  try {
    // キャッシュチェック
    const now = Date.now();
    if (messageCache.inbox && (now - messageCache.inbox.timestamp) < CACHE_TTL) {
      console.log('キャッシュから受信メッセージを読み込みました');
      return messageCache.inbox.data;
    }

    // タイムアウト付きでクエリを実行
    const { data, error } = await executeQueryWithTimeout(
      async () => supabase
        .from('messages')
        .select(`
          id, type, content, sender_id, recipient_id, is_read, created_at,
          sender:sender_id(id, name, avatar_url),
          invitation:invitation_id(id, status,
            availability:availability_id(id, date, start_time, end_time, comment, genre)
          )
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(20) // データ量を制限
    );
      
    if (error) {
      console.error('受信メッセージの取得エラー:', error);
      throw error;
    }
    
    const enhancedData = enhanceMessagesWithTimeInfo(data || []);
    
    // キャッシュを更新
    messageCache.inbox = {
      data: enhancedData,
      timestamp: now
    };
    
    return enhancedData;
  } catch (error) {
    console.error('受信メッセージの取得中にエラーが発生しました:', error);
    // エラー発生時はキャッシュをクリア
    messageCache.inbox = null;
    throw error;
  }
};

/**
 * 送信メッセージを取得する
 */
export const fetchSentMessages = async (
  supabase: SupabaseClient, 
  userId: string
): Promise<ExtendedMessageType[]> => {
  try {
    // キャッシュチェック
    const now = Date.now();
    if (messageCache.sent && (now - messageCache.sent.timestamp) < CACHE_TTL) {
      console.log('キャッシュから送信メッセージを読み込みました');
      return messageCache.sent.data;
    }

    // タイムアウト付きでクエリを実行
    const { data, error } = await executeQueryWithTimeout(
      async () => supabase
        .from('messages')
        .select(`
          id, type, content, sender_id, recipient_id, is_read, created_at,
          recipient:recipient_id(id, name, avatar_url),
          invitation:invitation_id(id, status,
            availability:availability_id(id, date, start_time, end_time, comment, genre)
          )
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(20) // データ量を制限
    );
      
    if (error) {
      console.error('送信メッセージの取得エラー:', error);
      throw error;
    }
    
    const enhancedData = enhanceMessagesWithTimeInfo(data || []);
    
    // キャッシュを更新
    messageCache.sent = {
      data: enhancedData,
      timestamp: now
    };
    
    return enhancedData;
  } catch (error) {
    console.error('送信メッセージの取得中にエラーが発生しました:', error);
    // エラー発生時はキャッシュをクリア
    messageCache.sent = null;
    throw error;
  }
};

/**
 * メッセージを既読にする
 */
export const markMessageAsRead = async (
  supabase: SupabaseClient, 
  messageId: string
): Promise<boolean> => {
  try {
    const { error } = await executeQueryWithTimeout(
      async () => supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
    );
      
    if (error) {
      console.error('メッセージの既読処理に失敗しました:', error);
      return false;
    }
    
    // キャッシュをクリアして新しいデータを取得できるようにする
    messageCache.inbox = null;
    
    return true;
  } catch (error) {
    console.error('メッセージの既読処理中にエラーが発生しました:', error);
    return false;
  }
};

/**
 * キャッシュをクリアする
 */
export const clearMessageCache = () => {
  messageCache = {
    inbox: null,
    sent: null
  };
  console.log('メッセージキャッシュをクリアしました');
  return true; // 成功を返す
};

/**
 * 招待への応答を処理する
 */
export const respondToInvitation = async (
  supabase: SupabaseClient,
  messageId: string, 
  invitationId: string, 
  status: 'accepted' | 'rejected'
): Promise<boolean> => {
  try {
    // 元のメッセージ情報を取得
    const { data: messageData, error: fetchError } = await executeQueryWithTimeout(
      async () => supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single()
    );
    
    if (fetchError) {
      console.error('メッセージ取得エラー:', fetchError);
      throw fetchError;
    }
    
    // invitationsテーブルのステータスを更新
    const { error: invitationError } = await executeQueryWithTimeout(
      async () => supabase
        .from('invitations')
        .update({ status })
        .eq('id', invitationId)
    );
      
    if (invitationError) {
      console.error('招待状態更新エラー:', invitationError);
      throw invitationError;
    }
    
    // メッセージを既読にする
    const { error: messageError } = await executeQueryWithTimeout(
      async () => supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
    );
      
    if (messageError) {
      console.error('メッセージ更新エラー:', messageError);
      throw messageError;
    }
    
    // 新しいメッセージを作成
    let content = '';
    if (status === 'accepted') {
      content = '遊びの誘いを承諾しました';
    } else if (status === 'rejected') {
      content = '遊びの誘いをお断りしました';
    }
    
    // ユーザー情報を取得
    const { data: userData, error: userError } = await executeQueryWithTimeout(
      async () => supabase.auth.getUser()
    );
    
    if (userError) {
      console.error('ユーザー情報取得エラー:', userError);
      throw userError;
    }
    
    // 現在のユーザーIDを確認
    const currentUserId = userData.user?.id;
    
    if (!currentUserId) {
      throw new Error('ユーザーIDが取得できませんでした');
    }
    
    // 現在のユーザーIDとメッセージの受信者IDが一致するか確認
    if (currentUserId !== messageData.recipient_id) {
      throw new Error('メッセージの受信者IDと現在のユーザーIDが一致しません');
    }
    
    // 新しいメッセージを作成
    const { error: createError } = await executeQueryWithTimeout(
      async () => supabase
        .from('messages')
        .insert({
          sender_id: currentUserId, // 現在のユーザーIDを使用
          recipient_id: messageData.sender_id,
          content: content,
          type: status === 'accepted' ? 'acceptance' : 'rejection',
          invitation_id: invitationId,
          is_read: false
        })
    );
    
    if (createError) {
      console.error('自分宛メッセージの作成エラー:', createError);
      throw new Error(`自分宛メッセージの作成エラー: ${createError.message}`);
    }
    
    // キャッシュをクリアして最新データを取得できるようにする
    clearMessageCache();
    
    return true;
  } catch (error) {
    console.error('招待への応答処理に失敗しました:', error);
    // エラー発生時はキャッシュをクリア
    clearMessageCache();
    return false;
  }
};
/**
 * メッセージの接続状態を確認する
 */
export const checkConnectionStatus = async (supabase: SupabaseClient): Promise<boolean> => {
  try {
    // 軽量なクエリで接続確認
    await executeQueryWithTimeout(
      async () => supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .limit(1)
    );
    
    return true; // 接続成功
  } catch (error) {
    console.error('接続確認中にエラーが発生しました:', error);
    return false; // 接続失敗
  }
};
