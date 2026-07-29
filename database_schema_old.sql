--
-- PostgreSQL database dump
--

\restrict idvESJPABdE47AMJHgzXKlQfCd60Qns7urugfKbzlFRjmLA3V3u6zaIwdsdPHyD

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_ban_chat_user(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_ban_chat_user(target_user_id uuid, duration_code text, ban_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  calculated_until timestamptz;
  permanent_value boolean := false;
begin
  if not public.is_app_admin() then
    raise exception 'Bạn không có quyền quản trị';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Không thể tự khóa chính mình';
  end if;

  calculated_until :=
    case duration_code
      when '1h' then now() + interval '1 hour'
      when '3h' then now() + interval '3 hours'
      when '12h' then now() + interval '12 hours'
      when '1d' then now() + interval '1 day'
      when '3d' then now() + interval '3 days'
      when '7d' then now() + interval '7 days'
      when '1m' then now() + interval '1 month'
      when 'permanent' then null
      else null
    end;

  if duration_code = 'permanent' then
    permanent_value := true;
  elsif calculated_until is null then
    raise exception 'Thời hạn khóa không hợp lệ';
  end if;

  update public.chat_bans
  set is_active = false
  where user_id = target_user_id
    and is_active = true;

  insert into public.chat_bans (
    user_id,
    banned_by,
    reason,
    banned_until,
    is_permanent
  )
  values (
    target_user_id,
    auth.uid(),
    nullif(trim(ban_reason), ''),
    calculated_until,
    permanent_value
  );
end;
$$;


--
-- Name: admin_hide_chat_message(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_hide_chat_message(target_message_id uuid, should_hide boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_app_admin() then
    raise exception 'Bạn không có quyền quản trị';
  end if;

  update public.chat_messages
  set
    is_hidden = should_hide,
    hidden_by = case
      when should_hide then auth.uid()
      else null
    end,
    hidden_at = case
      when should_hide then now()
      else null
    end
  where id = target_message_id;

  if not found then
    raise exception 'Không tìm thấy tin nhắn';
  end if;
end;
$$;


--
-- Name: admin_remove_chat_message(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_remove_chat_message(target_message_id uuid, removal_message text DEFAULT 'Tin nhắn đã bị xóa vì vi phạm quy định'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_removal_message text;
begin
  if not public.is_app_admin() then
    raise exception 'Bạn không có quyền quản trị';
  end if;

  v_removal_message := coalesce(
    nullif(trim(removal_message), ''),
    'Tin nhắn đã bị xóa vì vi phạm quy định'
  );

  update public.chat_messages
  set
    is_deleted = true,
    content = v_removal_message,
    moderation_message = v_removal_message,
    moderated_by = auth.uid(),
    moderated_at = now(),
    updated_at = now()
  where id = target_message_id;

  if not found then
    raise exception 'Không tìm thấy tin nhắn';
  end if;
end;
$$;


--
-- Name: admin_unban_chat_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_unban_chat_user(target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_app_admin() then
    raise exception 'Bạn không có quyền quản trị';
  end if;

  delete from public.chat_bans
  where user_id = target_user_id;
end;
$$;


--
-- Name: admin_update_chat_report(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_update_chat_report(target_report_id uuid, new_status text, new_admin_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_app_admin() then
    raise exception
      'Bạn không có quyền quản trị';
  end if;

  if new_status not in (
    'pending',
    'reviewed',
    'resolved',
    'dismissed'
  ) then
    raise exception
      'Trạng thái báo cáo không hợp lệ';
  end if;

  update public.chat_reports
  set
    status = new_status,
    admin_note =
      nullif(trim(new_admin_note), ''),
    handled_by =
      case
        when new_status in (
          'resolved',
          'dismissed'
        )
        then auth.uid()
        else handled_by
      end,
    handled_at =
      case
        when new_status in (
          'resolved',
          'dismissed'
        )
        then now()
        else handled_at
      end
  where id = target_report_id;

  if not found then
    raise exception
      'Không tìm thấy báo cáo';
  end if;
end;
$$;


--
-- Name: change_gold_price_source(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.change_gold_price_source(p_gold_type text, p_source text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_buy_price numeric;
  v_sell_price numeric;
  v_source_updated_at timestamptz;
  v_gold_price_id uuid;
  v_had_old_price boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Không tìm thấy người dùng đăng nhập.';
  end if;

  p_gold_type := trim(p_gold_type);
  p_source := upper(trim(p_source));

  if p_gold_type is null or p_gold_type = '' then
    raise exception
      'Loại vàng không được để trống.';
  end if;

  if p_source not in ('PNJ', 'MI_HONG') then
    raise exception
      'Nguồn giá không hợp lệ: %',
      p_source;
  end if;

  select
    buy_price,
    sell_price,
    source_updated_at
  into
    v_buy_price,
    v_sell_price,
    v_source_updated_at
  from public.gold_price_current
  where source_code = p_source
    and product_code = 'GOLD_999'
  order by
    source_updated_at desc nulls last,
    updated_at desc nulls last
  limit 1;

  if not found then
    raise exception
      'Không tìm thấy giá hiện tại của nguồn %.',
      p_source;
  end if;

  if v_buy_price is null or v_sell_price is null then
    raise exception
      'Giá mua hoặc giá bán của nguồn % đang trống.',
      p_source;
  end if;

  select id
  into v_gold_price_id
  from public.gold_prices
  where user_id = v_user_id
    and gold_type = p_gold_type
  order by updated_at desc nulls last
  limit 1;

  v_had_old_price := found;

  if v_had_old_price then
    update public.gold_prices
    set
      current_price_per_chi = v_buy_price,
      sell_price_per_chi = v_sell_price,
      source = p_source,
      source_updated_at = coalesce(
        v_source_updated_at,
        now()
      ),
      updated_at = now()
    where id = v_gold_price_id;
  else
    insert into public.gold_prices (
      user_id,
      gold_type,
      current_price_per_chi,
      sell_price_per_chi,
      source,
      source_updated_at,
      updated_at
    )
    values (
      v_user_id,
      p_gold_type,
      v_buy_price,
      v_sell_price,
      p_source,
      coalesce(v_source_updated_at, now()),
      now()
    )
    returning id into v_gold_price_id;
  end if;

  insert into public.gold_price_history (
    user_id,
    gold_type,
    price_per_chi,
    sell_price_per_chi,
    source,
    note,
    price_date,
    created_at
  )
  values (
    v_user_id,
    p_gold_type,
    v_buy_price,
    v_sell_price,
    p_source,
    case
      when p_source = 'MI_HONG'
        then 'Đồng bộ giá từ Mi Hồng'
      else 'Đồng bộ giá từ PNJ'
    end,
    current_date,
    now()
  )
  on conflict (
    user_id,
    gold_type,
    source,
    price_date
  )
  do update set
    price_per_chi =
      excluded.price_per_chi,
    sell_price_per_chi =
      excluded.sell_price_per_chi,
    note =
      excluded.note,
    created_at =
      now();

  return json_build_object(
    'success', true,
    'changed', true,
    'source', p_source,
    'message',
      case
        when p_source = 'MI_HONG'
          then 'Đã cập nhật giá Mi Hồng và lịch sử.'
        else 'Đã cập nhật giá PNJ và lịch sử.'
      end,
    'price', json_build_object(
      'id', v_gold_price_id,
      'gold_type', p_gold_type,
      'current_price_per_chi',
        v_buy_price,
      'sell_price_per_chi',
        v_sell_price,
      'source', p_source,
      'source_updated_at',
        coalesce(v_source_updated_at, now())
    )
  );
end;
$$;


--
-- Name: delete_own_chat_message(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_own_chat_message(target_message_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$DECLARE
BEGIN
  UPDATE public.chat_messages
  SET
    is_recalled = true,
    recalled_at = now(),
    updated_at = now()
  WHERE id = target_message_id
    AND user_id = auth.uid()
    AND is_recalled = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Không tìm thấy tin nhắn hoặc bạn không có quyền thu hồi';
  END IF;
END;$$;


--
-- Name: is_app_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_app_admin(target_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.app_admins
    where user_id = target_user_id
  );
$$;


--
-- Name: is_chat_banned(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_chat_banned(target_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.chat_bans
    where user_id = target_user_id
      and is_active = true
      and (
        is_permanent = true
        or banned_until > now()
      )
  );
$$;


--
-- Name: sync_pnj_price(text, text, numeric, numeric, numeric, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_pnj_price(p_area_code text, p_gold_type text, p_buy_price_per_chi numeric, p_sell_price_per_chi numeric, p_world_gold_usd_per_oz numeric DEFAULT NULL::numeric, p_world_gold_source text DEFAULT NULL::text, p_source_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
declare
    v_current public.pnj_current_price%rowtype;

    v_effective_source_updated_at timestamptz;
    v_price_date date;
    v_note text;
    v_change_type text;
begin
    /*
     * 1. Kiểm tra dữ liệu đầu vào.
     */
    if nullif(trim(p_area_code), '') is null then
        raise exception 'Mã khu vực không được để trống';
    end if;

    if nullif(trim(p_gold_type), '') is null then
        raise exception 'Loại vàng không được để trống';
    end if;

    if p_buy_price_per_chi is null
       or p_buy_price_per_chi <= 0 then
        raise exception 'Giá mua PNJ không hợp lệ';
    end if;

    if p_sell_price_per_chi is null
       or p_sell_price_per_chi <= 0 then
        raise exception 'Giá bán PNJ không hợp lệ';
    end if;

    /*
     * 2. Chuẩn hóa thời gian nguồn.
     *
     * Nếu nguồn không gửi thời gian thì sử dụng thời điểm hiện tại.
     */
    v_effective_source_updated_at :=
        coalesce(
            p_source_updated_at,
            now()
        );

    v_price_date :=
        (
            v_effective_source_updated_at
            at time zone 'Asia/Ho_Chi_Minh'
        )::date;

    /*
     * 3. Tạo ghi chú lịch sử.
     */
    v_note :=
        '🌍 '
        || coalesce(
            to_char(
                p_world_gold_usd_per_oz,
                'FM999999990.00'
            ),
            '-'
        )
        || ' USD/oz - 🕒 '
        || to_char(
            v_effective_source_updated_at
                at time zone 'Asia/Ho_Chi_Minh',
            'DD/MM/YYYY HH24:MI'
        );

    /*
     * 4. Khóa theo khu vực và loại vàng.
     *
     * Giúp tránh trường hợp hai request đồng thời đều không thấy dữ liệu
     * rồi cùng thực hiện INSERT.
     */
    perform pg_advisory_xact_lock(
        hashtextextended(
            trim(p_area_code)
            || '|'
            || trim(p_gold_type),
            0
        )
    );

    /*
     * 5. Lấy giá PNJ hiện tại.
     */
    select *
    into v_current
    from public.pnj_current_price
    where area_code = trim(p_area_code)
      and gold_type = trim(p_gold_type)
    for update;

    /*
     * 6. Chưa có giá PNJ hiện tại:
     *    - Tạo giá hiện tại.
     *    - Tạo dòng lịch sử đầu tiên.
     */
    if not found then
        insert into public.pnj_current_price (
            area_code,
            gold_type,
            buy_price_per_chi,
            sell_price_per_chi,
            world_gold_usd_per_oz,
            world_gold_source,
            source_updated_at,
            updated_at
        )
        values (
            trim(p_area_code),
            trim(p_gold_type),
            p_buy_price_per_chi,
            p_sell_price_per_chi,
            p_world_gold_usd_per_oz,
            nullif(trim(p_world_gold_source), ''),
            v_effective_source_updated_at,
            now()
        )
        returning *
        into v_current;

        insert into public.pnj_price_history (
            area_code,
            gold_type,
            old_buy_price_per_chi,
            old_sell_price_per_chi,
            new_buy_price_per_chi,
            new_sell_price_per_chi,
            change_type,
            source_updated_at,
            price_date,
            world_gold_usd_per_oz,
            world_gold_source,
            note,
            created_at
        )
        values (
            trim(p_area_code),
            trim(p_gold_type),
            null,
            null,
            p_buy_price_per_chi,
            p_sell_price_per_chi,
            'CREATED',
            v_effective_source_updated_at,
            v_price_date,
            p_world_gold_usd_per_oz,
            nullif(trim(p_world_gold_source), ''),
            v_note,
            now()
        )
        on conflict (
            area_code,
            gold_type,
            price_date
        )
        do update set
            new_buy_price_per_chi =
                excluded.new_buy_price_per_chi,

            new_sell_price_per_chi =
                excluded.new_sell_price_per_chi,

            change_type =
                excluded.change_type,

            source_updated_at =
                excluded.source_updated_at,

            world_gold_usd_per_oz =
                excluded.world_gold_usd_per_oz,

            world_gold_source =
                excluded.world_gold_source,

            note =
                excluded.note,

            created_at =
                now();

        return jsonb_build_object(
            'changed', true,
            'created', true,
            'changeType', 'CREATED',
            'priceDate', v_price_date,
            'message', 'Đã tạo giá PNJ dùng chung',
            'oldBuyPricePerChi', null,
            'oldSellPricePerChi', null,
            'newBuyPricePerChi', p_buy_price_per_chi,
            'newSellPricePerChi', p_sell_price_per_chi
        );
    end if;

    /*
     * 7. Giá mua và giá bán đều không đổi.
     *
     * IS NOT DISTINCT FROM giúp so sánh NULL an toàn.
     */
    if v_current.buy_price_per_chi
           is not distinct from p_buy_price_per_chi
       and v_current.sell_price_per_chi
           is not distinct from p_sell_price_per_chi then

        /*
         * Giá không đổi nhưng vẫn cập nhật thông tin nguồn
         * và thời gian kiểm tra mới nhất.
         */
        update public.pnj_current_price
        set world_gold_usd_per_oz =
                p_world_gold_usd_per_oz,

            world_gold_source =
                nullif(
                    trim(p_world_gold_source),
                    ''
                ),

            source_updated_at =
                v_effective_source_updated_at,

            updated_at =
                now()
        where id = v_current.id;

        return jsonb_build_object(
            'changed', false,
            'created', false,
            'changeType', 'UNCHANGED',
            'priceDate', v_price_date,
            'message', 'PNJ chưa có giá mới',
            'oldBuyPricePerChi',
                v_current.buy_price_per_chi,
            'oldSellPricePerChi',
                v_current.sell_price_per_chi,
            'newBuyPricePerChi',
                p_buy_price_per_chi,
            'newSellPricePerChi',
                p_sell_price_per_chi
        );
    end if;

    /*
     * 8. Xác định loại thay đổi.
     */
    if p_buy_price_per_chi >
           v_current.buy_price_per_chi
       and p_sell_price_per_chi >
           v_current.sell_price_per_chi then

        v_change_type := 'INCREASE';

    elsif p_buy_price_per_chi <
              v_current.buy_price_per_chi
          and p_sell_price_per_chi <
              v_current.sell_price_per_chi then

        v_change_type := 'DECREASE';

    elsif p_buy_price_per_chi =
              v_current.buy_price_per_chi
          and p_sell_price_per_chi >
              v_current.sell_price_per_chi then

        v_change_type := 'SELL_INCREASE';

    elsif p_buy_price_per_chi =
              v_current.buy_price_per_chi
          and p_sell_price_per_chi <
              v_current.sell_price_per_chi then

        v_change_type := 'SELL_DECREASE';

    elsif p_buy_price_per_chi >
              v_current.buy_price_per_chi
          and p_sell_price_per_chi =
              v_current.sell_price_per_chi then

        v_change_type := 'BUY_INCREASE';

    elsif p_buy_price_per_chi <
              v_current.buy_price_per_chi
          and p_sell_price_per_chi =
              v_current.sell_price_per_chi then

        v_change_type := 'BUY_DECREASE';

    else
        /*
         * Một giá tăng, một giá giảm.
         */
        v_change_type := 'MIXED';
    end if;

    /*
     * 9. Lưu lịch sử giá theo ngày.
     *
     * Nếu cùng ngày đã có dữ liệu:
     * - Giữ nguyên giá cũ đầu ngày.
     * - Cập nhật giá mới nhất trong ngày.
     */
    insert into public.pnj_price_history (
        area_code,
        gold_type,
        old_buy_price_per_chi,
        old_sell_price_per_chi,
        new_buy_price_per_chi,
        new_sell_price_per_chi,
        change_type,
        source_updated_at,
        price_date,
        world_gold_usd_per_oz,
        world_gold_source,
        note,
        created_at
    )
    values (
        trim(p_area_code),
        trim(p_gold_type),
        v_current.buy_price_per_chi,
        v_current.sell_price_per_chi,
        p_buy_price_per_chi,
        p_sell_price_per_chi,
        v_change_type,
        v_effective_source_updated_at,
        v_price_date,
        p_world_gold_usd_per_oz,
        nullif(trim(p_world_gold_source), ''),
        v_note,
        now()
    )
    on conflict (
        area_code,
        gold_type,
        price_date
    )
    do update set
        /*
         * Giữ nguyên giá đầu tiên trước khi thay đổi trong ngày.
         */
        old_buy_price_per_chi =
            public.pnj_price_history.old_buy_price_per_chi,

        old_sell_price_per_chi =
            public.pnj_price_history.old_sell_price_per_chi,

        /*
         * Ghi nhận giá mới nhất trong ngày.
         */
        new_buy_price_per_chi =
            excluded.new_buy_price_per_chi,

        new_sell_price_per_chi =
            excluded.new_sell_price_per_chi,

        change_type =
            case
                when
                    public.pnj_price_history.old_buy_price_per_chi
                        is not distinct from
                    excluded.new_buy_price_per_chi
                    and
                    public.pnj_price_history.old_sell_price_per_chi
                        is not distinct from
                    excluded.new_sell_price_per_chi
                then 'UNCHANGED'

                when
                    excluded.new_buy_price_per_chi >
                    public.pnj_price_history.old_buy_price_per_chi
                    and
                    excluded.new_sell_price_per_chi >
                    public.pnj_price_history.old_sell_price_per_chi
                then 'INCREASE'

                when
                    excluded.new_buy_price_per_chi <
                    public.pnj_price_history.old_buy_price_per_chi
                    and
                    excluded.new_sell_price_per_chi <
                    public.pnj_price_history.old_sell_price_per_chi
                then 'DECREASE'

                else excluded.change_type
            end,

        source_updated_at =
            excluded.source_updated_at,

        world_gold_usd_per_oz =
            excluded.world_gold_usd_per_oz,

        world_gold_source =
            excluded.world_gold_source,

        note =
            excluded.note,

        created_at =
            now();

    /*
     * 10. Cập nhật giá PNJ hiện tại.
     */
    update public.pnj_current_price
    set buy_price_per_chi =
            p_buy_price_per_chi,

        sell_price_per_chi =
            p_sell_price_per_chi,

        world_gold_usd_per_oz =
            p_world_gold_usd_per_oz,

        world_gold_source =
            nullif(
                trim(p_world_gold_source),
                ''
            ),

        source_updated_at =
            v_effective_source_updated_at,

        updated_at =
            now()
    where id = v_current.id;

    /*
     * 11. Trả kết quả.
     */
    return jsonb_build_object(
        'changed', true,
        'created', false,
        'changeType', v_change_type,
        'priceDate', v_price_date,
        'message',
            'Đã cập nhật giá PNJ dùng chung và lưu lịch sử',
        'oldBuyPricePerChi',
            v_current.buy_price_per_chi,
        'oldSellPricePerChi',
            v_current.sell_price_per_chi,
        'newBuyPricePerChi',
            p_buy_price_per_chi,
        'newSellPricePerChi',
            p_sell_price_per_chi
    );

exception
    when others then
        raise exception
            'Không thể đồng bộ giá PNJ: %',
            sqlerrm;
end;
$$;


--
-- Name: validate_chat_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_chat_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  last_message_time timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Bạn phải đăng nhập để gửi tin nhắn';
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'Không được gửi tin nhắn thay người khác';
  end if;

  if public.is_chat_banned(auth.uid()) then
    raise exception 'Tài khoản đang bị khóa chức năng chat';
  end if;

  new.content := trim(new.content);

  if char_length(new.content) < 1 then
    raise exception 'Tin nhắn không được để trống';
  end if;

  if char_length(new.content) > 500 then
    raise exception 'Tin nhắn không được vượt quá 500 ký tự';
  end if;

  select created_at
  into last_message_time
  from public.chat_messages
  where user_id = auth.uid()
  order by created_at desc
  limit 1;

  if last_message_time is not null
     and last_message_time > now() - interval '3 seconds'
  then
    raise exception 'Bạn đang gửi tin nhắn quá nhanh';
  end if;

  if new.reply_to_id is not null
     and not exists (
       select 1
       from public.chat_messages
       where id = new.reply_to_id
         and is_deleted = false
         and is_hidden = false
     )
  then
    raise exception 'Tin nhắn được trả lời không tồn tại';
  end if;

  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_admins (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    setting_key text NOT NULL,
    setting_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: chat_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    banned_by uuid NOT NULL,
    reason text,
    banned_at timestamp with time zone DEFAULT now() NOT NULL,
    banned_until timestamp with time zone,
    is_permanent boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    unbanned_by uuid,
    unbanned_at timestamp with time zone,
    CONSTRAINT chat_bans_reason_check CHECK (((reason IS NULL) OR (char_length(reason) <= 500)))
);


--
-- Name: chat_message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_message_reactions (
    id bigint NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_message_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.chat_message_reactions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.chat_message_reactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    reply_to_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    hidden_by uuid,
    hidden_at timestamp with time zone,
    moderation_message text,
    moderated_by uuid,
    moderated_at timestamp with time zone,
    is_recalled boolean DEFAULT false NOT NULL,
    recalled_at timestamp with time zone,
    CONSTRAINT chat_messages_content_check CHECK (((char_length(TRIM(BOTH FROM content)) >= 1) AND (char_length(TRIM(BOTH FROM content)) <= 500)))
);


--
-- Name: chat_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_reactions_reaction_type_check CHECK ((reaction_type = ANY (ARRAY['laugh'::text, 'sad'::text, 'cry'::text, 'angry'::text, 'like'::text, 'dislike'::text])))
);


--
-- Name: chat_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    handled_by uuid,
    handled_at timestamp with time zone,
    admin_note text,
    CONSTRAINT chat_reports_description_check CHECK (((description IS NULL) OR (char_length(description) <= 500))),
    CONSTRAINT chat_reports_reason_check CHECK ((reason = ANY (ARRAY['spam'::text, 'offensive'::text, 'harassment'::text, 'fraud'::text, 'personal_information'::text, 'other'::text]))),
    CONSTRAINT chat_reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'dismissed'::text])))
);


--
-- Name: gold_price_current; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gold_price_current (
    id bigint NOT NULL,
    source_code text NOT NULL,
    product_code text DEFAULT 'GOLD_999'::text NOT NULL,
    buy_price numeric(15,0) NOT NULL,
    sell_price numeric(15,0) NOT NULL,
    source_datetime text,
    source_updated_at timestamp with time zone,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gold_price_current_source_check CHECK ((source_code = ANY (ARRAY['PNJ'::text, 'MI_HONG'::text])))
);


--
-- Name: gold_price_current_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.gold_price_current ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.gold_price_current_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: gold_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gold_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gold_type text NOT NULL,
    price_per_chi numeric(18,2) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    sell_price_per_chi numeric,
    user_id uuid,
    price_date date DEFAULT (timezone('Asia/Ho_Chi_Minh'::text, now()))::date NOT NULL,
    gold_price_id bigint,
    old_buy_price_per_chi bigint,
    old_sell_price_per_chi bigint,
    new_buy_price_per_chi bigint,
    new_sell_price_per_chi bigint,
    source text DEFAULT 'PNJ'::text NOT NULL,
    source_updated_at timestamp with time zone,
    world_gold_usd_per_oz numeric(12,2),
    world_gold_source text,
    CONSTRAINT gold_prices_history_source_check CHECK ((source = ANY (ARRAY['PNJ'::text, 'MI_HONG'::text])))
);


--
-- Name: gold_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gold_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    gold_type text NOT NULL,
    current_price_per_chi numeric(18,2) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sell_price_per_chi numeric,
    source_updated_at timestamp with time zone,
    source text DEFAULT 'PNJ'::text NOT NULL,
    CONSTRAINT gold_prices_current_price_per_chi_check CHECK ((current_price_per_chi > (0)::numeric)),
    CONSTRAINT gold_prices_source_check CHECK ((source = ANY (ARRAY['PNJ'::text, 'MI_HONG'::text])))
);


--
-- Name: gold_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gold_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    transaction_type text NOT NULL,
    gold_type text NOT NULL,
    quantity_chi numeric(12,4) NOT NULL,
    price_per_chi numeric(18,2) NOT NULL,
    fee numeric(18,2) DEFAULT 0 NOT NULL,
    transaction_date date NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    location text,
    sell_price_per_chi numeric,
    CONSTRAINT gold_transactions_price_per_chi_check CHECK ((price_per_chi > (0)::numeric)),
    CONSTRAINT gold_transactions_quantity_chi_check CHECK ((quantity_chi > (0)::numeric)),
    CONSTRAINT gold_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['BUY'::text, 'SELL'::text])))
);


--
-- Name: market_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_news (
    id bigint NOT NULL,
    title text NOT NULL,
    article_url text NOT NULL,
    source_name text NOT NULL,
    summary text,
    image_url text,
    category text DEFAULT 'gold'::text NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT market_news_category_check CHECK ((category = ANY (ARRAY['gold'::text, 'exchange_rate'::text, 'economy'::text])))
);


--
-- Name: market_news_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.market_news ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.market_news_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnj_current_price; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnj_current_price (
    id bigint NOT NULL,
    area_code character varying(30) DEFAULT 'TPHCM'::character varying NOT NULL,
    gold_type character varying(30) DEFAULT 'PNJ'::character varying NOT NULL,
    buy_price_per_chi bigint NOT NULL,
    sell_price_per_chi bigint NOT NULL,
    source_updated_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    world_gold_usd_per_oz numeric,
    world_gold_source text
);


--
-- Name: pnj_current_price_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnj_current_price ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pnj_current_price_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnj_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnj_price_history (
    id bigint NOT NULL,
    area_code character varying(30) DEFAULT 'TPHCM'::character varying NOT NULL,
    gold_type character varying(30) DEFAULT 'PNJ'::character varying NOT NULL,
    old_buy_price_per_chi bigint,
    old_sell_price_per_chi bigint,
    new_buy_price_per_chi bigint NOT NULL,
    new_sell_price_per_chi bigint NOT NULL,
    source_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    world_gold_usd_per_oz numeric,
    world_gold_source text,
    note text,
    change_type text DEFAULT 'SAME'::text,
    price_date date
);


--
-- Name: pnj_price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnj_price_history ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pnj_price_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text DEFAULT 'Thành viên'::text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gold_price_source text DEFAULT 'PNJ'::text NOT NULL,
    CONSTRAINT profiles_gold_price_source_check CHECK ((gold_price_source = ANY (ARRAY['PNJ'::text, 'MI_HONG'::text])))
);


--
-- Name: app_admins app_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_admins
    ADD CONSTRAINT app_admins_pkey PRIMARY KEY (user_id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (setting_key);


--
-- Name: chat_bans chat_bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_bans
    ADD CONSTRAINT chat_bans_pkey PRIMARY KEY (id);


--
-- Name: chat_message_reactions chat_message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reactions
    ADD CONSTRAINT chat_message_reactions_pkey PRIMARY KEY (id);


--
-- Name: chat_message_reactions chat_message_reactions_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reactions
    ADD CONSTRAINT chat_message_reactions_unique UNIQUE (message_id, user_id, reaction);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_reactions chat_reactions_message_id_user_id_reaction_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_message_id_user_id_reaction_type_key UNIQUE (message_id, user_id, reaction_type);


--
-- Name: chat_reactions chat_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_pkey PRIMARY KEY (id);


--
-- Name: chat_reports chat_reports_message_id_reporter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reports
    ADD CONSTRAINT chat_reports_message_id_reporter_id_key UNIQUE (message_id, reporter_id);


--
-- Name: chat_reports chat_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reports
    ADD CONSTRAINT chat_reports_pkey PRIMARY KEY (id);


--
-- Name: gold_price_current gold_price_current_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_price_current
    ADD CONSTRAINT gold_price_current_pkey PRIMARY KEY (id);


--
-- Name: gold_price_current gold_price_current_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_price_current
    ADD CONSTRAINT gold_price_current_unique UNIQUE (source_code, product_code);


--
-- Name: gold_price_history gold_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_price_history
    ADD CONSTRAINT gold_price_history_pkey PRIMARY KEY (id);


--
-- Name: gold_prices gold_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_prices
    ADD CONSTRAINT gold_prices_pkey PRIMARY KEY (id);


--
-- Name: gold_prices gold_prices_user_id_gold_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_prices
    ADD CONSTRAINT gold_prices_user_id_gold_type_key UNIQUE (user_id, gold_type);


--
-- Name: gold_transactions gold_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_transactions
    ADD CONSTRAINT gold_transactions_pkey PRIMARY KEY (id);


--
-- Name: market_news market_news_article_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_news
    ADD CONSTRAINT market_news_article_url_key UNIQUE (article_url);


--
-- Name: market_news market_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_news
    ADD CONSTRAINT market_news_pkey PRIMARY KEY (id);


--
-- Name: pnj_current_price pnj_current_price_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnj_current_price
    ADD CONSTRAINT pnj_current_price_pkey PRIMARY KEY (id);


--
-- Name: pnj_price_history pnj_price_history_area_gold_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnj_price_history
    ADD CONSTRAINT pnj_price_history_area_gold_date_key UNIQUE (area_code, gold_type, price_date);


--
-- Name: pnj_price_history pnj_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnj_price_history
    ADD CONSTRAINT pnj_price_history_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: pnj_current_price uq_pnj_current_price; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnj_current_price
    ADD CONSTRAINT uq_pnj_current_price UNIQUE (area_code, gold_type);


--
-- Name: gold_price_history_user_gold_type_source_price_date_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX gold_price_history_user_gold_type_source_price_date_uidx ON public.gold_price_history USING btree (user_id, gold_type, source, price_date);


--
-- Name: gold_prices_gold_type_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX gold_prices_gold_type_unique ON public.gold_prices USING btree (gold_type);


--
-- Name: idx_chat_bans_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_bans_user_active ON public.chat_bans USING btree (user_id, is_active);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_chat_messages_reply_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_reply_to ON public.chat_messages USING btree (reply_to_id);


--
-- Name: idx_chat_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_user_id ON public.chat_messages USING btree (user_id);


--
-- Name: idx_chat_reactions_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_reactions_message ON public.chat_reactions USING btree (message_id);


--
-- Name: idx_chat_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_reports_status ON public.chat_reports USING btree (status, created_at DESC);


--
-- Name: idx_gold_price_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gold_price_history_created_at ON public.gold_price_history USING btree (gold_type, created_at DESC);


--
-- Name: idx_gold_price_history_user_source_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gold_price_history_user_source_created ON public.gold_price_history USING btree (user_id, source, created_at DESC);


--
-- Name: idx_market_news_category_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_news_category_published ON public.market_news USING btree (category, published_at DESC);


--
-- Name: idx_pnj_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pnj_history_created_at ON public.pnj_price_history USING btree (area_code, gold_type, created_at DESC);


--
-- Name: idx_pnj_price_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pnj_price_history_created_at ON public.pnj_price_history USING btree (area_code, gold_type, created_at DESC);


--
-- Name: uq_gold_prices_gold_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_gold_prices_gold_type ON public.gold_prices USING btree (gold_type);


--
-- Name: ux_pnj_price_history_daily; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_pnj_price_history_daily ON public.pnj_price_history USING btree (area_code, gold_type, price_date);


--
-- Name: chat_messages trigger_validate_chat_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_chat_message BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.validate_chat_message();


--
-- Name: app_admins app_admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_admins
    ADD CONSTRAINT app_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: app_settings app_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: chat_bans chat_bans_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_bans
    ADD CONSTRAINT chat_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_bans chat_bans_unbanned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_bans
    ADD CONSTRAINT chat_bans_unbanned_by_fkey FOREIGN KEY (unbanned_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_bans chat_bans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_bans
    ADD CONSTRAINT chat_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_message_reactions chat_message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reactions
    ADD CONSTRAINT chat_message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_message_reactions chat_message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reactions
    ADD CONSTRAINT chat_message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_hidden_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_moderated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_reactions chat_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_reactions chat_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_reports chat_reports_handled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reports
    ADD CONSTRAINT chat_reports_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_reports chat_reports_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reports
    ADD CONSTRAINT chat_reports_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_reports chat_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reports
    ADD CONSTRAINT chat_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_reports chat_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reports
    ADD CONSTRAINT chat_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: gold_prices gold_prices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_prices
    ADD CONSTRAINT gold_prices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gold_transactions gold_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_transactions
    ADD CONSTRAINT gold_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_reports Admins can read chat reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read chat reports" ON public.chat_reports FOR SELECT TO authenticated USING (public.is_app_admin());


--
-- Name: app_settings Admins can update app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update app settings" ON public.app_settings FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.app_admins a
  WHERE (a.user_id = auth.uid())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.app_admins a
  WHERE (a.user_id = auth.uid()))));


--
-- Name: gold_price_history Allow public insert price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert price history" ON public.gold_price_history FOR INSERT TO anon WITH CHECK (true);


--
-- Name: gold_price_history Allow public select price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public select price history" ON public.gold_price_history FOR SELECT TO anon USING (true);


--
-- Name: market_news Anyone can read market news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read market news" ON public.market_news FOR SELECT TO authenticated, anon USING (true);


--
-- Name: chat_messages Authenticated users can read chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read chat" ON public.chat_messages FOR SELECT TO authenticated USING (((is_hidden = false) OR public.is_app_admin()));


--
-- Name: gold_price_history Authenticated users can read gold price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read gold price history" ON public.gold_price_history FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Authenticated users can read profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: chat_message_reactions Authenticated users can read reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read reactions" ON public.chat_message_reactions FOR SELECT TO authenticated USING (true);


--
-- Name: chat_reactions Authenticated users can read reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read reactions" ON public.chat_reactions FOR SELECT TO authenticated USING (true);


--
-- Name: pnj_price_history Authenticated users can view PNJ price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view PNJ price history" ON public.pnj_price_history FOR SELECT TO authenticated USING (true);


--
-- Name: pnj_current_price Authenticated users read PNJ current price; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users read PNJ current price" ON public.pnj_current_price FOR SELECT TO authenticated USING (true);


--
-- Name: pnj_price_history Authenticated users read PNJ history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users read PNJ history" ON public.pnj_price_history FOR SELECT TO authenticated USING (true);


--
-- Name: app_settings Everyone can read app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can read app settings" ON public.app_settings FOR SELECT TO authenticated, anon USING (true);


--
-- Name: chat_message_reactions Users can add own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add own reactions" ON public.chat_message_reactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_reactions Users can add own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add own reactions" ON public.chat_reactions FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (public.is_chat_banned() = false)));


