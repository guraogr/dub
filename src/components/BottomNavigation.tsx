import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

// ナビゲーションアイテムの型定義
interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  // ユーザー情報の取得
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
      }
    };
    
    getUser();
  }, []);

  // 未応答スカウト数を取得
  useEffect(() => {
    if (!user) return;
    
    const fetchUnreadCount = async () => {
      try {
        // 未読メッセージの数を数える
        // 1. 相手から遊びの誘いが届いた時（type=invitation）
        // 2. 相手から遊びの誘いが承諾された時（type=acceptance）
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('recipient_id', user.id)
          .eq('is_read', false)
          .or('type.eq.invitation,type.eq.acceptance');
          
        if (error) throw error;
        
        setUnreadCount(count || 0);
        
      } catch (error) {
        console.error('未読数の取得に失敗しました', error);
      }
    };
    
    fetchUnreadCount();
    
    // リアルタイムサブスクリプションを設定
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${user.id}`,
      }, () => {
        // メッセージに変更があったら再取得
        fetchUnreadCount();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ナビゲーションアイテムの定義
  const navItems: NavItem[] = [
    {
      path: '/',
      label: '遊びを探す',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      )
    },
    {
      path: '/myavailabilities',
      label: '募集中の予定',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      path: '/messages',
      label: 'スカウト',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      )
    },
    {
      path: '/profile',
      label: 'プロフィール',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center">
      <div className="w-full max-w-md bg-white border-t border-gray-300 flex justify-between p-4">
        {navItems.map((item, index) => (
          <div key={index} className="text-center w-1/4">
            <button 
              className={`flex flex-col items-center w-full ${location.pathname === item.path ? 'text-black' : 'text-gray-500'}`}
              style={{
                padding: 0
              }}
              onClick={() => navigate(item.path)}
            >
              {item.path === '/messages' ? (
                <div className="relative flex justify-center">
                  {item.icon}
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex justify-center">
                  {item.icon}
                </div>
              )}
              <div className="text-xs mt-1">{item.label}</div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;