import { supabase } from '../supabaseClient';

const MARKET_SOURCE_CODES = ['SJC', 'MI_HONG', 'PNJ'];
const pendingRequests = new Map();

function normalizeSourceCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRelationItem(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function invokeGoldSync(functionName, sourceLabel) {
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
      functionName,
      {
        method: 'POST',
        body: {},
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

  if (error) {
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
        `Không đọc được lỗi đồng bộ ${sourceLabel}:`,
        parseError
      );
    }

    throw new Error(
      detailMessage ||
      error.message ||
      `Không thể đồng bộ giá ${sourceLabel}`
    );
  }

  if (data?.success === false) {
    throw new Error(
      data?.message ||
      `Không thể đồng bộ giá ${sourceLabel}`
    );
  }

  return data;
}

export function syncGoldPriceFromPnj() {
  return invokeGoldSync(
    'get-pnj-gold-price',
    'PNJ'
  );
}

/*
 * Hai hàm này được chuẩn bị sẵn cho bước tiếp theo.
 * Chỉ sử dụng sau khi Edge Function tương ứng được tạo.
 */
export function syncGoldPriceFromSjc() {
  return invokeGoldSync(
    'get-sjc-gold-price',
    'SJC'
  );
}

export function syncGoldPriceFromMiHong() {
  return invokeGoldSync(
    'get-mihong-gold-price',
    'Mi Hồng'
  );
}

export async function syncAllGoldPrices() {
  const jobs = [
    {
      sourceCode: 'PNJ',
      sourceLabel: 'PNJ',
      run: syncGoldPriceFromPnj,
    },
    {
      sourceCode: 'MI_HONG',
      sourceLabel: 'Mi Hồng',
      run: syncGoldPriceFromMiHong,
    },
    {
      sourceCode: 'SJC',
      sourceLabel: 'SJC',
      run: syncGoldPriceFromSjc,
    },
  ];

  const settled = await Promise.allSettled(
    jobs.map((job) => job.run())
  );

  const results = jobs.map((job, index) => {
    const result = settled[index];

    if (result.status === 'fulfilled') {
      const data = result.value ?? {};

      return {
        source: job.sourceCode,
        sourceCode: job.sourceCode,
        sourceLabel: job.sourceLabel,
        success: true,
        changed: Boolean(data.changed),
        historySaved: Boolean(
          data.historySaved
        ),
        message:
          data.message ||
          (data.changed
            ? `Đã cập nhật giá ${job.sourceLabel}.`
            : `Giá ${job.sourceLabel} không thay đổi.`),
        data,
      };
    }

    return {
      source: job.sourceCode,
      sourceCode: job.sourceCode,
      sourceLabel: job.sourceLabel,
      success: false,
      changed: false,
      historySaved: false,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : `Không thể đồng bộ giá ${job.sourceLabel}.`,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : `Không thể đồng bộ giá ${job.sourceLabel}.`,
    };
  });

  const successResults = results.filter(
    (item) => item.success
  );

  const failedResults = results.filter(
    (item) => !item.success
  );

  const changedResults = successResults.filter(
    (item) => item.changed
  );

  return {
    success: failedResults.length === 0,
    hasSuccess: successResults.length > 0,
    changed: changedResults.length > 0,
    results,
    successResults,
    failedResults,
    changedResults,
  };
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

  return (data ?? []).map((item) => ({
    ...item,
    gold_type:
      item.gold_type ??
      item.gold_name ??
      '',
    price_per_chi: toNumber(
      item.price_per_chi ??
      item.unit_price
    ),
    quantity_chi: toNumber(
      item.quantity_chi
    ),
    location:
      item.location ??
      item.seller_name ??
      '',
  }));
}

