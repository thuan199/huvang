/**
 * Định dạng số tiền theo kiểu Việt Nam.
 *
 * Ví dụ:
 * 14320000 -> "14.320.000"
 */
export function formatMoney(value) {
  const number = Number(value || 0);

  return number.toLocaleString('vi-VN');
}

/**
 * Định dạng thời gian đầy đủ.
 *
 * Ví dụ:
 * 2026-07-15T08:30:00
 * -> "15/07/2026 08:30"
 */
export function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Định dạng ngày ngắn để hiển thị trên biểu đồ.
 *
 * Ví dụ:
 * 2026-07-15 -> "15/07"
 */
export function formatShortDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Lấy ngày hiện tại theo múi giờ Việt Nam.
 *
 * Kết quả:
 * "2026-07-15"
 */
export function getVietnamDateKey(date = new Date()) {
  const validDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(validDate.getTime())) {
    return '';
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(validDate);

  const values = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Định dạng số tiền tăng hoặc giảm.
 *
 * Ví dụ:
 * 50000  -> "+50.000"
 * -50000 -> "-50.000"
 * 0      -> "0"
 */
export function formatPriceChange(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return '';
  }

  const sign = number > 0 ? '+' : '';

  return `${sign}${formatMoney(number)}`;
}