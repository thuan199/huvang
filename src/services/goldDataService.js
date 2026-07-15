import { supabase } from '../supabaseClient';

/*
 * Dùng chung request đang chạy để hạn chế gọi trùng
 * trong một số trường hợp component render lại.
 */
const pendingRequests = new Map();

async function fetchTransactions(userId) {
  const { data, error } = await supabase
    .from('gold_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Không tải được danh sách giao dịch: ${error.message}`
    );
  }

  return data || [];
}

async function fetchCurrentPrices(userId) {
  const { data, error } = await supabase
    .from('gold_prices')
    .select('*')
    .eq('user_id', userId)
    .order('gold_type', {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Không tải được giá hiện tại: ${error.message}`
    );
  }

  return data || [];
}

async function fetchPriceHistory(userId) {
  const { data, error } = await supabase
    .from('gold_price_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    })
    .limit(1000);

  if (error) {
    throw new Error(
      `Không tải được lịch sử giá: ${error.message}`
    );
  }

  return data || [];
}

/**
 * Tải toàn bộ dữ liệu vàng của một người dùng.
 *
 * force = false:
 * Dùng lại request đang chạy nếu có.
 *
 * force = true:
 * Luôn tải lại sau khi thêm, sửa hoặc xóa dữ liệu.
 */
export async function getGoldData(
  userId,
  { force = false } = {}
) {
  if (!userId) {
    return {
      transactions: [],
      prices: [],
      priceHistory: [],
    };
  }

  if (!force && pendingRequests.has(userId)) {
    return pendingRequests.get(userId);
  }

  const request = Promise.all([
    fetchTransactions(userId),
    fetchCurrentPrices(userId),
    fetchPriceHistory(userId),
  ])
    .then(
      ([
        transactions,
        prices,
        priceHistory,
      ]) => ({
        transactions,
        prices,
        priceHistory,
      })
    )
    .finally(() => {
      if (pendingRequests.get(userId) === request) {
        pendingRequests.delete(userId);
      }
    });

  pendingRequests.set(userId, request);

  return request;
}