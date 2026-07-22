export function formatChatTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  const messageTime = new Date(dateValue).getTime();

  if (Number.isNaN(messageTime)) {
    return "";
  }

  const differenceMilliseconds =
    Date.now() - messageTime;

  const differenceMinutes = Math.max(
    0,
    Math.floor(
      differenceMilliseconds / 60000
    )
  );

  if (differenceMinutes < 1) {
    return "Vừa xong";
  }

  if (differenceMinutes < 60) {
    return `${differenceMinutes} phút trước`;
  }

  const differenceHours = Math.floor(
    differenceMinutes / 60
  );

  if (differenceHours < 24) {
    return `${differenceHours} giờ trước`;
  }

  const differenceDays = Math.floor(
    differenceHours / 24
  );

  if (differenceDays < 30) {
    return `${differenceDays} ngày trước`;
  }

  return new Date(dateValue).toLocaleString(
    "vi-VN"
  );
}