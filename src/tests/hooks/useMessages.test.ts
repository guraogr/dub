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

// メッセージAPIのモック
jest.mock('../../services/messageApi', () => ({
  fetchInboxMessages: jest.fn().mockResolvedValue([]),
  fetchSentMessages: jest.fn().mockResolvedValue([]),
  respondToInvitation: jest.fn().mockResolvedValue(true),
  markMessageAsRead: jest.fn().mockResolvedValue(true)
}));

// メッセージサービスのモック
jest.mock('../../services/messageService', () => ({
  createEnhancedInvitationMessage: jest.fn().mockImplementation((message) => ({
    ...message,
    time: '14:00 ~ 15:00',
    comment: 'テストメッセージ'
  })),
  enhanceMessagesWithTimeInfo: jest.fn().mockReturnValue([])
}));

import { renderHook, act } from '@testing-library/react';
import { useMessages } from '../../hooks/useMessages';
import { mockMessages } from '../mocks/messageMocks';
import * as messageApi from '../../services/messageApi';
import * as messageService from '../../services/messageService';
import { SupabaseProvider } from '../../contexts/SupabaseContext';
import { type ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

// モッククライアント
const mockSupabaseClient = {
  auth: {
    // 初期状態テスト用に一度だけnullを返し、その後はユーザーIDを返す
    getUser: jest.fn().mockImplementation(() => {
      // 初回呼び出し時はユーザーがない状態をシミュレート
      if ((mockSupabaseClient.auth.getUser as jest.Mock).mock.calls.length === 1) {
        return Promise.resolve({
          data: { user: null }
        });
      }
      // 2回目以降はユーザーIDを返す
      return Promise.resolve({
        data: { user: { id: 'user-1', email: 'test@example.com' } }
      });
    })
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    match: jest.fn().mockResolvedValue({
      data: mockMessages,
      error: null
    })
  })
} as unknown as SupabaseClient;

// テスト開始前にモックを設定
beforeEach(() => {
  // モックリセット
  jest.clearAllMocks();
  
  // モックの戻り値を設定
  (messageApi.fetchInboxMessages as jest.Mock).mockResolvedValue(mockMessages);
  (messageApi.fetchSentMessages as jest.Mock).mockResolvedValue(mockMessages);
});

describe('useMessages フック', () => {
  // テスト用のラッパー関数
  const wrapper = ({ children }: { children: ReactNode }) => {
    return SupabaseProvider({ children, client: mockSupabaseClient });
  };

  test('初期状態が正しく設定されている', async () => {
    // テスト前にモックをリセット
    jest.clearAllMocks();
    
    const { result } = renderHook(() => useMessages(), { wrapper });
    
    // useEffectの完了を待つ
    await act(async () => {
      // 非同期処理の完了を待つ
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // 初期状態ではメッセージは空であることを確認
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.activeTab).toBe('inbox');
  });

  test('fetchMessages関数がメッセージを正しく取得する', async () => {
    // テスト前にモックをリセット
    jest.clearAllMocks();
    
    // ユーザーIDを返すように設定
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } }
    });
    
    const { result } = renderHook(() => useMessages(), { wrapper });
    
    // useEffectの完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // fetchMessages関数を明示的に呼び出す
    await act(async () => {
      await result.current.fetchMessages();
    });
    
    // APIが呼び出されたことを確認
    expect(messageApi.fetchInboxMessages).toHaveBeenCalled();
    
    // 拡張メッセージが設定されたことを確認
    expect(result.current.messages).toEqual(mockMessages);
    expect(result.current.loading).toBe(false);
  });

  test('setActiveTab関数がタブを切り替える', async () => {
    // テスト前にモックをリセット
    jest.clearAllMocks();
    
    // ユーザーIDを返さないように設定
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null }
    });
    
    const { result } = renderHook(() => useMessages(), { wrapper });
    
    // useEffectの完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // 初期状態を確認
    expect(result.current.activeTab).toBe('inbox');
    
    // タブを切り替える
    await act(async () => {
      result.current.setActiveTab('sent');
    });
    
    // 状態が更新されたことを確認
    expect(result.current.activeTab).toBe('sent');
  });

  test('handleResponseToInvitation関数が招待に応答する', async () => {
    // テスト前にモックをリセット
    jest.clearAllMocks();
    
    // ユーザーIDを返すように設定
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } }
    });
    
    const { result } = renderHook(() => useMessages(), { wrapper });
    
    // useEffectの完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // 招待に応答する
    let response;
    await act(async () => {
      response = await result.current.handleResponseToInvitation('message-1', 'invitation-1', 'accepted');
    });
    
    // APIが呼び出されたことを確認
    expect(messageApi.respondToInvitation).toHaveBeenCalledWith(
      expect.anything(),
      'message-1', 
      'invitation-1', 
      'accepted',
      expect.anything()
    );
    
    // 応答が成功したことを確認
    expect(response).toBe(true);
  });

  test('createEnhancedMessage関数がメッセージを拡張する', async () => {
    // テスト前にモックをリセット
    jest.clearAllMocks();
    
    // ユーザーIDを返さないように設定
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null }
    });
    
    const { result } = renderHook(() => useMessages(), { wrapper });
    
    // useEffectの完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // メッセージを拡張する
    let enhancedMessage;
    await act(async () => {
      enhancedMessage = result.current.createEnhancedMessage(mockMessages[0]);
    });
    
    // messageServiceが呼び出されたことを確認
    expect(messageService.createEnhancedInvitationMessage).toHaveBeenCalledWith(mockMessages[0]);
    
    // 拡張されたメッセージが正しいことを確認
    expect(enhancedMessage).toHaveProperty('time');
    expect(enhancedMessage).toHaveProperty('comment');
  });
  
  test('markAsRead関数がメッセージを既読にする', async () => {
    // テスト前にモックをリセット
    jest.clearAllMocks();
    
    // ユーザーIDを返すように設定
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } }
    });
    
    const { result } = renderHook(() => useMessages(), { wrapper });
    
    // useEffectの完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // 初期状態を設定
    await act(async () => {
      await result.current.fetchMessages();
    });
    
    // メッセージを既読にする
    let success;
    await act(async () => {
      success = await result.current.markAsRead('message-1');
    });
    
    // APIが呼び出されたことを確認
    expect(messageApi.markMessageAsRead).toHaveBeenCalledWith(expect.anything(), 'message-1');
    
    // 処理が成功したことを確認
    expect(success).toBe(true);
  });
});
