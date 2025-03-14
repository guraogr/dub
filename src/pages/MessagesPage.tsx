import React from 'react';
import BottomNavigation from '../components/BottomNavigation';
import ResponseModal from '../components/ResponseModal';
import MessageList from '../components/MessageList';
import Tabs from '../components/ui/Tabs';
import { useMessagesPage } from '../hooks/useMessagesPage';

/**
 * メッセージページコンポーネント
 * リファクタリングポイント:
 * 1. UIとロジックを分離（カスタムフックを使用）
 * 2. 小さなコンポーネントに分割
 * 3. 再利用可能なUIコンポーネントを使用
 */
const MessagesPage: React.FC = () => {
  // ロジックをカスタムフックに分離
  const {
    messages,
    loading,
    activeTab,
    selectedMessage,
    modalOpen,
    handleMessageClick,
    handleTabChange,
    closeModal,
    acceptInvitation,
    rejectInvitation,
    userId // 現在のユーザーIDを取得
  } = useMessagesPage();

  console.log(messages)
  // タブオプションの定義
  const tabOptions = [
    { id: 'inbox', label: '受信箱' },
    { id: 'sent', label: '送信箱' }
  ];

  // ローディング中の表示
  if (loading && messages.length === 0) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      {/* タブコンポーネント */}
      <Tabs 
        options={tabOptions} 
        activeTab={activeTab} 
        onChange={(tabId) => handleTabChange(tabId as 'inbox' | 'sent')} 
      />

      {/* メッセージリストコンポーネント */}
      <MessageList 
        messages={messages}
        activeTab={activeTab}
        loading={loading}
        onMessageClick={handleMessageClick}
        userId={userId || undefined} // 現在のユーザーIDを渡す、nullの場合はundefinedに変換
      />
      
      {/* 応答モーダルコンポーネント */}
      <ResponseModal
        message={selectedMessage}
        isOpen={modalOpen}
        activeTab={activeTab}
        onClose={closeModal}
        onAccept={acceptInvitation}
        onReject={rejectInvitation}
      />
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  );
};

export default MessagesPage;