import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import ResponseModal from '../components/ResponseModal';
import { useMessages } from '../hooks/useMessages';
import { ExtendedMessageType } from '../types';
import { getIconColor, getMessageIcon, getStatusText, formatDateWithDay } from '../utils/messageUtils';

/**
 * メッセージページコンポーネント
 * 受信箱と送信箱の切り替え、メッセージの表示、招待への応答を管理
 */

// MessagesPageコンポーネント
const MessagesPage = () => {
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    [key: string]: any;
  } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ExtendedMessageType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  
  // メッセージ操作用カスタムフックを使用
  const {
    messages,
    loading,
    activeTab,
    setActiveTab,
    fetchMessages,
    handleResponseToInvitation
  } = useMessages();


  // ユーザーの認証状態を確認
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
      } else {
        navigate('/login');
      }
      // カスタムフックのloadingステートを使用するため、ここでのsetLoadingは不要
    };
    
    checkUser();
  }, [navigate]);

  // ユーザーデータが取得できたらメッセージを取得
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, fetchMessages]);





  // 不要な関数を削除



  // メッセージをクリックしたときの処理
  const handleMessageClick = (message: ExtendedMessageType) => {
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
      
      // メッセージをそのまま使用し、必要な情報を追加
      const enhancedMessage: ExtendedMessageType = {
        ...message,
        time: timeInfo || '時間情報なし',
        comment: message.content.includes('「') 
          ? message.content.split('「')[1]?.split('」')[0] 
          : message.content
      };
      
      setSelectedMessage(enhancedMessage);
      setModalOpen(true);
    }
  };

  // タブ切り替え
  const handleTabChange = (tab: 'inbox' | 'sent') => {
    setActiveTab(tab);
    // タブを切り替えた時点でモーダルを閉じる
    setModalOpen(false);
  };



  if (loading && !user) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      {/* タブ */}
      <div className="flex mb-4 overflow-hidden border-2 border-gray-100 rounded-lg bg-gray-100">
        <button
          className={`flex-1 py-3 text-center focus:outline-none ${activeTab === 'inbox' 
            ? 'bg-white text-black font-medium'
            : 'bg-gray-100 text-gray-500'}`}
          onClick={() => handleTabChange('inbox')}
        >
          受信箱
        </button>
        <button
          className={`flex-1 py-3 text-center focus:outline-none ${activeTab === 'sent' 
            ? 'bg-white text-black font-medium'
            : 'bg-gray-100 text-gray-500'}`}
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
        <div className="mb-20">
          {messages.map(message => (
            <div
                key={message.id}
                className="relative bg-white cursor-pointer px-4 py-6 border-b border-gray-100"
                onClick={() => handleMessageClick(message)}
            >
                <div className="flex items-center">
                  {/* 左側：アバター画像 */}
                  <div className="w-[64px] h-[64px] rounded-full overflow-hidden mr-3 bg-gray-100 flex items-center justify-center">
                    {activeTab === 'inbox' && message.sender?.avatar_url ? (
                      <img 
                        src={message.sender.avatar_url} 
                        alt={message.sender?.name || '送信者'} 
                        className="w-full h-full object-cover"
                      />
                    ) : activeTab === 'sent' && message.recipient?.avatar_url ? (
                      <img 
                        src={message.recipient.avatar_url} 
                        alt={message.recipient?.name || '受信者'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-xl text-yellow-500">
                        {getMessageIcon(message.type, activeTab === 'inbox')}
                      </div>
                    )}
                  </div>

                  <div  className="flex-1">
                    <div className="flex justify-between">
                    {/* 中央：ユーザー情報とメッセージ */}
                    <div>
                        {/* ユーザー名 */}
                        <div className="text-lg font-bold">
                        {activeTab === 'inbox' 
                            ? message.sender?.name || '送信者' 
                            : message.recipient?.name || '受信者'}
                        </div>
                    </div>                 
                    
                    {/* 右側：時間情報 */}
                    <div className="flex flex-col items-end">
                        <div className="text-gray-500 text-base">
                            {message.invitation?.availability && (
                            <div className="text-gray-500 mt-1 text-sm relative">
                            {message.invitation.availability.date && (
                            <div className="text-gray-500 mt-1 text-sm">
                                {`${formatDateWithDay(message.invitation.availability.date)} ${message.invitation.availability.start_time?.slice(0, 5) || ''}～${message.invitation.availability.end_time?.slice(0, 5) || ''}`}
                            </div>
                            )}
                                <div className="absolute right-[6px] top-[8px] w-3 h-3 bg-orange-500 rounded-full mt-4"></div>
                            </div>
                            )}
                        </div>
                    </div>
                    </div>

                     {/* メッセージステータス - アイコンとテキスト */}
                     <div className="flex items-center mt-2">
                      <div className={`w-[16px] h-[16px] rounded-full flex items-center justify-center mr-1 ${getIconColor(message.type, activeTab === 'inbox', message)}`}>
                        <span className="text-white text-xs ">{getMessageIcon(message.type, activeTab === 'inbox')}</span>
                      </div>
                      <div className="text-[#61717D] text-xs font-bold">
                        {getStatusText(message, activeTab === 'inbox')}
                      </div>
                    </div>
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
        onAccept={async (messageId, invitationId) => {
          const result = await handleResponseToInvitation(messageId, invitationId, 'accepted');
          if (result) {
            // 承諾画面に遷移
            navigate(`/appointment-completed/${invitationId}`);
          }
        }}
        onReject={async (messageId, invitationId) => {
          const result = await handleResponseToInvitation(messageId, invitationId, 'rejected');
          if (result) {
            alert('誘いを拒否しました');
          }
        }}
      />
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  );
};

export default MessagesPage;