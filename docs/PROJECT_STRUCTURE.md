# Gold Tracker - Project Structure

## Tổng quan

Gold Tracker là ứng dụng theo dõi giá vàng, lịch sử giao dịch, tin tức kinh tế và hỗ trợ trao đổi giữa người dùng.

Công nghệ chính:

- React
- Vite
- Supabase
- Supabase Edge Functions
- Supabase Realtime
- TradingView Widget

---

## Thư mục gốc

```text
gold-tracker/
├── public/
├── src/
├── supabase/
├── docs/
├── .env
├── .env.local
├── package.json
├── vite.config.js
└── vercel.json

src/

Chứa toàn bộ mã nguồn frontend của ứng dụng.

src/App.jsx

Component chính của ứng dụng.

Quản lý và hiển thị các khu vực chính như:

Header
Giá vàng
Giá vàng thế giới
Tổng quan giá
Lịch sử giá
Tin tức thị trường
Chat công khai
Trợ lý AI
Trung tâm trợ giúp
Footer
src/App.css

CSS tổng thể của ứng dụng.

Bao gồm:

Biến màu
Light mode
Dark mode
Layout chung
Header
Footer
Responsive
src/main.jsx

Điểm khởi chạy của ứng dụng React.

src/supabaseClient.js

Khởi tạo Supabase Client từ các biến môi trường.

src/assets/

Chứa:

Hình ảnh
Icon
GIF
Tài nguyên giao diện
src/components/

Chứa các React component của ứng dụng.

components/ai-chat/

Chức năng trợ lý AI.

File chính:

AIChatPage.jsx
AIChatPage.css

Mục đích:

Hiển thị giao diện trò chuyện với AI
Nhận câu hỏi từ người dùng
Hiển thị câu trả lời của AI
components/help/

Chức năng trung tâm trợ giúp.

Mục đích:

Hiển thị hướng dẫn sử dụng
FAQ
Thông tin liên hệ
Giới thiệu ứng dụng
components/market-news/

Chức năng tin tức thị trường.

File:

MarketNews.jsx
MarketNews.css

Mục đích:

Đọc dữ liệu từ bảng market_news
Hiển thị tối đa 10 tin mới nhất
Hiển thị ảnh, tiêu đề, mô tả và thời gian đăng
Hiển thị thời gian đồng bộ gần nhất

Nguồn dữ liệu:

VnEconomy RSS
    ↓
Supabase Edge Function
    ↓
market_news
    ↓
MarketNews.jsx
components/public-chat/

Chức năng chat công khai.

Các file chính:

PublicChat.jsx
PublicChat.css
ChatComposer.jsx
ChatMessageItem.jsx
ChatMessageList.jsx
ChatReactionPicker.jsx
ChatAdminModal.jsx
ChatRemoveModal.jsx
ChatReportModal.jsx
ChatReportsAdmin.jsx

Mục đích:

Gửi và nhận tin nhắn
Cập nhật tin nhắn realtime
Thả reaction
Báo cáo tin nhắn
Quản lý chat dành cho admin
Xóa tin nhắn vi phạm

Các component chức năng khác
AdminUserManager.jsx

Quản lý người dùng dành cho admin.

AppHeader.jsx

Header chính của ứng dụng.

ChangeAvatar.jsx

Thay đổi ảnh đại diện.

ChangeDisplayNameModal.jsx

Thay đổi tên hiển thị.

ChangePassword.jsx

Thay đổi mật khẩu.

ConfirmModal.jsx

Modal xác nhận dùng chung.

CurrentPriceForm.jsx

Nhập hoặc cập nhật giá vàng hiện tại.

LocalGoldChart.jsx

Biểu đồ giá vàng trong nước.

Login.jsx

Giao diện đăng nhập.

MaintenanceControl.jsx

Điều khiển chế độ bảo trì.

MaintenanceScreen.jsx

Màn hình hiển thị khi ứng dụng đang bảo trì.

OAuthCallback.jsx

Xử lý callback sau khi đăng nhập OAuth.

PriceHistoryTable.jsx

Hiển thị lịch sử giá vàng PNJ.

PriceWithChange.jsx

Hiển thị giá và mức thay đổi.

SummaryCards.jsx

Hiển thị các thẻ tổng quan.

Toast.jsx

Hiển thị một thông báo.

ToastContainer.jsx

Quản lý danh sách thông báo.

TradingViewGoldChart.jsx

Biểu đồ vàng từ TradingView.

TradingViewGoldPriceWidget.jsx

Widget giá vàng từ TradingView.

TransactionForm.jsx

Form nhập giao dịch.

TransactionTable.jsx

Danh sách giao dịch.

WorldGoldComparison.jsx

So sánh giá vàng thế giới và trong nước.

WorldGoldMiniWidget.jsx

Widget nhỏ hiển thị giá vàng thế giới.

src/hooks/

Chứa các custom hook dùng chung.

useChatPresence.js

Quản lý trạng thái online trong chat.

useConfirm.js

Quản lý modal xác nhận.

useGoldData.js

Lấy và xử lý dữ liệu giá vàng.

useGoldSummary.js

Tính toán dữ liệu tổng quan.

useMaintenanceMode.js

Theo dõi chế độ bảo trì.

usePriceChartData.js

Chuẩn bị dữ liệu biểu đồ giá.

usePriceHistoryPagination.js

Phân trang lịch sử giá.

usePublicChat.js

Xử lý logic chat công khai và Supabase Realtime.

useToast.js

Hiển thị thông báo toast.

useWorldGold.js

Lấy dữ liệu giá vàng thế giới.

src/pages/

Chứa các component cấp trang.

src/services/

Chứa các hàm giao tiếp với:

Supabase Database
Supabase Edge Functions
API bên ngoài

Service không nên chứa giao diện React.

src/utils/

Chứa các hàm tiện ích dùng chung như:

Định dạng tiền
Định dạng ngày giờ
Xử lý số
Chuẩn hóa dữ liệu
Kiểm tra dữ liệu
supabase/

Chứa cấu hình Supabase và Edge Functions.

Các Edge Function hiện có hoặc đã triển khai:

Đồng bộ tin tức VnEconomy
Lấy tỷ giá Vietcombank
Các function hỗ trợ dữ liệu khác
Khi cần sửa chức năng
Chức năng	Vị trí
AI Chat	src/components/ai-chat/
Tin tức	src/components/market-news/
Chat công khai	src/components/public-chat/
Help Center	src/components/help/
Giá vàng	src/components/ và src/hooks/useGoldData.js
Giá vàng thế giới	src/hooks/useWorldGold.js
Lịch sử giá	PriceHistoryTable.jsx
Biểu đồ	LocalGoldChart.jsx, TradingViewGoldChart.jsx
Bảo trì	MaintenanceControl.jsx, MaintenanceScreen.jsx
Toast	Toast.jsx, ToastContainer.jsx, useToast.js
Supabase	src/supabaseClient.js