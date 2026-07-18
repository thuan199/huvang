import { supabase } from '../supabaseClient';

const PNJ_AREA_CODE = 'TPHCM';
const PNJ_GOLD_TYPE = 'Nhẫn 9999';

/*
 * Dùng chung request đang chạy để hạn chế gọi trùng
 * khi component render lại nhiều lần.
 */
const pendingRequests = new Map();

/**
 * Gọi Edge Function để lấy giá mới nhất từ PNJ.
 *
 * Edge Function sẽ:
 * - Kiểm tra người gọi đã đăng nhập.
 * - Lấy giá PNJ.
 * - Lấy giá vàng thế giới.
 * - Cập nhật pnj_current_price.
 * - Thêm lịch sử vào pnj_price_history nếu giá thay đổi.
 *
 * Edge Function không cập nhật gold_prices cá nhân.
 */
export async function syncGoldPriceFromPnj() {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      `Không kiểm tra được phiên đăng nhập: ${sessionError.message}`
    );
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
        'Không đọc được nội dung lỗi Edge Function:',
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

/**
 * Lấy giao dịch cá nhân.
 *
 * Mỗi user chỉ lấy dữ liệu có user_id của mình.
 */
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

  return data ?? [];
}

/**
 * Lấy giá cá nhân do user tự nhập.
 *
 * Bảng gold_prices vẫn tách theo user_id.
 */
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
      `Không tải được giá cá nhân hiện tại: ${error.message}`
    );
  }

  return data ?? [];
}

/**
 * Lấy lịch sử giá cá nhân.
 *
 * Đây không phải lịch sử PNJ dùng chung.
 */
async function fetchPersonalPriceHistory(
  userId
) {
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
      `Không tải được lịch sử giá cá nhân: ${error.message}`
    );
  }

  return data ?? [];
}

/**
 * Ánh xạ dữ liệu giá PNJ hiện tại.
 *
 * Giữ cả tên cột database mới và thêm tên cột tương thích
 * với giao diện cũ.
 */
function mapPnjCurrentPrice(item) {
  if (!item) {
    return null;
  }

  const buyPrice = Number(
    item.buy_price_per_chi ?? 0
  );

  const sellPrice = Number(
    item.sell_price_per_chi ?? 0
  );

  return {
    ...item,

    current_price_per_chi: buyPrice,
    price_per_chi: buyPrice,
    buy_price_per_chi: buyPrice,
    sell_price_per_chi: sellPrice,

    buy_price: buyPrice,
    sell_price: sellPrice,

    price_date:
      item.source_updated_at ??
      item.updated_at ??
      item.created_at,

    is_pnj_shared_price: true,
    source_name: 'PNJ',
  };
}

/**
 * Ánh xạ một dòng lịch sử PNJ.
 *
 * Database mới:
 * - old_buy_price_per_chi
 * - old_sell_price_per_chi
 * - new_buy_price_per_chi
 * - new_sell_price_per_chi
 *
 * Giao diện cũ:
 * - old_price_per_chi
 * - old_sell_price_per_chi
 * - price_per_chi
 * - sell_price_per_chi
 */
function mapPnjPriceHistoryItem(item) {
  const newBuyPrice = Number(
    item.new_buy_price_per_chi ?? 0
  );

  const newSellPrice = Number(
    item.new_sell_price_per_chi ?? 0
  );

  const oldBuyPrice =
    item.old_buy_price_per_chi == null
      ? null
      : Number(
        item.old_buy_price_per_chi
      );

  const oldSellPrice =
    item.old_sell_price_per_chi == null
      ? null
      : Number(
        item.old_sell_price_per_chi
      );

  const displayDate =
    item.source_updated_at ??
    item.created_at;

  return {
    ...item,

    price_per_chi: newBuyPrice,
    current_price_per_chi: newBuyPrice,
    buy_price_per_chi: newBuyPrice,
    sell_price_per_chi: newSellPrice,

    old_price_per_chi: oldBuyPrice,
    old_buy_price_per_chi: oldBuyPrice,
    old_sell_price_per_chi: oldSellPrice,

    price_date: displayDate,
    updated_at: displayDate,

    is_pnj_shared_price: true,
    source_name: 'PNJ',
  };
}

/**
 * Lấy giá PNJ hiện tại dùng chung cho tất cả user.
 *
 * Không lọc theo user_id.
 */
export async function getPnjCurrentPrice() {
  const { data, error } = await supabase
    .from('pnj_current_price')
    .select('*')
    .eq('area_code', PNJ_AREA_CODE)
    .eq('gold_type', PNJ_GOLD_TYPE)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Không tải được giá PNJ hiện tại: ${error.message}`
    );
  }

  return mapPnjCurrentPrice(data);
}

/**
 * Lấy lịch sử PNJ dùng chung.
 *
 * Không lọc theo user_id.
 */
export async function getPnjPriceHistory({
  limit = 1000,
} = {}) {
  let query = supabase
    .from('pnj_price_history')
    .select('*')
    .eq('area_code', PNJ_AREA_CODE)
    .eq('gold_type', PNJ_GOLD_TYPE)
    .order('source_updated_at', {
      ascending: false,
      nullsFirst: false,
    })
    .order('created_at', {
      ascending: false,
    });

  if (
    Number.isInteger(limit) &&
    limit > 0
  ) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Không tải được lịch sử giá PNJ: ${error.message}`
    );
  }

  return (data ?? []).map(
    mapPnjPriceHistoryItem
  );
}

/**
 * Tải toàn bộ dữ liệu dùng trong màn hình chính.
 *
 * Dữ liệu cá nhân:
 * - transactions
 * - prices
 * - priceHistory
 *
 * Dữ liệu PNJ dùng chung:
 * - pnjCurrentPrice
 * - pnjPriceHistory
 *
 * force = false:
 * Dùng lại request đang chạy nếu có.
 *
 * force = true:
 * Luôn tải lại sau khi thêm, sửa, xóa
 * hoặc đồng bộ PNJ.
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
      personalPriceHistory: [],
      pnjCurrentPrice: null,
      pnjPriceHistory: [],
    };
  }

  if (
    !force &&
    pendingRequests.has(userId)
  ) {
    return pendingRequests.get(userId);
  }

  const request = Promise.all([
    fetchTransactions(userId),
    fetchCurrentPrices(userId),
    fetchPersonalPriceHistory(userId),
    getPnjCurrentPrice(),
    getPnjPriceHistory(),
  ])
    .then(
      ([
        transactions,
        prices,
        personalPriceHistory,
        pnjCurrentPrice,
        pnjPriceHistory,
      ]) => ({
        /*
         * Dữ liệu cá nhân.
         */
        transactions,
        prices,

        /*
         * Giữ tên priceHistory để không làm hỏng
         * các phần giao diện cũ đang sử dụng.
         */
        priceHistory:
          personalPriceHistory,

        /*
         * Tên rõ nghĩa hơn để sử dụng về sau.
         */
        personalPriceHistory,

        /*
         * Dữ liệu PNJ dùng chung.
         */
        pnjCurrentPrice,
        pnjPriceHistory,
      })
    )
    .finally(() => {
      if (
        pendingRequests.get(userId) ===
        request
      ) {
        pendingRequests.delete(userId);
      }
    });

  pendingRequests.set(
    userId,
    request
  );

  return request;
}