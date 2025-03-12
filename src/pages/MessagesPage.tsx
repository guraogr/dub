import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';

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
      <div className="bg-white rounded-lg p-6 w-80 max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
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
  
      // まず、このユーザーが関わる全ての招待状態を取得
      console.log('関連する招待の状態を確認中...');
      const { data: allInvitations, error: invitationsError } = await supabase
        .from('invitations')
        .select('id, status, availability_id')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
        
      if (invitationsError) {
        console.error('招待状態の取得エラー:', invitationsError);
      } else {
        console.log('取得した招待状態:', allInvitations);
      }
      
      // 承認または拒否された招待IDのリストを作成
      const respondedInvitationIds = allInvitations
        ?.filter(inv => inv.status === 'accepted' || inv.status === 'rejected')
        .map(inv => inv.id) || [];
        
      console.log('承認・拒否済みの招待ID:', respondedInvitationIds);
  
      if (activeTab === 'inbox') {
        // 受信メッセージの処理
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(*),
            invitation:invitation_id(*,
              availability:availability_id(*)
            )
          `)
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        console.log('受信メッセージ (全て):', data);
        
        if (data) {
          const filteredData = data.filter(message => {
            // 誘いタイプで、対応する招待IDが応答済みリストにある場合は非表示
            if (message.type === 'invitation' && 
                message.invitation_id && 
                respondedInvitationIds.includes(message.invitation_id)) {
              console.log('応答済みのため非表示:', message);
              return false;
            }
            
            // 日時によるフィルタリング
            const availability = message.invitation?.availability;
            if (availability) {
              const availDate = new Date(availability.date);
              availDate.setHours(0, 0, 0, 0);
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              if (availDate < today) {
                console.log('過去の日付のため非表示:', availability.date);
                return false;
              }
              
              if (availDate.getTime() === today.getTime()) {
                const now = new Date();
                const [startHour, startMinute] = availability.start_time.split(':').map(Number);
                
                if (now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() > startMinute)) {
                  console.log('過去の時間のため非表示:', availability.start_time);
                  return false;
                }
              }
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
        // 送信メッセージの処理（同様の修正）
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            recipient:recipient_id(*),
            invitation:invitation_id(*,
              availability:availability_id(*)
            )
          `)
          .eq('sender_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        console.log('送信メッセージ (全て):', data);
        
        if (data) {
          const filteredData = data.filter(message => {
            // 誘いタイプで、対応する招待IDが応答済みリストにある場合は非表示
            if (message.type === 'invitation' && 
                message.invitation_id && 
                respondedInvitationIds.includes(message.invitation_id)) {
              console.log('応答済みのため非表示:', message);
              return false;
            }
            
            // 日時によるフィルタリング（同上）
            const availability = message.invitation?.availability;
            if (availability) {
              const availDate = new Date(availability.date);
              availDate.setHours(0, 0, 0, 0);
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              if (availDate < today) return false;
              
              if (availDate.getTime() === today.getTime()) {
                const now = new Date();
                const [startHour, startMinute] = availability.start_time.split(':').map(Number);
                
                if (now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() > startMinute)) {
                  return false;
                }
              }
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

  // 日付と時間のフォーマット関数を追加
const formatAvailabilityDate = (availability: any) => {
    if (!availability) return '';
    
    const date = new Date(availability.date);
    const formattedDate = date.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
    });
    
    const startTime = availability.start_time?.slice(0, 5) || '';
    const endTime = availability.end_time?.slice(0, 5) || '';
    
    return `${formattedDate} ${startTime}～${endTime}`;
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
      
      // 誘いを承諾した場合、完了画面に遷移
      if (status === 'accepted') {
        // 承諾画面に遷移
        navigate(`/appointment-completed/${invitationId}`);
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
    <div className="max-w-md mx-auto p-4 pb-20">
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
                    {/* 相手の名前と既読マーク */}
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
                    
                    {/* メッセージ内容 */}
                    <div className="text-sm text-gray-600">
                    {getStatusText(message)}
                    </div>
                    
                    {/* 遊ぶ予定の時間があれば表示 */}
                    {message.invitation?.availability && (
                    <div className="text-xs text-gray-500 mt-1">
                        遊ぶ予定: {formatAvailabilityDate(message.invitation.availability)}
                    </div>
                    )}
                </div>
                
                {/* スカウトが届いた時間 */}
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
      <BottomNavigation />
    </div>
  );
};

export default MessagesPage;