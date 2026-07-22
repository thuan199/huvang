export const CHAT_MESSAGE_LIMIT = 100;

export const CHAT_MAX_LENGTH = 500;

export const CHAT_SEND_COOLDOWN = 3000;

export const CHAT_REACTIONS = [
  {
    type: "laugh",
    icon: "😆",
    label: "Cười",
  },
  {
    type: "sad",
    icon: "😔",
    label: "Buồn",
  },
  {
    type: "cry",
    icon: "😭",
    label: "Khóc",
  },
  {
    type: "angry",
    icon: "😡",
    label: "Phẫn nộ",
  },
  {
    type: "like",
    icon: "👍",
    label: "Thích",
  },
  {
    type: "dislike",
    icon: "👎",
    label: "Không thích",
  },
];

export const CHAT_BAN_DURATIONS = [
  {
    value: "1h",
    label: "1 giờ",
  },
  {
    value: "3h",
    label: "3 giờ",
  },
  {
    value: "12h",
    label: "12 giờ",
  },
  {
    value: "1d",
    label: "1 ngày",
  },
  {
    value: "3d",
    label: "3 ngày",
  },
  {
    value: "7d",
    label: "7 ngày",
  },
  {
    value: "1m",
    label: "1 tháng",
  },
  {
    value: "permanent",
    label: "Vĩnh viễn",
  },
];

export const CHAT_REPORT_REASONS = [
  {
    value: "spam",
    label: "Spam",
  },
  {
    value: "offensive",
    label: "Nội dung xúc phạm",
  },
  {
    value: "harassment",
    label: "Quấy rối",
  },
  {
    value: "fraud",
    label: "Lừa đảo",
  },
  {
    value: "personal_information",
    label: "Tiết lộ thông tin cá nhân",
  },
  {
    value: "other",
    label: "Lý do khác",
  },
];