# Gold Tracker - Architecture

## Tổng quan kiến trúc

```text
Browser
   ↓
React + Vite
   ↓
Supabase Client
   ↓
Supabase Database / Realtime / Edge Functions
   ↓
Nguồn dữ liệu bên ngoài

Luồng giá vàng
Nguồn giá vàng
    ↓
Service hoặc Supabase
    ↓
useGoldData
    ↓
SummaryCards
    ↓
CurrentPriceForm
    ↓
LocalGoldChart
    ↓
PriceHistoryTable

Luồng giá vàng thế giới
Vietcombank XML hoặc nguồn tỷ giá
    ↓
Supabase Edge Function
    ↓
useWorldGold
    ↓
WorldGoldMiniWidget
    ↓
WorldGoldComparison

Luồng tin tức
VnEconomy RSS
    ↓
market-news-sync
    ↓
Lọc và chuẩn hóa dữ liệu
    ↓
Upsert market_news
    ↓
Giữ 10 bài mới nhất
    ↓
MarketNews.jsx
Cron Job chạy định kỳ để cập nhật dữ liệu.

Khi không có bài mới:

Các bài cũ vẫn được giữ lại
Thời gian đồng bộ được cập nhật
Giao diện vẫn hiển thị 10 bài gần nhất

Luồng chat công khai
User A
    ↓
ChatComposer
    ↓
Supabase Database
    ↓
Supabase Realtime
    ↓
ChatMessageList
    ↓
User B

Luồng reaction
User
    ↓
ChatReactionPicker
    ↓
chat_message_reactions
    ↓
Supabase Realtime
    ↓
ChatMessageItem

Luồng báo cáo tin nhắn
User
    ↓
ChatReportModal
    ↓
Bảng báo cáo
    ↓
ChatReportsAdmin
    ↓
Admin xử lý

Luồng AI Chat
User
    ↓
AIChatPage
    ↓
API hoặc Edge Function
    ↓
AI model
    ↓
AIChatPage

Luồng đăng nhập
User
    ↓
Login.jsx
    ↓
Supabase Auth
    ↓
OAuthCallback.jsx
    ↓
Application

Chế độ bảo trì
Admin
    ↓
MaintenanceControl
    ↓
Supabase
    ↓
useMaintenanceMode
    ↓
MaintenanceScreen

Phân chia trách nhiệm
Component

Chỉ chịu trách nhiệm hiển thị giao diện và xử lý sự kiện UI.

Hook

Chứa state và logic dùng lại.

Service

Giao tiếp với database, Edge Function hoặc API.

Utils

Chứa hàm xử lý dữ liệu không phụ thuộc React.

Supabase

Phụ trách:

Database
Authentication
Realtime
Edge Functions
Cron Job