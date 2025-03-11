import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// 型定義
interface Invitation {
  id: string;
  status: string;
}

interface Message {
  id: string;
  invitation_id: string;
  is_read: boolean;
}

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  // ユーザー情報を取得
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
        // 未読メッセージを取得
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            is_read,
            invitation_id
          `)
          .eq('recipient_id', user.id)
          .eq('type', 'invitation')
          .eq('is_read', false);
          
        if (error) throw error;
        
        console.log('未読メッセージデータ:', data);
        
        // 別のクエリで招待の状態を取得
        if (data && data.length > 0) {
          const invitationIds = data
            .map(msg => msg.invitation_id)
            .filter(id => id !== null);
          
          if (invitationIds.length > 0) {
            const { data: invitationsData, error: invitationsError } = await supabase
              .from('invitations')
              .select('id, status')
              .in('id', invitationIds);
              
            if (invitationsError) throw invitationsError;
            
            console.log('招待データ:', invitationsData);
            
            // pendingステータスの招待のみをカウント
            const pendingInvitations = invitationsData.filter(inv => inv.status === 'pending');
            setUnreadCount(pendingInvitations.length);
          } else {
            setUnreadCount(0);
          }
        } else {
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('未読数の取得に失敗しました', error);
      }
    };
    
    fetchUnreadCount();
    
    // リアルタイムサブスクリプションを設定
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', {
        event: '*',
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-4">
      <button 
        className={`text-center ${location.pathname === '/' ? 'text-blue-500' : 'text-gray-600'}`}
        onClick={() => navigate('/')}
      >
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-xs mt-1">遊びに誘う</div>
      </button>
      
      <button 
        className={`text-center relative ${location.pathname === '/messages' ? 'text-blue-500' : 'text-gray-600'}`}
        onClick={() => navigate('/messages')}
      >
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="text-xs mt-1">スカウトを見る</div>
      </button>
    </div>
  );
};

export default BottomNavigation;