--
-- Name: app_admins Users can check own admin status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can check own admin status" ON public.app_admins FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.chat_reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: gold_price_history Users can delete own gold price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own gold price history" ON public.gold_price_history FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: gold_prices Users can delete own gold prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own gold prices" ON public.gold_prices FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: gold_transactions Users can delete own gold transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own gold transactions" ON public.gold_transactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can delete own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: gold_price_history Users can delete own price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own price history" ON public.gold_price_history FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: gold_prices Users can delete own prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own prices" ON public.gold_prices FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: gold_transactions Users can delete own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own transactions" ON public.gold_transactions FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: gold_prices Users can insert own gold prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own gold prices" ON public.gold_prices FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: gold_transactions Users can insert own gold transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own gold transactions" ON public.gold_transactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: gold_price_history Users can insert own price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own price history" ON public.gold_price_history FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: gold_prices Users can insert own prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own prices" ON public.gold_prices FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: gold_transactions Users can insert own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own transactions" ON public.gold_transactions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: chat_bans Users can read own active chat ban; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own active chat ban" ON public.chat_bans FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_app_admin()));


--
-- Name: gold_price_history Users can read own price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own price history" ON public.gold_price_history FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: gold_prices Users can read own prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own prices" ON public.gold_prices FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: chat_reports Users can read own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own reports" ON public.chat_reports FOR SELECT TO authenticated USING (((auth.uid() = reporter_id) OR public.is_app_admin()));


