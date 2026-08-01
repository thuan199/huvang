import { supabase } from '../supabaseClient';

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

async function getPrivateGoldContext(userId) {
  if (!userId) {
    return { shops: [], prices: [] };
  }

  const [{ data: shops, error: shopError }, { data: prices, error: priceError }] =
    await Promise.all([
      supabase
        .from('private_gold_shops')
        .select('*')
        .eq('user_id', userId)
        .order('shop_name', { ascending: true }),
      supabase
        .from('private_gold_prices')
        .select('*')
        .eq('user_id', userId)
        .order('price_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

  if (shopError) throw shopError;
  if (priceError) throw priceError;

  return {
    shops: shops ?? [],
    prices: prices ?? [],
  };
}

function enrichPriceRows(shops, prices) {
  const shopById = new Map(
    (shops ?? []).map((shop) => [String(shop.id), shop]),
  );

  return (prices ?? []).map((price) => {
    const shop = shopById.get(String(price.shop_id)) ?? null;

    return {
      ...price,
      shop,
      shop_id: price.shop_id,
      private_shop_id: price.shop_id,
      shop_name: shop?.shop_name ?? '',
      source_code: `PRIVATE:${price.shop_id}`,
      source_name: shop?.shop_name ?? 'Tiệm vàng tư nhân',
      product_name: price.gold_type_name,
      gold_type: price.gold_type_name,
      gold_name: price.gold_type_name,
      buy_price: Number(price.buy_price_per_chi ?? 0),
      sell_price: Number(price.sell_price_per_chi ?? 0),
      source_updated_at: price.price_date,
      fetched_at: price.created_at,
      note: shop?.shop_name
        ? `Giá do bạn cập nhật cho ${shop.shop_name}`
        : 'Giá tiệm vàng tư nhân',
    };
  });
}

/** Lấy toàn bộ lịch sử giá tư nhân của user. */
export async function getPrivateGoldPriceHistory(userId) {
  const { shops, prices } = await getPrivateGoldContext(userId);
  return enrichPriceRows(shops, prices);
}

/** Lấy giá mới nhất của từng tiệm + loại vàng. */
export async function getPrivateGoldPrices(userId) {
  const history = await getPrivateGoldPriceHistory(userId);
  const latestByShopAndType = new Map();

  for (const price of history) {
    const key = `${String(price.shop_id ?? '').trim()}::${normalizeText(
      price.gold_type_name,
    )}`;

    if (!latestByShopAndType.has(key)) {
      latestByShopAndType.set(key, price);
    }
  }

  return Array.from(latestByShopAndType.values());
}

export async function findOrCreatePrivateGoldShop({ userId, shopName }) {
  const cleanedShopName = cleanText(shopName);
  const normalizedShopName = normalizeText(shopName);

  if (!userId) throw new Error('Thiếu thông tin người dùng.');
  if (!cleanedShopName) throw new Error('Vui lòng nhập tên tiệm vàng.');

  const { data: existingShops, error: findError } = await supabase
    .from('private_gold_shops')
    .select('*')
    .eq('user_id', userId);

  if (findError) throw findError;

  const existingShop = (existingShops ?? []).find(
    (shop) => normalizeText(shop.shop_name) === normalizedShopName,
  );

  if (existingShop) return existingShop;

  const { data, error } = await supabase
    .from('private_gold_shops')
    .insert({
      user_id: userId,
      shop_name: cleanedShopName,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mỗi lần cập nhật giá đều INSERT một bản ghi mới.
 * Nhờ vậy lịch sử không bị ghi đè.
 */
export async function savePrivateGoldPrice({
  userId,
  shopId,
  shopName,
  goldTypeName,
  buyPricePerChi,
  sellPricePerChi,
  priceDate,
}) {
  const cleanedGoldType = cleanText(goldTypeName);
  const buyPrice = Number(buyPricePerChi ?? 0);
  const sellPrice = Number(sellPricePerChi ?? 0);

  if (!userId) throw new Error('Thiếu thông tin người dùng.');
  if (!cleanedGoldType) throw new Error('Vui lòng nhập loại vàng.');

  if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
    throw new Error('Vui lòng nhập giá tiệm thu lại hợp lệ.');
  }

  if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
    throw new Error('Vui lòng nhập giá tiệm bán ra hợp lệ.');
  }

  let resolvedShopId = shopId || null;

  if (!resolvedShopId) {
    const shop = await findOrCreatePrivateGoldShop({
      userId,
      shopName,
    });

    resolvedShopId = shop.id;
  }

  /*
   * Mỗi tiệm + loại vàng chỉ có một mốc giá trong một ngày.
   * Múi giờ dùng cho ngày nghiệp vụ là Việt Nam (UTC+7).
   */
  const sourceDate = priceDate ? new Date(priceDate) : new Date();

  if (Number.isNaN(sourceDate.getTime())) {
    throw new Error('Ngày cập nhật giá không hợp lệ.');
  }

  const vietnamDateText = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(sourceDate);

  const startOfDay = `${vietnamDateText}T00:00:00+07:00`;

  const nextDay = new Date(`${vietnamDateText}T00:00:00+07:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const startOfNextDay = nextDay.toISOString();

  const { data: todayRows, error: findError } = await supabase
    .from('private_gold_prices')
    .select('*')
    .eq('user_id', userId)
    .eq('shop_id', resolvedShopId)
    .eq('gold_type_name', cleanedGoldType)
    .gte('price_date', startOfDay)
    .lt('price_date', startOfNextDay)
    .order('price_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (findError) throw findError;

  const existingToday = todayRows?.[0] ?? null;

  if (existingToday) {
    const oldBuyPrice = Number(existingToday.buy_price_per_chi ?? 0);
    const oldSellPrice = Number(existingToday.sell_price_per_chi ?? 0);

    /*
     * Giá không thay đổi: không tạo thêm lịch sử và cũng không update lại.
     */
    if (
      oldBuyPrice === buyPrice &&
      oldSellPrice === sellPrice
    ) {
      return {
        ...existingToday,
        save_action: 'unchanged',
      };
    }

    /*
     * Trong cùng ngày, nếu giá thay đổi thì update dòng của ngày đó.
     */
    const { data, error } = await supabase
      .from('private_gold_prices')
      .update({
        buy_price_per_chi: buyPrice,
        sell_price_per_chi: sellPrice,
        price_date: new Date().toISOString(),
      })
      .eq('id', existingToday.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      save_action: 'updated',
    };
  }

  /*
   * Chưa có giá trong ngày: tạo một mốc lịch sử mới.
   */
  const { data, error } = await supabase
    .from('private_gold_prices')
    .insert({
      user_id: userId,
      shop_id: resolvedShopId,
      gold_type_name: cleanedGoldType,
      buy_price_per_chi: buyPrice,
      sell_price_per_chi: sellPrice,
      price_date: priceDate || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    save_action: 'inserted',
  };
}

export async function deletePrivateGoldPrice({ userId, priceId }) {
  if (!userId || !priceId) {
    throw new Error('Thiếu thông tin cần xóa.');
  }

  const { data, error } = await supabase
    .from('private_gold_prices')
    .delete()
    .eq('id', priceId)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  if (!data?.length) {
    throw new Error('Không tìm thấy mức giá hoặc bạn không có quyền xóa.');
  }

  return data[0];
}


/**
 * Xóa toàn bộ lịch sử giá của một tiệm + loại vàng.
 * Dùng cho nút thùng rác trên card “Giá mới nhất”.
 */
export async function deletePrivateGoldPriceSeries({
  userId,
  shopId,
  goldTypeName,
}) {
  const cleanedGoldType = cleanText(goldTypeName);

  if (!userId || !shopId || !cleanedGoldType) {
    throw new Error('Thiếu thông tin chuỗi giá cần xóa.');
  }

  const { data, error } = await supabase
    .from('private_gold_prices')
    .delete()
    .eq('user_id', userId)
    .eq('shop_id', shopId)
    .eq('gold_type_name', cleanedGoldType)
    .select('id');

  if (error) throw error;

  if (!data?.length) {
    throw new Error(
      'Không tìm thấy lịch sử giá hoặc bạn không có quyền xóa.',
    );
  }

  return data;
}