async function fetchCurrentPrices(userId) {
  const { data, error } = await supabase
    .from('user_gold_preferences')
    .select(`
      id,
      user_id,
      gold_type_id,
      preferred_source_id,
      preferred_source_product_id,
      manual_buy_price,
      manual_sell_price,
      use_manual_price,
      is_favorite,
      display_order,
      created_at,
      updated_at,
      gold_type:gold_types (
        id,
        code,
        name,
        purity,
        unit
      )
    `)
    .eq('user_id', userId)
    .order('display_order', {
      ascending: true,
    })
    .order('created_at', {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Không tải được giá cá nhân hiện tại: ${error.message}`
    );
  }

  return (data ?? []).map((item) => {
    const goldTypeRelation =
      Array.isArray(item.gold_type)
        ? item.gold_type[0]
        : item.gold_type;

    const buyPrice = toNumber(
      item.manual_buy_price
    );

    const sellPrice = toNumber(
      item.manual_sell_price
    );

    return {
      ...item,

      gold_type:
        goldTypeRelation?.name ?? '',

      gold_type_code:
        goldTypeRelation?.code ?? '',

      gold_type_name:
        goldTypeRelation?.name ?? '',

      current_price_per_chi:
        buyPrice,

      price_per_chi:
        buyPrice,

      buy_price_per_chi:
        buyPrice,

      sell_price_per_chi:
        sellPrice,

      source: 'MANUAL',
      source_code: 'MANUAL',
    };
  });
}

/*
 * Schema V2 không còn bảng lịch sử giá cá nhân riêng.
 * Giá người dùng tự nhập nằm trong user_gold_preferences.
 */
async function fetchPersonalPriceHistory() {
  return [];
}

function mapMarketPrice(item) {
  const product = getRelationItem(
    item.source_product ??
    item.product
  );

  const source = getRelationItem(
    product?.source
  );

  const goldType = getRelationItem(
    product?.gold_type
  );

  const sourceCode =
    normalizeSourceCode(
      source?.code ??
      item.source_code ??
      item.source
    );

  const buyPrice = toNumber(
    item.buy_price ??
    item.buy_price_per_chi ??
    item.price_per_chi
  );

  const sellPrice = toNumber(
    item.sell_price ??
    item.sell_price_per_chi
  );

  const displayDate =
    item.source_updated_at ??
    item.fetched_at ??
    item.updated_at ??
    item.created_at ??
    null;

  return {
    ...item,

    source_product: product,

    source_product_id:
      item.source_product_id ??
      product?.id ??
      null,

    source_code: sourceCode,
    source: sourceCode,

    source_name:
      source?.name ??
      sourceCode,

    product_code:
      product?.product_code ??
      '',

    product_name:
      product?.product_name ??
      goldType?.name ??
      '',

    gold_type_id:
      product?.gold_type_id ??
      goldType?.id ??
      null,

    gold_type_code:
      goldType?.code ??
      '',

    gold_type_name:
      product?.product_name ??
      goldType?.name ??

      '',

    gold_type:
      product?.product_name ??
      goldType?.name ??
      '',

    source_unit:
      product?.source_unit ??
      'chi',

    conversion_to_chi:
      toNumber(
        product?.conversion_to_chi,
        1
      ),

    buy_price: buyPrice,
    sell_price: sellPrice,

    current_price_per_chi:
      buyPrice,

    price_per_chi:
      buyPrice,

    buy_price_per_chi:
      buyPrice,

    sell_price_per_chi:
      sellPrice,

    price_date:
      displayDate,

    updated_at:
      displayDate,

    note:
      item.note ??
      item.raw_data?.note ??
      '',

    is_active:
      product?.is_active !== false,

    is_shared_market_price:
      true,

    is_pnj_shared_price:
      sourceCode === 'PNJ',

    is_mihong_shared_price:
      sourceCode === 'MI_HONG',

    is_sjc_shared_price:
      sourceCode === 'SJC',
  };
}

const MARKET_PRICE_RELATIONS = `
  source_product:gold_source_products!inner (
    id,
    source_id,
    gold_type_id,
    product_code,
    product_name,
    source_unit,
    conversion_to_chi,
    display_order,
    is_active,
    source:gold_price_sources!inner (
      id,
      code,
      name
    ),
    gold_type:gold_types (
      id,
      code,
      name,
      purity,
      unit
    )
  )
`;

const MARKET_LATEST_SELECT = `
  id,
  source_product_id,
  buy_price,
  sell_price,
  source_updated_at,
  fetched_at,
  updated_at,
  raw_data,
  ${MARKET_PRICE_RELATIONS}
`;

const MARKET_HISTORY_SELECT = `
  id,
  source_product_id,
  buy_price,
  sell_price,
  source_updated_at,
  fetched_at,
  raw_data,
  note,
  ${MARKET_PRICE_RELATIONS}
`;

export async function getMarketCurrentPrices() {
  const { data, error } = await supabase
    .from('gold_price_latest')
    .select(MARKET_LATEST_SELECT)
    .order('fetched_at', {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(
      `Không tải được giá vàng hiện tại: ${error.message}`
    );
  }

  const mappedPrices = (data ?? [])
    .map(mapMarketPrice)
    .filter((item) => {
      const sourceCode =
        normalizeSourceCode(
          item.source_code ??
          item.source
        );

      const isActive =
        item.source_product?.is_active ??
        item.product?.is_active ??
        true;

      return (
        isActive &&
        MARKET_SOURCE_CODES.includes(
          sourceCode
        )
      );
    });

  return mappedPrices;
}

export async function getMarketPriceHistory({
  sourceCode,
  limit = 3000,
} = {}) {
  let query = supabase
    .from('gold_price_history')
    .select(MARKET_HISTORY_SELECT)
    .order('source_updated_at', {
      ascending: false,
      nullsFirst: false,
    })
    .order('fetched_at', {
      ascending: false,
      nullsFirst: false,
    })

  const normalizedSourceCode =
    normalizeSourceCode(sourceCode);

  if (normalizedSourceCode) {
    query = query.eq(
      'source_product.source.code',
      normalizedSourceCode
    );
  }

  if (
    Number.isInteger(limit) &&
    limit > 0
  ) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Không tải được lịch sử giá vàng: ${error.message}`
    );
  }

  return (data ?? [])
    .map(mapMarketPrice)
    .filter((item) =>
      MARKET_SOURCE_CODES.includes(
        item.source_code
      )
    );
}

