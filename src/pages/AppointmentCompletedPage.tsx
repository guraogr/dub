import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AppointmentCompletedPage = () => {
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams(); // URLからinvitation_idを取得
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      try {
        if (!id) return;
        
        // ステータスに関係なく招待情報を取得
        const { data, error } = await supabase
          .from('invitations')
          .select(`
            *,
            sender:sender_id(*),
            recipient:recipient_id(*),
            availability:availability_id(*)
          `)
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        setAppointment(data);
      } catch (error) {
        console.error('約束の詳細取得に失敗しました', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAppointmentDetails();
  }, [id]);

  const openLine = () => {
    window.open('https://line.me/');
  };

  const openInstagram = () => {
    window.open('https://www.instagram.com/');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  if (!appointment) {
    return <div className="p-4">約束の情報が見つかりません</div>;
  }

  // ステータスに応じた表示内容を変更
  const isPending = appointment.status === 'pending';
  const isAccepted = appointment.status === 'accepted';

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6 text-center">
        {isPending ? '遊びの誘いを送りました' : '遊びの約束が決まりました'}
      </h1>
      
      <div className="bg-white rounded-lg p-6 shadow-md mb-6">
        {isPending ? (
          <div className="mb-4">
            <div className="text-sm text-gray-500">誘いを送った相手</div>
            <div className="font-medium">{appointment.recipient.name}</div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="text-sm text-gray-500">遊ぶ人</div>
            <div className="font-medium">{appointment.sender.name}</div>
          </div>
        )}
        
        <div className="mb-4">
          <div className="text-sm text-gray-500">日時</div>
          <div className="font-medium">
            {new Date(appointment.availability.date).toLocaleDateString('ja-JP')}
            {' '}
            {appointment.availability.start_time.slice(0, 5)} ~ {appointment.availability.end_time.slice(0, 5)}
          </div>
        </div>
        
        {isPending ? (
          <div className="bg-yellow-50 p-4 rounded-md mb-6">
            <p className="text-sm text-yellow-700">
              相手が誘いを承諾するまでお待ちください。承諾されると通知が届きます。
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mb-6">
            LINE や Instagram 等の SNS を通じて、友達と遊びに出かけよう！
          </p>
        )}
      </div>
      
      {isAccepted && (
        <>
          <button
            onClick={openLine}
            className="w-full py-3 bg-green-500 text-white rounded-md mb-3 flex items-center justify-center"
          >
            LINE アプリを開く
          </button>
          
          <button
            onClick={openInstagram}
            className="w-full py-3 border border-blue-500 text-blue-500 rounded-md mb-6 flex items-center justify-center"
          >
            Instagram を開く
          </button>
        </>
      )}
      
      <button
        onClick={() => navigate('/')}
        className="w-full py-3 text-gray-600 rounded-md"
      >
        ホームに戻る
      </button>
    </div>
  );
};

export default AppointmentCompletedPage;