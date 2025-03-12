/**
 * 日付を日本語フォーマットに変換する関数
 * @param dateStr 日付文字列（ISO形式）
 * @returns フォーマットされた日付文字列（例: 3月12日(水)）
 */
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  });
};

/**
 * 時間を24時間形式から表示用にフォーマットする関数
 * @param timeStr 時間文字列（例: "14:30:00"）
 * @returns フォーマットされた時間文字列（例: "14:30"）
 */
export const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '00:00';
  return timeStr.slice(0, 5);
};

/**
 * 日付と時間を組み合わせて表示用にフォーマットする関数
 * @param dateStr 日付文字列
 * @param startTime 開始時間
 * @param endTime 終了時間
 * @returns フォーマットされた日時文字列（例: 3月12日(水) 14:30～16:00）
 */
export const formatDateTimeRange = (
  dateStr: string,
  startTime: string | null,
  endTime: string | null
): string => {
  const formattedDate = formatDate(dateStr);
  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);
  
  return `${formattedDate} ${formattedStartTime}～${formattedEndTime}`;
};
