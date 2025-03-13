import { ExtendedMessageType, User } from '../../types';

/**
 * テスト用のモックデータ
 */

// モックユーザー
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'テストユーザー1',
    email: 'user1@example.com',
    avatar_url: 'https://example.com/avatar1.jpg',
  },
  {
    id: 'user-2',
    name: 'テストユーザー2',
    email: 'user2@example.com',
    avatar_url: 'https://example.com/avatar2.jpg',
  },
];

// モックメッセージ
export const mockMessages: ExtendedMessageType[] = [
  {
    id: 'message-1',
    type: 'invitation',
    content: 'テストユーザー1さんから「テストメッセージ1」の誘いが届きました',
    created_at: '2025-03-10T10:00:00',
    sender_id: 'user-1',
    recipient_id: 'user-2',
    is_read: false,
    sender: mockUsers[0],
    recipient: mockUsers[1],
    invitation: {
      id: 'invitation-1',
      status: 'pending',
      availability_id: 'availability-1',
      availability: {
        id: 'availability-1',
        date: '2025-03-15',
        start_time: '14:00:00',
        end_time: '15:00:00',
        user_id: 'user-1'
      },
    },
  },
  {
    id: 'message-2',
    type: 'invitation',
    content: 'テストユーザー2さんから「テストメッセージ2」の誘いが届きました',
    created_at: '2025-03-11T11:00:00',
    sender_id: 'user-2',
    recipient_id: 'user-1',
    is_read: true,
    sender: mockUsers[1],
    recipient: mockUsers[0],
    invitation: {
      id: 'invitation-2',
      status: 'accepted',
      availability_id: 'availability-2',
      availability: {
        id: 'availability-2',
        date: '2025-03-16',
        start_time: '16:00:00',
        end_time: '17:00:00',
        user_id: 'user-2'
      },
    },
  },
];

// 拡張されたモックメッセージ
export const mockExtendedMessages: ExtendedMessageType[] = [
  {
    ...mockMessages[0],
    time: '14:00 ~ 15:00',
    comment: 'テストメッセージ1',
  },
  {
    ...mockMessages[1],
    time: '16:00 ~ 17:00',
    comment: 'テストメッセージ2',
  },
];

// モックSupabaseクライアント
export const mockSupabaseClient = {
  auth: {
    getUser: () => Promise.resolve({
      data: {
        user: {
          id: 'user-1',
          email: 'user1@example.com',
        },
      },
    }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          in: () => ({
            or: () => ({
              match: () => Promise.resolve({
                data: mockMessages,
                error: null
              })
            })
          })
        })
      })
    })
  }),
};
