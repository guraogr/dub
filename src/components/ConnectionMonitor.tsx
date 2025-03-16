import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

interface ConnectionMonitorProps {
  children: React.ReactNode;
}

/**
 * Connection Monitor Component
 * 
 * Monitors the Supabase connection status and provides a recovery mechanism
 * for when connections drop or timeout after periods of inactivity.
 */
const ConnectionMonitor: React.FC<ConnectionMonitorProps> = ({ children }) => {
  const [connectionError, setConnectionError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showRecoveryUI, setShowRecoveryUI] = useState(false);
  const inactivityTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const reconnectAttemptsRef = useRef<number>(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  // Track user activity
  useEffect(() => {
    const updateLastActivity = () => {
      lastActivityRef.current = Date.now();
      
      // Reset connection error state if user becomes active and there was an error
      if (connectionError && !reconnecting) {
        console.log('User activity detected, attempting to recover connection');
        attemptReconnect();
      }
    };
    
    // Register activity event listeners
    window.addEventListener('mousemove', updateLastActivity);
    window.addEventListener('keydown', updateLastActivity);
    window.addEventListener('touchstart', updateLastActivity);
    window.addEventListener('click', updateLastActivity);
    
    // Periodic inactivity check
    inactivityTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;
      
      // If inactive for 3 minutes, ping the server to keep connection alive
      if (inactiveTime > 3 * 60 * 1000) {
        console.log('Inactivity detected, sending ping');
        pingServer();
      }
    }, 60000) as unknown as number; // Check every minute
    
    // Listen for Supabase events
    const handleConnectionError = () => {
      console.log('Connection error event received');
      setConnectionError(true);
      reconnectAttemptsRef.current = 0;
      
      // Only show recovery UI if reconnection fails multiple times
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setShowRecoveryUI(true);
      } else {
        attemptReconnect();
      }
    };
    
    const handleReconnect = () => {
      console.log('Connection restored event received');
      setConnectionError(false);
      setReconnecting(false);
      setShowRecoveryUI(false);
      reconnectAttemptsRef.current = 0;
      toast.success('Connection restored', { duration: 3000 });
    };
    
    // Register connection event listeners
    window.addEventListener('supabase:connection-error', handleConnectionError);
    window.addEventListener('supabase:reconnected', handleReconnect);
    window.addEventListener('supabase:timeout', handleConnectionError);
    
    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
      
      window.removeEventListener('mousemove', updateLastActivity);
      window.removeEventListener('keydown', updateLastActivity);
      window.removeEventListener('touchstart', updateLastActivity);
      window.removeEventListener('click', updateLastActivity);
      window.removeEventListener('supabase:connection-error', handleConnectionError);
      window.removeEventListener('supabase:reconnected', handleReconnect);
      window.removeEventListener('supabase:timeout', handleConnectionError);
    };
  }, [connectionError, reconnecting]);

  // Check server connection
  const pingServer = async () => {
    try {
      // Simple lightweight query to check connection
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      console.log('Connection check successful', { count });
      return true;
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionError(true);
      return false;
    }
  };

  // Attempt to reconnect
  const attemptReconnect = () => {
    reconnectAttemptsRef.current += 1;
    setReconnecting(true);
    
    console.log(`Attempting reconnection (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // Timeout after 3 seconds if reconnection doesn't complete
    const timeoutId = setTimeout(() => {
      if (reconnecting) {
        console.log('Reconnection attempt timed out');
        setReconnecting(false);
        
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setShowRecoveryUI(true);
        } else {
          attemptReconnect();
        }
      }
    }, 3000);
    
    // Try to fetch a minimal amount of data to verify connection
    pingServer().then(success => {
      clearTimeout(timeoutId);
      
      if (success) {
        setConnectionError(false);
        setReconnecting(false);
        toast.success('Connection restored', { duration: 3000 });
        
        // Dispatch reconnection event to refresh data
        window.dispatchEvent(new CustomEvent('supabase:reconnected'));
      } else {
        setReconnecting(false);
        
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setShowRecoveryUI(true);
        } else {
          // Try again after a delay
          setTimeout(attemptReconnect, 2000);
        }
      }
    });
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    reconnectAttemptsRef.current = 0;
    setShowRecoveryUI(false);
    attemptReconnect();
  };

  // Render recovery UI when needed
  if (showRecoveryUI) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">接続エラー</h2>
            <p className="text-gray-600 mb-6">サーバーとの通信に問題が発生しました。インターネット接続を確認してください。</p>
            
            <button 
              onClick={handleManualRefresh}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-full transition-colors w-full"
              style={{borderRadius: "300px", padding: "16px 0"}}
            >
              再読み込みする
            </button>
            
            <p className="text-sm text-gray-500 mt-4">問題が解決しない場合は、アプリを再起動してください。</p>
          </div>
        </div>
      </div>
    );
  }

  // Show a reconnecting spinner
  if (reconnecting) {
    return (
      <>
        {children}
        <div className="fixed bottom-28 right-4 bg-white shadow-lg rounded-full p-4 flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
          <span className="text-sm font-medium">再接続中...</span>
        </div>
      </>
    );
  }

  // Normal rendering
  return <>{children}</>;
};

export default ConnectionMonitor;