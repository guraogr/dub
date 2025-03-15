import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { NotificationType } from '../types';
import { formatDate, formatTime } from '../utils/dateUtils';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';

interface NotificationModalProps {
  notification: NotificationType;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose }) => {
  const navigate = useNavigate();

  
  // 日付フォーマット関数は外部ユーティリティからインポート
  
  /**
   * 招待に対する処理を行う共通関数
   * @param status 更新するステータス ('accepted' または 'rejected')
   */
  const handleInvitationResponse = async (status: 'accepted' | 'rejected') => {
    try {
      // invitationsテーブルのステータスを更新
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({ status })
        .eq('id', notification.invitation_id);
        
      if (invitationError) {
        throw new Error(`招待ステータスの更新に失敗: ${invitationError.message}`);
      }
      
      // メッセージを既読に更新
      const { error: messageError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', notification.id);
        
      if (messageError) {
        throw new Error(`メッセージの既読更新に失敗: ${messageError.message}`);
      }
      
      // 現在のユーザー情報を取得
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error(`ユーザー情報の取得エラー: ${userError.message}`);
      }
      
      if (!userData || !userData.user) {
        throw new Error('ユーザー情報が取得できません');
      }
      
      // 送信者情報を取得
      const { data: senderData, error: senderError } = await supabase
        .from('messages')
        .select('sender_id, recipient_id')
        .eq('id', notification.id)
        .single();
      
      if (senderError) {
        throw new Error(`送信者情報の取得エラー: ${senderError.message}`);
      }
      
      if (!senderData) {
        throw new Error('送信者情報が取得できません');
      }
      
      // ステータスに応じたメッセージタイプと内容を設定
      const messageType = status === 'accepted' ? 'acceptance' : 'rejection';
      
      // 送信者向けメッセージの内容
      const senderContent = status === 'accepted' 
        ? '遊びの誘いを承諾しました' 
        : '遊びの誘いをお断りしました';
      
      // 自分向けメッセージの内容
      const recipientContent = status === 'accepted' 
        ? '遊びの誘いが承諾されました' 
        : '相手の予定が埋まってしまいました';
      
      // 送信者向けメッセージを作成
      const { error: sendError } = await supabase
        .from('messages')
        .insert({
          sender_id: userData.user.id,
          recipient_id: senderData.sender_id,
          invitation_id: notification.invitation_id,
          type: messageType,
          content: senderContent,
          is_read: false
        });
      
      if (sendError) {
        throw new Error(`送信者向けメッセージの作成エラー: ${sendError.message}`);
      }
        
      // 自分宛のメッセージも作成
      const { error: selfError } = await supabase
        .from('messages')
        .insert({
          sender_id: senderData.sender_id,
          recipient_id: userData.user.id,
          invitation_id: notification.invitation_id,
          type: messageType,
          content: recipientContent,
          is_read: true
        });
      
      if (selfError) {
        throw new Error(`自分宛メッセージの作成エラー: ${selfError.message}`);
      }
      
      // モーダルを閉じる
      onClose();
      
      // ステータスに応じた追加処理
      if (status === 'accepted') {
        navigate(`/appointment-completed/${notification.invitation_id}`);
      } else {
        alert('誘いを拒否しました');
      }
      
    } catch (error: any) {
      const actionType = status === 'accepted' ? '承諾' : '拒否';
      console.error(`${actionType}処理に失敗しました`, error);
      alert(`${actionType}処理に失敗しました: ${error.message}`);
      onClose();
    }
  };
  
  // 承諾処理
  const handleAccept = () => {
    handleInvitationResponse('accepted')
    navigate(`/appointment-completed/${notification.invitation_id}`);
  };
  
  // 拒否処理
  const handleReject = () => handleInvitationResponse('rejected');

  // 時間情報を整形
  const timeInfo = notification.availability ? (
    `${notification.availability.date ? formatDate(notification.availability.date) : '日付不明'} ${formatTime(notification.availability.start_time)}～${formatTime(notification.availability.end_time)}`
  ) : '詳細不明';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="遊びの誘いが届きました"
    >
      {/* ユーザー情報 */}
      <div className="flex flex-col mb-4">
        <div className="flex items-center mb-3">
          <Avatar 
            src={notification.sender?.avatar_url} 
            alt={notification.sender?.name || '送信者'} 
            size="lg" 
            fallback={(notification.sender?.name || '送信者').charAt(0)}
          />
          <div className="ml-4">
            <div className="font-medium">{notification.sender?.name || '送信者'}</div>
          </div>
        </div>
        
        {/* 遊びの詳細情報 */}
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm font-medium mb-1">募集詳細</div>
          <div className="text-sm text-gray-700">時間：{timeInfo}</div>
          {notification.availability?.comment && (
            <div className="text-sm text-gray-700 mt-1">コメント: {notification.availability.comment}</div>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        誘いを承諾すると、一緒に遊ぶための連絡を取り合います。拒否した場合、相手には予定が埋まった通知が送られます。
      </p>
      
      <div className="flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={handleReject}
        >
          拒否する
        </Button>
        <Button
          variant="primary"
          onClick={handleAccept}
        >
          承諾する
        </Button>
      </div>
    </Modal>
  );
};

export default NotificationModal;