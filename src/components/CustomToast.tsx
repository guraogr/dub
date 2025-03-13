import React, { useEffect } from 'react';
import { toast, Toaster } from 'sonner';

// sonnerのToastOptionsの型を定義
type SonnerToastOptions = {
  style?: React.CSSProperties;
  className?: string;
  duration?: number;
};

/**
 * カスタムトーストの型定義
 */
interface CustomToastOptions extends Omit<SonnerToastOptions, 'style'> {
  duration?: number;
  closeButton?: boolean;
  icon?: React.ReactNode;
}

/**
 * トースト表示タイプの定義
 */
export type ToastType = 'success' | 'error' | 'info';

/**
 * カスタムトースト用のスタイル定義
 */
const toastStyle = {
  toast: {
    backgroundColor: '#333333',
    color: '#fff',
    borderRadius: '10px',
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.3)',
    width: '100%',
    height: '100%',
    border: '0',
  },
  content: {
    color: 'white',
    fontSize: '13px',
    fontFamily: 'Hiragino Kaku Gothic Pro, sans-serif',
    fontWeight: '600',
    lineHeight: '18px',
    wordWrap: 'break-word'
  },
  closeButton: {
    marginLeft: 'auto',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

/**
 * カスタムトーストコンポーネント
 * @returns {JSX.Element} Toasterコンポーネント
 */
export const CustomToaster: React.FC = () => {
  // コンポーネントマウント時にスタイルを適用
  useEffect(() => {
    // 少し遅延させてスタイルを適用（DOMが確実に構築された後）
    const timer = setTimeout(() => {
      addCustomToastStyles();
    }, 100);
    
    return () => {
      // クリーンアップ: コンポーネントアンマウント時にスタイルを削除
      clearTimeout(timer);
      const existingStyle = document.getElementById('custom-toast-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: toastStyle.toast,
        className: 'custom-toast max-w-md mx-auto',
      }}
    />
  );
};

/**
 * カスタムトーストの共通オプション取得
 * @param {CustomToastOptions | undefined} options - トーストオプション
 * @returns {CustomToastOptions} 設定済みのトーストオプション
 */
const getCustomToastOptions = (options?: CustomToastOptions): CustomToastOptions => ({
  duration: options?.duration ?? 3000,
  closeButton: options?.closeButton ?? true,
  ...options
});

/**
 * 成功トースト表示
 * @param {string} message - 表示メッセージ
 * @param {CustomToastOptions} [options] - トーストオプション
 * @returns {string | number} トーストID
 */
export const showSuccessToast = (message: string, options?: CustomToastOptions): string | number => {
  return toast.success(message, getCustomToastOptions(options));
};

/**
 * エラートースト表示
 * @param {string} message - 表示メッセージ
 * @param {CustomToastOptions} [options] - トーストオプション
 * @returns {string | number} トーストID
 */
export const showErrorToast = (message: string, options?: CustomToastOptions): string | number => {
  return toast.error(message, getCustomToastOptions(options));
};

/**
 * 情報トースト表示
 * @param {string} message - 表示メッセージ
 * @param {CustomToastOptions} [options] - トーストオプション
 * @returns {string | number} トーストID
 */
export const showInfoToast = (message: string, options?: CustomToastOptions): string | number => {
  return toast(message, getCustomToastOptions(options));
};

/**
 * トースト表示（タイプ指定）
 * @param {string} message - 表示メッセージ
 * @param {ToastType} type - トーストタイプ
 * @param {CustomToastOptions} [options] - トーストオプション
 * @returns {string | number} トーストID
 */
export const showToast = (message: string, type: ToastType, options?: CustomToastOptions): string | number => {
  switch (type) {
    case 'success':
      return showSuccessToast(message, options);
    case 'error':
      return showErrorToast(message, options);
    case 'info':
    default:
      return showInfoToast(message, options);
  }
};

/**
 * カスタムスタイルのCSS追加
 */
const addCustomToastStyles = (): void => {
  // 既存のスタイルがあれば削除
  const existingStyle = document.getElementById('custom-toast-styles');
  if (existingStyle) {
    existingStyle.remove();
  }

  // 新しいスタイルを追加
  const style = document.createElement('style');
  style.id = 'custom-toast-styles';
  style.innerHTML = `
    [data-sonner-toaster] {
      top: 40px !important;
      left: 0 !important;
      right: 0 !important;
      transform: none !important;
      width: 100% !important;
      max-width: 100% !important;
      z-index: 9999 !important;
      padding: 0 16px !important;
      box-sizing: border-box !important;
      margin: 0 auto !important;
      max-width: 28rem !important; /* max-w-md = 28rem */
      margin-left: auto !important;
      margin-right: auto !important;
    }
    
    [data-sonner-toast] {
      position: relative !important;
      max-width: 100% !important;
      border-radius: 10px !important;
      padding: 12px 16px !important;
    }

    @media (max-width: 480px) {
      [data-sonner-toaster] {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 16px !important;
        top: 20px !important;
      }
      [data-sonner-toast] {
        padding: 12px 16px !important;
        font-size: 12px !important;
      }
    }

    [data-sonner-toast] [data-content] {
      color: white !important;
      font-size: 13px !important;
      font-family: 'Hiragino Kaku Gothic Pro', sans-serif !important;
      font-weight: 600 !important;
      line-height: 18px !important;
      word-wrap: break-word !important;
      width: 100% !important;
      flex: 1 !important;
    }
    
    @media (max-width: 480px) {
      [data-sonner-toast] [data-content] {
        font-size: 12px !important;
        line-height: 16px !important;
      }
    }

    [data-sonner-toast] [data-icon] {
      display: none !important;
    }

    [data-sonner-toast] [data-close-button] {
      margin-left: auto !important;
      width: 24px !important;
      height: 24px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: absolute !important;
      right: 8px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      background: transparent !important;
      color: white !important;
      border: none !important;
    }
    
    [data-sonner-toast] [data-close-button] svg {
      color: white !important;
      fill: white !important;
      stroke: white !important;
    }
    
    @media (max-width: 480px) {
      [data-sonner-toast] [data-close-button] {
        width: 20px !important;
        height: 20px !important;
        right: 6px !important;
      }
    }
  `;
  document.head.appendChild(style);
};

/**
 * カスタムトースト初期化
 */
export const initCustomToast = (): void => {
  if (typeof window !== 'undefined') {
    // DOMが完全に読み込まれた後にスタイルを適用
    if (document.readyState === 'complete') {
      addCustomToastStyles();
    } else {
      window.addEventListener('load', addCustomToastStyles);
    }
  }
};

/**
 * トースト削除
 * @param {string | number} toastId - 削除するトーストのID
 */
export const dismissToast = (toastId: string | number): void => {
  toast.dismiss(toastId);
};

/**
 * 全トースト削除
 */
export const dismissAllToasts = (): void => {
  toast.dismiss();
};
