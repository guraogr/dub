import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface NotificationModalProps {
  notification: {
    id: string;
    invitation_id: string;
    sender: {
      name: string;
      avatar_url?: string;
    };
    availability: {
      date: string;
      start_time: string;
      end_time: string;
      comment?: string;
    };
    created_at: string;
  };
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose }) => {
  const navigate = useNavigate();
  
  // 日付のフォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
  };
  
  // 承諾処理
  const handleAccept = async () => {
    try {
      // invitationsテーブルのステータスを更新
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', notification.invitation_id);
        
      if (invitationError) throw invitationError;
      
      // メッセージを既読に更新
      const { error: messageError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', notification.id);
        
      if (messageError) throw messageError;
      
      // 現在のユーザー情報を取得
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) throw new Error('ユーザー情報が取得できません');
      
      // 送信者に承諾メッセージを送信
      const { data: senderData } = await supabase
        .from('messages')
        .select('sender_id, recipient_id')
        .eq('id', notification.id)
        .single();
        
      if (senderData) {
        // 承諾メッセージを作成
        await supabase
          .from('messages')
          .insert({
            sender_id: userData.user.id,
            recipient_id: senderData.sender_id,
            invitation_id: notification.invitation_id,
            type: 'acceptance',
            content: '遊びの誘いを承諾しました',
            is_read: false
          });
          
        // 自分宛のメッセージも作成
        await supabase
          .from('messages')
          .insert({
            sender_id: senderData.sender_id,
            recipient_id: userData.user.id,
            invitation_id: notification.invitation_id,
            type: 'acceptance',
            content: '遊びの誘いが承諾されました',
            is_read: true
          });
      }
      
      onClose();
      navigate(`/appointment-completed/${notification.invitation_id}`);
      
    } catch (error: any) {
      console.error('承諾処理に失敗しました', error);
      alert(`承諾処理に失敗しました: ${error.message}`);
      onClose();
    }
  };
  
  // 拒否処理
  const handleReject = async () => {
    try {
      // invitationsテーブルのステータスを更新
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({ status: 'rejected' })
        .eq('id', notification.invitation_id);
        
      if (invitationError) throw invitationError;
      
      // メッセージを既読に更新
      const { error: messageError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', notification.id);
        
      if (messageError) throw messageError;
      
      // 現在のユーザー情報を取得
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) throw new Error('ユーザー情報が取得できません');
      
      // 送信者に拒否メッセージを送信
      const { data: senderData } = await supabase
        .from('messages')
        .select('sender_id, recipient_id')
        .eq('id', notification.id)
        .single();
        
      if (senderData) {
        // 拒否メッセージを作成
        await supabase
          .from('messages')
          .insert({
            sender_id: userData.user.id,
            recipient_id: senderData.sender_id,
            invitation_id: notification.invitation_id,
            type: 'rejection',
            content: '遊びの誘いをお断りしました',
            is_read: false
          });
          
        // 自分宛のメッセージも作成
        await supabase
          .from('messages')
          .insert({
            sender_id: senderData.sender_id,
            recipient_id: userData.user.id,
            invitation_id: notification.invitation_id,
            type: 'rejection',
            content: '相手の予定が埋まってしまいました',
            is_read: true
          });
      }
      
      onClose();
      alert('誘いを拒否しました');
      
    } catch (error: any) {
      console.error('拒否処理に失敗しました', error);
      alert(`拒否処理に失敗しました: ${error.message}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-80 max-w-md">
        <h3 className="text-lg font-medium mb-4">遊びの誘いが届きました</h3>
        
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-300 rounded-full mr-4">
            {notification.sender.avatar_url && (
              <img 
                src={notification.sender.avatar_url} 
                alt={notification.sender.name} 
                className="w-full h-full object-cover rounded-full"
              />
            )}
          </div>
          <div>
            <div className="font-medium">{notification.sender.name}</div>
            <div className="text-sm text-gray-600">{notification.availability?.comment || ''}</div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-sm text-gray-500">遊ぶ予定:</div>
          <div className="font-medium">
            {formatDate(notification.availability.date)} {notification.availability.start_time.slice(0, 5)}～{notification.availability.end_time.slice(0, 5)}
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          誘いを承諾すると、一緒に遊ぶための連絡を取り合います。拒否した場合、相手には予定が埋まった通知が送られます。
        </p>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleReject}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            拒否する
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500"
          >
            承諾する
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;