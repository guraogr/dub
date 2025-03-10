import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

// ResponseModalコンポーネント
interface ResponseModalProps {
  message: any;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (messageId: string, invitationId: string) => void;
  onReject: (messageId: string, invitationId: string) => void;
}

const ResponseModal: React.FC<ResponseModalProps> = ({ 
  message, 
  isOpen, 
  onClose, 
  onAccept, 
  onReject 
}) => {
  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-80 max-w-md">
        <h3 className="text-lg font-medium mb-4">
          遊びの誘いを承諾しますか？
        </h3>
        
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-300 rounded-full mr-4">
            {message.sender?.avatarurl && (
              <img 
                src={message.sender.avatarurl} 
                alt={message.sender.name} 
                className="w-full h-full object-cover rounded-full"
              />
            )}
          </div>
          <div>
            <div className="font-medium">{message.sender?.name}</div>
            <div className="text-sm text-gray-600">{message.comment || 'コメントなし'}</div>
            <div className="text-sm">
              {message.time && message.time !== 'undefined ~ undefined' 
                ? message.time 
                : '時間情報なし'}
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          誘いを承諾すると、一緒に遊ぶための連絡を取り合います。拒否した場合、相手には予定が埋まった通知が送られます。
        </p>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => onReject(message.id, message.invitation?.id)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            拒否する
          </button>
          <button
            onClick={() => onAccept(message.id, message.invitation?.id)}
            className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500"
          >
            承諾する
          </button>
        </div>
      </div>
    </div>
  );
};

