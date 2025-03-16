import { createClient } from '@supabase/supabase-js';

// .env.localファイルから環境変数を読み込む
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabaseクライアントの作成
// リアルタイム接続の設定を改善
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // タイムアウトを非常に長めに設定 (20分)
    timeout: 1200000
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
const maxReconnectAttempts = 20; // 再接続試行回数を増やす
const reconnectInterval = 5000; // 5秒に変更

// 定期的な接続確認とピング送信
const pingInterval = 120000; // 2分に変更
let pingTimer: number | null = null;

// ピング関数
const pingServer = () => {
  if (channel) {
    console.log('サーバーにピングを送信します');
    // ダミーメッセージを送信して接続を維持
    channel.send({
      type: 'broadcast',
      event: 'ping',
      payload: { timestamp: new Date().toISOString() }
    });
  }
};

// ピングタイマーの開始
const startPingTimer = () => {
  if (pingTimer) {
    clearInterval(pingTimer);
  }
  pingTimer = window.setInterval(pingServer, pingInterval) as unknown as number;
};

// 再接続関数
const attemptReconnect = () => {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(`再接続試行 ${reconnectAttempts}/${maxReconnectAttempts}`);
    
    setTimeout(() => {
      channel.subscribe((status) => {
        console.log(`再接続ステータス: ${status}`);
        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0; // 成功したらカウンターをリセット
          startPingTimer(); // ピングタイマーを開始
          // アプリ全体の再読み込みイベントを発行
          window.dispatchEvent(new CustomEvent('supabase:reconnected'));
        }
      });
    }, reconnectInterval * Math.min(reconnectAttempts, 5)); // 再試行間隔を増やす（最大で5倍まで）
  } else {
    console.error('再接続の試行回数が上限に達しました。ページを再読み込みしてください。');
    // アプリ全体の再読み込み失敗イベントを発行
    window.dispatchEvent(new CustomEvent('supabase:reconnect-failed'));
  }
};

// チャンネルの設定
channel
  .on('system', { event: 'disconnected' }, () => {
    console.log('リアルタイム接続が切断されました。再接続を試みます。');
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    attemptReconnect();
  })
  .on('system', { event: 'connected' }, () => {
    console.log('リアルタイム接続が確立されました');
    reconnectAttempts = 0;
    startPingTimer();
  })
  .on('broadcast', { event: 'ping' }, (payload) => {
    console.log('ピング応答を受信しました', payload);
  })
  .subscribe((status) => {
    console.log(`初期接続ステータス: ${status}`);
    if (status === 'SUBSCRIBED') {
      startPingTimer();
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
    // アプリが再表示されたときに再接続を確認
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'ping',
        payload: { timestamp: new Date().toISOString() }
      });
    }
  }
});