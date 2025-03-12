import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PostgrestError } from '@supabase/supabase-js';

interface QueryState<T> {
  data: T | null;
  error: PostgrestError | Error | null;
  loading: boolean;
}

/**
 * Supabaseクエリを実行するためのカスタムフック
 * エラーハンドリングとローディング状態の管理を簡略化します
 * 
 * @param queryFn クエリ関数
 * @param dependencies 依存配列
 * @param options オプション設定
 * @returns クエリの状態
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  dependencies: any[] = [],
  options: {
    showErrorToast?: boolean;
    errorMessage?: string;
    onSuccess?: (data: T) => void;
  } = {}
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  const { showErrorToast = true, errorMessage = 'データの取得に失敗しました', onSuccess } = options;

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, loading: true }));
      
      try {
        const { data, error } = await queryFn();
        
        if (!isMounted) return;
        
        if (error) {
          setState({ data: null, error, loading: false });
          if (showErrorToast) {
            toast.error(errorMessage || error.message);
          }
          return;
        }
        
        setState({ data, error: null, loading: false });
        
        if (data && onSuccess) {
          onSuccess(data);
        }
      } catch (error) {
        if (!isMounted) return;
        
        const err = error instanceof Error ? error : new Error('不明なエラーが発生しました');
        setState({ data: null, error: err, loading: false });
        
        if (showErrorToast) {
          toast.error(errorMessage || err.message);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return state;
}