// MessagesPageコンポーネント
const MessagesPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' または 'sent'
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  // ユーザーの認証状態を確認
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
      } else {
        navigate('/login');
      }
      setLoading(false);
    };
    
    checkUser();
  }, [navigate]);

  // ユーザーデータが取得できたらメッセージを取得
  useEffect(() => {
    if (user) {
      fetchMessages(user.id);
    }
  }, [user, activeTab]);

  // メッセージを取得
  const fetchMessages = async (userId: string) => {
    try {
      setLoading(true);
      console.log('Fetching messages for user:', userId, 'tab:', activeTab);
      
      if (activeTab === 'inbox') {
        // 受信メッセージを取得（自分宛のみ）
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(*),
            invitation:invitation_id(*)
          `)
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        console.log('受信メッセージ (全て):', data);
        
        if (data) {
          // 応答済みの誘いメッセージは除外（「スカウト送信済み」の受信箱での表示を削除）
          const filteredData = data.filter(message => {
            // 誘いタイプのメッセージで、招待状態が pending 以外（承諾・拒否済み）のものを除外
            if (message.type === 'invitation' && message.invitation?.status !== 'pending') {
              return false;
            }
            return true;
          });
          
          console.log('受信メッセージ (フィルター後):', filteredData);
          setMessages(filteredData || []);
        } else {
          setMessages([]);
        }
      } 
      else {
        // 送信メッセージを取得（自分が送信したもののみ）
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            recipient:recipient_id(*),
            invitation:invitation_id(*)
          `)
          .eq('sender_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        console.log('送信メッセージ (全て):', data);
        
        if (data) {
          // 応答済みの「遊びの誘いが届きました」は送信箱から削除
          const filteredData = data.filter(message => {
            // 誘いタイプのメッセージで、招待状態が pending 以外（承諾・拒否済み）のものを除外
            if (message.type === 'invitation' && message.invitation?.status !== 'pending') {
              return false;
            }
            return true;
          });
          
          console.log('送信メッセージ (フィルター後):', filteredData);
          setMessages(filteredData || []);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('メッセージの取得に失敗しました', error);
    } finally {
      setLoading(false);
    }
  };

  // 誘いへの応答処理
  const handleResponseToInvitation = async (messageId: string, invitationId: string, status: 'accepted' | 'rejected') => {
    try {
      setLoading(true);
      
      // 現在のユーザー情報を再取得
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      
      if (!currentUserId) {
        throw new Error('ユーザー情報が取得できません');
      }
      
      console.log('Current user ID:', currentUserId);
      console.log('Handling response for invitation:', invitationId, 'with status:', status);
      
      // invitationsテーブルのステータスを更新
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({ status })
        .eq('id', invitationId);
        
      if (invitationError) {
        console.error('Invitation update error:', invitationError);
        throw invitationError;
      }
      
      // 元のメッセージを既読に更新
      const { error: messageError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
        
      if (messageError) {
        console.error('Message update error:', messageError);
        throw messageError;
      }
      
      // 元のメッセージ情報を取得
      const { data: originalMessage } = await supabase
        .from('messages')
        .select(`
          sender_id,
          recipient_id,
          content,
          invitation_id
        `)
        .eq('id', messageId)
        .single();
      
      console.log('Original message:', originalMessage);
      
      if (originalMessage) {
        // 自分から相手へのメッセージ作成（自分が送信者）
        const senderMessage = status === 'accepted' 
          ? '遊びの誘いを承諾しました' 
          : '遊びの誘いをお断りしました';
          
        const { error: senderMsgError } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUserId, // 必ず自分のIDを送信者に
            recipient_id: originalMessage.sender_id,
            invitation_id: invitationId,
            type: status === 'accepted' ? 'acceptance' : 'rejection',
            content: senderMessage,
            is_read: false
          });
          
        if (senderMsgError) {
          console.error('Sender message error:', senderMsgError);
          throw senderMsgError;
        }
        
        // 相手から自分へのメッセージ作成（相手のメッセージとして扱う）
        const recipientMessage = status === 'accepted' 
          ? '遊びの誘いが承諾されました' 
          : '相手の予定が埋まってしまいました';
          
        const { error: recipientMsgError } = await supabase
          .from('messages')
          .insert({
            sender_id: originalMessage.sender_id, // 相手のID
            recipient_id: currentUserId, // 自分のID
            invitation_id: invitationId,
            type: status === 'accepted' ? 'acceptance' : 'rejection',
            content: recipientMessage,
            is_read: true // 自分宛のメッセージは既読に
          });
          
        if (recipientMsgError) {
          console.error('Recipient message error:', recipientMsgError);
          // 続行（メッセージの挿入に失敗してもinvitationステータスは変更されているため）
        }
      }
      
      // モーダルを閉じる
      setModalOpen(false);
      
      // 誘いを承諾/拒否した場合のメッセージ
      if (status === 'accepted') {
        alert('誘いを承諾しました！');
      } else {
        alert('誘いを拒否しました');
      }
      
      // メッセージを再取得
      if (user) {
        fetchMessages(user.id);
      }
      
    } catch (error: any) {
      console.error('応答の送信に失敗しました', error);
      alert(`応答の送信に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // メッセージをクリックしたときの処理
  const handleMessageClick = (message: any) => {
    console.log('Clicked message:', message);
    // 未読の誘いメッセージの場合、モーダルを表示
    if (activeTab === 'inbox' && 
        message.type === 'invitation' && 
        message.invitation?.status === 'pending') {
      
      // availability情報から時間を取得
      let timeInfo = '';
      if (message.invitation?.availability) {
        const startTime = message.invitation.availability.start_time?.slice(0, 5);
        const endTime = message.invitation.availability.end_time?.slice(0, 5);
        if (startTime && endTime) {
          timeInfo = `${startTime} ~ ${endTime}`;
        }
      }
      
      // メッセージから必要な情報を抽出してセット
      const messageInfo = {
        id: message.id,
        invitation: { id: message.invitation.id },
        sender: message.sender,
        time: timeInfo || '時間情報なし',
        comment: message.content.includes('「') 
          ? message.content.split('「')[1]?.split('」')[0] 
          : message.content
      };
      
      setSelectedMessage(messageInfo);
      setModalOpen(true);
    }
  };

  // タブ切り替え
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // タブを切り替えた時点でモーダルを閉じる
    setModalOpen(false);
  };

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

  // ステータス文言を取得
  const getStatusText = (message: any) => {
    if (activeTab === 'inbox') {
      // 受信箱のステータス文言
      switch (message.type) {
        case 'invitation':
          return '遊びの誘いが届きました';
        case 'acceptance':
          return '遊びの誘いが承諾されました';
        case 'rejection':
          return '相手の予定が埋まってしまいました';
        default:
          return message.content;
      }
    } else {
      // 送信箱のステータス文言
      switch (message.type) {
        case 'invitation':
          return 'スカウト送信済み';
        case 'acceptance':
          return '遊びの誘いを承諾しました';
        case 'rejection':
          return '遊びの誘いをお断りしました';
        default:
          return message.content;
      }
    }
  };

  if (loading && !user) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
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
      {loading ? (
        <div className="text-center py-8">データを読み込み中...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">メッセージがありません</div>
      ) : (
        <div className="space-y-4 mb-20">
          {messages.map(message => (
            <div
              key={message.id}
              className={`p-4 rounded-lg shadow cursor-pointer ${
                activeTab === 'inbox' && !message.is_read 
                  ? 'bg-blue-50 border-l-4 border-blue-500' 
                  : 'bg-white'
              }`}
              onClick={() => handleMessageClick(message)}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full mr-3 text-lg">
                  {getMessageIcon(message.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <div className="font-medium">
                      {activeTab === 'inbox' 
                        ? message.sender?.name || '送信者' 
                        : message.recipient?.name || '受信者'}
                    </div>
                    {activeTab === 'inbox' && !message.is_read && (
                      <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getStatusText(message)}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 応答モーダル */}
      <ResponseModal
        message={selectedMessage}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAccept={(messageId, invitationId) => handleResponseToInvitation(messageId, invitationId, 'accepted')}
        onReject={(messageId, invitationId) => handleResponseToInvitation(messageId, invitationId, 'rejected')}
      />
      
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
        
        <button className="text-center">
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