--
-- Name: gold_transactions Users can read own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own transactions" ON public.gold_transactions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: chat_message_reactions Users can remove own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove own reactions" ON public.chat_message_reactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_reactions Users can remove own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove own reactions" ON public.chat_reactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can send own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id) AND (public.is_chat_banned() = false)));


--
-- Name: gold_prices Users can update own gold prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own gold prices" ON public.gold_prices FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: gold_transactions Users can update own gold transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own gold transactions" ON public.gold_transactions FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: gold_price_history Users can update own price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own price history" ON public.gold_price_history FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: gold_prices Users can update own prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own prices" ON public.gold_prices FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: gold_transactions Users can update own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own transactions" ON public.gold_transactions FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: gold_prices Users can view own gold prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own gold prices" ON public.gold_prices FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: gold_transactions Users can view own gold transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own gold transactions" ON public.gold_transactions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: gold_price_history Users can view own price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own price history" ON public.gold_price_history FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: app_admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_bans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_message_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: gold_price_current; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gold_price_current ENABLE ROW LEVEL SECURITY;

--
-- Name: gold_price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gold_price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: gold_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gold_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: gold_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gold_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: market_news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

--
-- Name: pnj_current_price; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnj_current_price ENABLE ROW LEVEL SECURITY;

--
-- Name: pnj_price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnj_price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict idvESJPABdE47AMJHgzXKlQfCd60Qns7urugfKbzlFRjmLA3V3u6zaIwdsdPHyD

