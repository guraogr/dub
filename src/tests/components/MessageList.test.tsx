// Supabaseクライアントのモック
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } }
      })
    }
  }
}));
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import MessageList from '../../components/MessageList';
import { mockExtendedMessages } from '../mocks/messageMocks';
import { ExtendedMessageType } from '../../types';

describe('MessageList コンポーネント', () => {
  const mockOnMessageClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ローディング中の表示が正しく表示される', () => {
    render(
      <MessageList
        messages={[]}
        activeTab="inbox"
        loading={true}
        onMessageClick={mockOnMessageClick}
      />
    );

    // ローディングスピナーが表示されていることを確認
    const loadingElement = screen.getByTestId('loading-spinner');
    expect(loadingElement).toBeInTheDocument();
  });

  test('メッセージがない場合のメッセージが正しく表示される', () => {
    render(
      <MessageList
        messages={[]}
        activeTab="inbox"
        loading={false}
        onMessageClick={mockOnMessageClick}
      />
    );

    // 「受信メッセージはありません」が表示されていることを確認
    const emptyMessage = screen.getByText('受信メッセージはありません');
    expect(emptyMessage).toBeInTheDocument();
  });

  test('メッセージリストが正しく表示される', () => {
    render(
      <MessageList
        messages={mockExtendedMessages}
        activeTab="inbox"
        loading={false}
        onMessageClick={mockOnMessageClick}
      />
    );

    // メッセージが表示されていることを確認
    const message1 = screen.getByText('テストユーザー1');
    expect(message1).toBeInTheDocument();

    const message2 = screen.getByText('テストユーザー2');
    expect(message2).toBeInTheDocument();
  });

  test('メッセージをクリックするとonMessageClickが呼ばれる', async () => {
    const user = userEvent.setup();
    render(
      <MessageList
        messages={mockExtendedMessages}
        activeTab="inbox"
        loading={false}
        onMessageClick={mockOnMessageClick}
      />
    );

    // 未読の招待メッセージをクリック
    const pendingMessage = screen.getByText('テストユーザー1');
    const messageItem = pendingMessage.closest('div[role="button"]');
    if (messageItem) {
      await user.click(messageItem);
    }

    // onMessageClickが呼ばれたことを確認
    expect(mockOnMessageClick).toHaveBeenCalledWith(mockExtendedMessages[0]);
  });

  test('招待ステータスがpendingでないメッセージをクリックしてもonMessageClickは呼ばれない', async () => {
    const user = userEvent.setup();
    // 招待ステータスをacceptedに変更したメッセージ
    const modifiedMessage: ExtendedMessageType = {
      ...mockExtendedMessages[0],
      invitation: mockExtendedMessages[0].invitation ? {
        ...mockExtendedMessages[0].invitation,
        status: 'accepted'
      } : undefined
    };
    
    const acceptedMessages: ExtendedMessageType[] = [
      modifiedMessage,
      mockExtendedMessages[1],
    ];

    render(
      <MessageList
        messages={acceptedMessages}
        activeTab="inbox"
        loading={false}
        onMessageClick={mockOnMessageClick}
      />
    );

    // 招待ステータスがacceptedのメッセージをクリック
    const userNameElement = screen.getByText('テストユーザー1');
    const messageItem = userNameElement.closest('div[role="button"]');
    if (messageItem) {
      await user.click(messageItem);
    }

    // onMessageClickが呼ばれないことを確認
    expect(mockOnMessageClick).not.toHaveBeenCalled();
  });
});
