import { createClient } from '@supabase/supabase-js';

// .env.localファイルから環境変数を読み込む
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // タイムアウトを短めに設定 (2分)
    timeout: 120000
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  // ネットワークエラー時の再試行設定
  global: {
    headers: {
      'X-Client-Info': 'dub-app'
    },
    fetch: fetch.bind(globalThis)
  }
});

// リアルタイム接続のエラーハンドリング
const channel = supabase.channel('system');

// 切断時の再接続処理
let reconnectAttempts = 0;
const maxReconnectAttempts = 10; 
const reconnectInterval = 3000; 

// 定期的な接続確認とピング送信
const pingInterval = 60000; 
let pingTimer: number | null = null;
let reconnectTimer: number | null = null;

// 接続状態の変数を定義
const connectionState = {
  isConnected: true,
  lastPingSuccess: Date.now(),
  lastActivity: Date.now()
};

// ピング関数
const pingServer = async () => {
  try {
    console.log('サーバーにピングを送信します');
    
    // 実際のデータベースクエリを使用して接続を確認
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .limit(1);
      
    if (error) {
      console.error('ピングエラー:', error);
      connectionState.isConnected = false;
      window.dispatchEvent(new CustomEvent('supabase:connection-error'));
      return false;
    }
    
    // 成功
    connectionState.isConnected = true;
    connectionState.lastPingSuccess = Date.now();
    console.log('ピング成功:', { count });
    return true;
  } catch (error) {
    console.error('ピング例外:', error);
    connectionState.isConnected = false;
    window.dispatchEvent(new CustomEvent('supabase:connection-error'));
    return false;
  }
};

// ピングタイマーの開始
const startPingTimer = () => {
  if (pingTimer) {
    clearInterval(pingTimer);
  }
  pingTimer = window.setInterval(async () => {
    // 最後のアクティビティから3分以上経過したらピングを送信
    const now = Date.now();
    const inactiveTime = now - connectionState.lastActivity;
    
    if (inactiveTime > 3 * 60 * 1000) {
      console.log(`${Math.round(inactiveTime / 1000)}秒間非アクティブです。ピングを送信します。`);
      await pingServer();
    }
  }, pingInterval) as unknown as number;
};

// ユーザーアクティビティ記録
const recordActivity = () => {
  connectionState.lastActivity = Date.now();
};

// アクティビティイベントリスナーを設定
window.addEventListener('mousemove', recordActivity);
window.addEventListener('keydown', recordActivity);
window.addEventListener('touchstart', recordActivity);
window.addEventListener('click', recordActivity);

// 再接続関数
const attemptReconnect = () => {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(`再接続試行 ${reconnectAttempts}/${maxReconnectAttempts}`);
    
    // 前回のタイマーをクリア
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    reconnectTimer = window.setTimeout(async () => {
      // 接続を確認
      const success = await pingServer();
      
      if (success) {
        console.log('再接続成功');
        reconnectAttempts = 0;
        connectionState.isConnected = true;
        startPingTimer();
        window.dispatchEvent(new CustomEvent('supabase:reconnected'));
      } else {
        console.log('再接続失敗、再試行します');
        attemptReconnect();
      }
    }, reconnectInterval * Math.min(reconnectAttempts, 3)) as unknown as number;
  } else {
    console.error('再接続の試行回数が上限に達しました。ページを再読み込みしてください。');
    window.dispatchEvent(new CustomEvent('supabase:reconnect-failed'));
  }
};

// チャンネルの設定
channel
  .on('presence', { event: 'sync' }, () => {
    console.log('プレゼンス同期されました');
    connectionState.isConnected = true;
    connectionState.lastActivity = Date.now();
  })
  .on('system', { event: 'disconnected' }, () => {
    console.log('リアルタイム接続が切断されました。再接続を試みます。');
    connectionState.isConnected = false;
    
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    
    window.dispatchEvent(new CustomEvent('supabase:connection-error'));
    attemptReconnect();
  })
  .on('system', { event: 'connected' }, () => {
    console.log('リアルタイム接続が確立されました');
    connectionState.isConnected = true;
    reconnectAttempts = 0;
    startPingTimer();
    window.dispatchEvent(new CustomEvent('supabase:reconnected'));
  })
  .subscribe((status) => {
    console.log(`初期接続ステータス: ${status}`);
    if (status === 'SUBSCRIBED') {
      connectionState.isConnected = true;
      startPingTimer();
    } else if (status === 'CHANNEL_ERROR') {
      connectionState.isConnected = false;
      window.dispatchEvent(new CustomEvent('supabase:connection-error'));
    }
  });

// エラーハンドリング関数
export const handleSupabaseError = (error: any, defaultMessage = 'エラーが発生しました') => {
  console.error('Supabaseエラー:', error);
  
  if (error?.message?.includes('JWT expired')) {
    // JWTの期限切れの場合、再ログインが必要
    return 'セッションの期限が切れました。再ログインしてください。';
  }
  
  if (error?.message?.includes('CLOSED') || error?.message?.includes('connection')) {
    // 接続が閉じられた場合や接続エラー
    // 再接続イベントを発行
    window.dispatchEvent(new CustomEvent('supabase:connection-error'));
    return 'サーバーとの接続が切断されました。再接続しています。';
  }
  
  if (error?.message?.includes('timeout')) {
    // タイムアウトエラー
    window.dispatchEvent(new CustomEvent('supabase:timeout'));
    return 'サーバーからの応答がタイムアウトしました。再試行しています。';
  }
  
  return error?.message || defaultMessage;
};

// アプリがバックグラウンドからフォアグラウンドに戻ったときの処理
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('アプリがフォアグラウンドに戻りました。接続を確認します。');
    
    // 最後のピング成功から1分以上経過している場合は接続を確認
    const now = Date.now();
    const timeSinceLastPing = now - connectionState.lastPingSuccess;
    
    if (timeSinceLastPing > 60000) {
      console.log(`最後のピングから${Math.round(timeSinceLastPing / 1000)}秒経過しています。接続を確認します。`);
      pingServer().then(success => {
        if (success) {
          console.log('ページ再表示後の接続確認に成功しました');
        } else {
          console.log('ページ再表示後の接続確認に失敗しました。再接続を試みます');
          attemptReconnect();
        }
      });
    }
  }
});

// 接続状態取得関数
export const getConnectionState = () => {
  return connectionState;
};

// 手動でピングを送信する関数
export const checkConnection = async () => {
  return await pingServer();
};