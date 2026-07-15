import { supabase } from '../supabaseClient';

/**
 * Lấy danh sách giao dịch của người dùng.
 */
export async function getGoldTransactions(userId) {
  if (!userId) {
    throw new Error('Thiếu userId để tải giao dịch.');
  }

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
    throw error;
  }

  return data || [];
}

/**
 * Thêm giao dịch mới.
 */
export async function createGoldTransaction(payload) {
  const { data, error } = await supabase
    .from('gold_transactions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Cập nhật giao dịch đã có.
 */
export async function updateGoldTransaction({
  transactionId,
  userId,
  payload,
}) {
  if (!transactionId) {
    throw new Error('Thiếu ID giao dịch cần cập nhật.');
  }

  if (!userId) {
    throw new Error('Thiếu userId để cập nhật giao dịch.');
  }

  const { data, error } = await supabase
    .from('gold_transactions')
    .update(payload)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Xóa một giao dịch.
 */
export async function deleteGoldTransaction({
  transactionId,
  userId,
}) {
  if (!transactionId) {
    throw new Error('Thiếu ID giao dịch cần xóa.');
  }

  if (!userId) {
    throw new Error('Thiếu userId để xóa giao dịch.');
  }

  const { data, error } = await supabase
    .from('gold_transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select();

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      'Không tìm thấy giao dịch hoặc bạn không có quyền xóa.'
    );
  }

  return data[0];
}

/**
 * Đồng bộ giá cửa hàng mua vào mới nhất
 * sang giá bán ra hiện tại của toàn bộ giao dịch cùng loại vàng.
 */
export async function updateTransactionSellPriceByGoldType({
  userId,
  goldType,
  sellPricePerChi,
}) {
  if (!userId) {
    throw new Error('Thiếu userId để đồng bộ giá giao dịch.');
  }

  if (!goldType) {
    throw new Error('Thiếu loại vàng để đồng bộ giá giao dịch.');
  }

  const { data, error } = await supabase
    .from('gold_transactions')
    .update({
      sell_price_per_chi: sellPricePerChi,
    })
    .eq('user_id', userId)
    .eq('gold_type', goldType)
    .select();

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Xóa giá bán hiện tại khỏi toàn bộ giao dịch cùng loại vàng.
 */
export async function clearTransactionSellPriceByGoldType({
  userId,
  goldType,
}) {
  return updateTransactionSellPriceByGoldType({
    userId,
    goldType,
    sellPricePerChi: null,
  });
}