import React, { useEffect } from 'react';

interface LoadingScreenProps {
  loadingTimeout: boolean;
  connectionError: boolean;
  reconnecting: boolean;
  onReconnect: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  loadingTimeout,
  connectionError,
  reconnecting,
  onReconnect
}) => {
  

  // エラーメッセージを決定
  const errorMessage = connectionError
    ? 'データの読み込みに時間がかかっています。読み込み中が続く場合は、再読み込みをしてください。'
    : 'データの読み込みに時間がかかっています。読み込み中が続く場合は、再読み込みをしてください。';
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600 mb-2">読み込み中...</p>
      
      {(loadingTimeout || connectionError) && (
        <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 max-w-md">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{errorMessage}</p>
          </div>
          <div className="mt-2">
            <button
              onClick={onReconnect}
              className="px-4 py-2 bg-yellow-200 hover:bg-yellow-300 rounded-md text-sm transition-colors"
            >
              {reconnecting ? '再接続中...' : '再接続する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingScreen;
