import { supabase } from '../supabaseClient';

/*
 * Dùng chung request đang chạy để hạn chế gọi trùng
 * trong một số trường hợp component render lại.
 */
const pendingRequests = new Map();

export async function syncGoldPriceFromPnj() {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const accessToken =
    sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error(
      'Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.'
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      'get-pnj-gold-price',
      {
        method: 'POST',
        body: {},
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

  if (error) {
    console.error(
      'Lỗi gọi Edge Function:',
      error
    );

    let detailMessage = '';

    try {
      if (error.context) {
        const errorBody =
          await error.context.json();

        detailMessage =
          errorBody?.message ||
          errorBody?.error ||
          '';
      }
    } catch (parseError) {
      console.error(
        'Không đọc được nội dung lỗi:',
        parseError
      );
    }

    throw new Error(
      detailMessage ||
        error.message ||
        'Không thể gọi Edge Function'
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.message ||
        'Không thể đồng bộ giá PNJ'
    );
  }

  return data;
}

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