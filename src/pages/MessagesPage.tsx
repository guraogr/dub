import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

// メッセージの型定義
type InboxMessage = {
  id: string;
  type: string;
  content: string;
  sender: { name: string; avatar_url: string };
  created_at: string;
  is_read: boolean;
};

type SentMessage = {
  id: string;
  type: string;
  content: string;
  recipient: { name: string; avatar_url: string };
  created_at: string;
};

type Message = InboxMessage | SentMessage;

// 受信メッセージかどうかを判別するタイプガード
const isInboxMessage = (message: Message): message is InboxMessage => {
  return 'sender' in message && 'is_read' in message;
};

const MessagesPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' または 'sent'
  const navigate = useNavigate();

  // ユーザーの認証状態を確認
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
        fetchMessages(data.user.id);
      } else {
        navigate('/login');
      }
      setLoading(false);
    };
    
    checkUser();
  }, [navigate]);

  // メッセージを取得
  const fetchMessages = async (userId: string) => {
    try {
      setLoading(true);
      
      console.log('Fetching messages for user:', userId, 'tab:', activeTab);
      
      if (activeTab === 'inbox') {
        // すべてのカラムを確認できるようにクエリを単純化
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('recipient_id', userId);
          
        if (error) throw error;
        console.log('Inbox messages raw data:', data);
        setMessages(data || []);
      } 
      else {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('sender_id', userId);
          
        if (error) throw error;
        console.log('Sent messages raw data:', data);
        setMessages(data || []);
      }
    } catch (error) {
      console.error('メッセージの取得に失敗しました', error);
    } finally {
      setLoading(false);
    }
  };

  // タブ切り替え
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (user) {
      fetchMessages(user.id);
    }
  };

  // 仮のメッセージデータ
  const dummyInboxMessages: InboxMessage[] = [
    {
      id: '1',
      type: 'invitation',
      content: '誘いが承諾されました',
      sender: { name: '松田友美', avatar_url: '' },
      created_at: '2023-06-01T10:00:00Z',
      is_read: true
    },
    {
      id: '2',
      type: 'message',
      content: '遊びの誘いが届きました',
      sender: { name: '山本雄二', avatar_url: '' },
      created_at: '2023-06-01T09:30:00Z',
      is_read: false
    }
  ];

  const dummySentMessages: SentMessage[] = [
    {
      id: '3',
      type: 'invitation',
      content: 'スカウト送信済み',
      recipient: { name: '松田友美', avatar_url: '' },
      created_at: '2023-06-01T08:00:00Z'
    },
    {
      id: '4',
      type: 'invitation',
      content: 'スカウト送信済み',
      recipient: { name: '小倉真斗', avatar_url: '' },
      created_at: '2023-05-31T15:00:00Z'
    }
  ];

  // メッセージの表示用データ
  const displayMessages = messages.length > 0 ? messages : (activeTab === 'inbox' ? dummyInboxMessages : dummySentMessages);
    
  // コンソールログを追加
    console.log('Active tab:', activeTab);
    console.log('Messages from DB:', messages);
    console.log('Display messages:', displayMessages);
    
  // メッセージアイコンの取得
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'invitation':
        return '👋';
      case 'acceptance':
        return '✅';
      case 'rejection':
        return '❌';
      default:
        return '💬';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* MessagesPage.tsxのreturn文の中の適切な場所に追加 */}
        <div className="bg-gray-100 p-2 text-xs mt-4">
        <p>Debug: {activeTab} mode, {messages.length} messages</p>
        <p>User ID: {user?.id}</p>
        </div>
      <h1 className="text-2xl font-bold mb-6">メッセージ</h1>
      
      {/* タブ */}
      <div className="flex border-b mb-4">
        <button
          className={`flex-1 py-2 ${activeTab === 'inbox' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
          onClick={() => handleTabChange('inbox')}
        >
          受信箱
        </button>
        <button
          className={`flex-1 py-2 ${activeTab === 'sent' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
          onClick={() => handleTabChange('sent')}
        >
          送信箱
        </button>
      </div>
      
      {/* メッセージ一覧 */}
      {displayMessages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">メッセージがありません</div>
        ) : (
        <div className="space-y-3">
            {displayMessages.map((message) => (
            <div
                key={message.id}
                className="flex items-center p-4 rounded-lg bg-white shadow"
            >
                <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full mr-3 text-lg">
                {message.type ? getMessageIcon(message.type) : '💬'}
                </div>
                <div className="flex-1">
                <div className="font-medium">
                    {/* シンプルな表示に修正 */}
                    {activeTab === 'inbox' ? '送信者' : '受信者'}
                </div>
                <div className="text-sm text-gray-600">{message.content || 'メッセージ内容'}</div>
                </div>
                <div className="text-xs text-gray-500">
                {message.created_at ? new Date(message.created_at).toLocaleString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '日時不明'}
                </div>
            </div>
            ))}
        </div>
        )}
      
      {/* 下部ナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-4">
        <button 
          className="text-center"
          onClick={() => navigate('/')}
        >
          <div className="text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-xs mt-1">遊びに誘う</div>
        </button>
        
        <button 
          className="text-center"
        >
          <div className="text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-xs mt-1 font-medium text-blue-500">スカウトを見る</div>
        </button>
      </div>
    </div>
  );
};

export default MessagesPage;