export function groupPricesBySource(
  items = []
) {
  const result = {
    PNJ: [],
    MI_HONG: [],
    SJC: [],
  };

  for (const originalItem of items) {
    const sourceCode =
      normalizeSourceCode(
        originalItem.source_code ??
        originalItem.source
      );

    if (!Object.prototype.hasOwnProperty.call(
      result,
      sourceCode
    )) {
      continue;
    }

    result[sourceCode].push({
      ...originalItem,
      source_code: sourceCode,
      source: sourceCode,
    });
  }

  return result;
}

export async function getPnjCurrentPrice() {
  const prices =
    await getMarketCurrentPrices();

  return prices.find(
    (item) =>
      item.source_code === 'PNJ'
  ) ?? null;
}

export async function getPnjPriceHistory(options = {}) {
  return getMarketPriceHistory({
    ...options,
    sourceCode: 'PNJ',
  });
}

export async function saveManualGoldPrice({
  userId,
  goldType,
  buyPrice,
  sellPrice,
}) {
  if (!userId) {
    throw new Error(
      'Thiếu thông tin người dùng.'
    );
  }

  const normalizedGoldType =
    String(goldType ?? '').trim();

  if (!normalizedGoldType) {
    throw new Error(
      'Vui lòng nhập loại vàng.'
    );
  }

  const {
    data: goldTypes,
    error: goldTypeError,
  } = await supabase
    .from('gold_types')
    .select('id, code, name')
    .eq('is_active', true);

  if (goldTypeError) {
    throw new Error(
      `Không tải được danh mục loại vàng: ${goldTypeError.message}`
    );
  }

  const normalizedSearch =
    normalizedGoldType.toLowerCase();

  const matchedGoldType =
    (goldTypes ?? []).find((item) => {
      return (
        String(item.name ?? '')
          .trim()
          .toLowerCase() === normalizedSearch ||
        String(item.code ?? '')
          .trim()
          .toLowerCase() === normalizedSearch
      );
    });

  if (!matchedGoldType) {
    throw new Error(
      `Không tìm thấy loại vàng "${normalizedGoldType}" trong bảng gold_types.`
    );
  }

  const payload = {
    user_id: userId,
    gold_type_id: matchedGoldType.id,
    manual_buy_price:
      toNumber(buyPrice),
    manual_sell_price:
      toNumber(sellPrice),
    use_manual_price: true,
    is_favorite: true,
  };

  const { data, error } = await supabase
    .from('user_gold_preferences')
    .upsert(payload, {
      onConflict:
        'user_id,gold_type_id',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(
      `Không lưu được giá thủ công: ${error.message}`
    );
  }

  return data;
}

export async function deleteManualGoldPrice({
  userId,
  preferenceId,
}) {
  const { error } = await supabase
    .from('user_gold_preferences')
    .delete()
    .eq('id', preferenceId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(
      `Không xóa được giá thủ công: ${error.message}`
    );
  }
}

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
      marketCurrentPrices: [],
      marketPriceHistory: [],
      currentPricesBySource:
        groupPricesBySource(),
      priceHistoryBySource:
        groupPricesBySource(),
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
    getMarketCurrentPrices(),
    getMarketPriceHistory(),
  ])
    .then(([
      transactions,
      prices,
      personalPriceHistory,
      marketCurrentPrices,
      marketPriceHistory,
    ]) => {
      const currentPricesBySource =
        groupPricesBySource(
          marketCurrentPrices
        );

      const priceHistoryBySource =
        groupPricesBySource(
          marketPriceHistory
        );

      return {
        transactions,
        prices,
        priceHistory:
          personalPriceHistory,
        personalPriceHistory,

        marketCurrentPrices,
        marketPriceHistory,
        currentPricesBySource,
        priceHistoryBySource,

        /* Tương thích với App hiện tại. */
        pnjCurrentPrice:
          currentPricesBySource.PNJ[0] ??
          null,
        pnjPriceHistory:
          priceHistoryBySource.PNJ,
      };
    })
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