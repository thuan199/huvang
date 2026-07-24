# Gold Tracker - Database

## Tổng quan

Ứng dụng sử dụng Supabase PostgreSQL làm cơ sở dữ liệu.

Các chức năng chính sử dụng database:

- Giá vàng
- Lịch sử giá
- Giao dịch
- Chat công khai
- Reaction
- Báo cáo tin nhắn
- Tin tức thị trường
- Tài khoản người dùng
- Chế độ bảo trì

---

## market_news

Lưu tin tức thị trường lấy từ VnEconomy.

Các cột chính:

- `id`
- `title`
- `article_url`
- `source_name`
- `summary`
- `image_url`
- `category`
- `published_at`
- `created_at`
- `updated_at`

Luồng dữ liệu:

```text
VnEconomy RSS
    ↓
market-news-sync
    ↓
market_news
    ↓
MarketNews.jsx

Quy tắc:

article_url là duy nhất
Chỉ giữ tối đa 10 bài mới nhất
Dữ liệu được đồng bộ bằng Cron Job
updated_at dùng để xác định lần đồng bộ gần nhất
public_chat_messages

Lưu tin nhắn trong chat công khai.

Mục đích:

Lưu nội dung tin nhắn
Xác định người gửi
Lưu thời gian gửi
Phục vụ Supabase Realtime
Hỗ trợ admin kiểm duyệt
chat_message_reactions

Lưu reaction của người dùng đối với tin nhắn.

Quan hệ:

User
    ↓
Message
    ↓
Emoji reaction

Mục đích:

Thả emoji cho tin nhắn
Hiển thị số lượng reaction
Hiển thị danh sách người đã reaction
Chat reports

Lưu các báo cáo tin nhắn vi phạm.

Mục đích:

Người dùng báo cáo tin nhắn
Admin xem danh sách báo cáo
Admin quyết định xóa hoặc giữ tin nhắn

Tên bảng chính xác cần kiểm tra lại trong Supabase.

Gold price data

Lưu dữ liệu giá vàng và lịch sử thay đổi.

Tên bảng và cấu trúc chi tiết cần bổ sung sau khi kiểm tra trong Supabase.

Transactions

Lưu giao dịch mua hoặc bán vàng của người dùng.

Tên bảng và cấu trúc chi tiết cần bổ sung sau khi kiểm tra trong Supabase.

User profile

Lưu thông tin hồ sơ người dùng như:

Tên hiển thị
Avatar
Quyền người dùng
Trạng thái tài khoản

Tên bảng và cấu trúc chi tiết cần bổ sung sau khi kiểm tra trong Supabase.

Row Level Security

Các bảng Supabase cần bật RLS.

Nguyên tắc chung:

Người dùng chỉ được sửa dữ liệu của mình
Người dùng được đọc dữ liệu công khai
Admin có quyền quản lý dữ liệu
Edge Function sử dụng service_role khi cần quyền cao hơn
Ghi chú cập nhật

Khi thêm bảng mới, ghi theo mẫu:

## ten_bang

Mục đích:

Các cột chính:

Quan hệ:

RLS:

Được sử dụng tại: