import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LockKeyhole,
  RefreshCw,
  Search,
  UnlockKeyhole,
  Users,
  X,
} from "lucide-react";

import {
  getAdminUsers,
  lockAdminUser,
  unlockAdminUser,
} from "../services/adminUserService";

/*
 * Phải trùng với allowedBanDurations
 * trong Edge Function admin-users.
 */
const LOCK_DURATION_OPTIONS = [
  {
    value: "1h",
    label: "1 giờ",
  },
  {
    value: "24h",
    label: "1 ngày",
  },
  {
    value: "168h",
    label: "7 ngày",
  },
  {
    value: "720h",
    label: "30 ngày",
  },
  {
    value: "876000h",
    label: "Đến khi mở thủ công",
  },
];

const DEFAULT_LOCK_DURATION = "168h";

function formatDateTime(
  value,
  emptyText = "-",
) {
  if (!value) {
    return emptyText;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    },
  ).format(date);
}

function getLockDurationLabel(
  duration,
) {
  return (
    LOCK_DURATION_OPTIONS.find(
      (option) =>
        option.value === duration,
    )?.label || duration
  );
}

export default function AdminUserManager({
  confirm,
  onClose,
}) {
  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionUserId,
    setActionUserId,
  ] = useState("");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  /*
   * Lưu thời gian khóa riêng cho từng người dùng.
   */
  const [
    lockDurations,
    setLockDurations,
  ] = useState({});

  const loadUsers =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const result =
          await getAdminUsers({
            page: 1,
            perPage: 100,
          });

        setUsers(
          result.users ?? [],
        );
      } catch (err) {
        console.error(
          "Lỗi tải danh sách người dùng:",
          err,
        );

        setError(
          err?.message ||
            "Không thể tải danh sách người dùng.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers =
    useMemo(() => {
      const keyword =
        searchText
          .trim()
          .toLowerCase();

      if (!keyword) {
        return users;
      }

      return users.filter(
        (item) =>
          item.email
            ?.toLowerCase()
            .includes(keyword) ||
          item.displayName
            ?.toLowerCase()
            .includes(keyword),
      );
    }, [
      users,
      searchText,
    ]);

  function getSelectedLockDuration(
    userId,
  ) {
    return (
      lockDurations[userId] ||
      DEFAULT_LOCK_DURATION
    );
  }

  function handleLockDurationChange(
    userId,
    duration,
  ) {
    setLockDurations(
      (current) => ({
        ...current,
        [userId]: duration,
      }),
    );
  }

  async function handleToggleLock(
    user,
  ) {
    const selectedDuration =
      getSelectedLockDuration(
        user.id,
      );

    const durationLabel =
      getLockDurationLabel(
        selectedDuration,
      );

    const confirmMessage =
      user.isBanned ? (
        <>
          Bạn có chắc muốn mở khóa tài khoản{" "}
          <strong>
            {user.email}
          </strong>
          ?
          <br />
          Người dùng sẽ có thể đăng nhập lại ngay sau khi
          được mở khóa.
        </>
      ) : (
        <>
          Bạn có chắc muốn khóa tài khoản{" "}
          <strong>
            {user.email}
          </strong>{" "}
          trong{" "}
          <strong>
            {durationLabel}
          </strong>
          ?
          <br />
          Trong thời gian này, người dùng sẽ không thể đăng
          nhập vào hệ thống.
        </>
      );

    const confirmed =
      await confirm({
        title: user.isBanned
          ? "Mở khóa tài khoản?"
          : "Khóa tài khoản?",

        message: confirmMessage,

        confirmText: user.isBanned
          ? "Mở khóa"
          : "Khóa tài khoản",

        cancelText: "Hủy",

        type: user.isBanned
          ? "warning"
          : "danger",

        icon: user.isBanned
          ? "unlock"
          : "lock",
      });

    if (!confirmed) {
      return;
    }

    try {
      setActionUserId(
        user.id,
      );

      setError("");

      if (user.isBanned) {
        await unlockAdminUser(
          user.id,
        );
      } else {
        await lockAdminUser(
          user.id,
          selectedDuration,
        );
      }

      await loadUsers();
    } catch (err) {
      console.error(
        "Lỗi cập nhật tài khoản:",
        err,
      );

      setError(
        err?.message ||
          "Không thể cập nhật tài khoản.",
      );
    } finally {
      setActionUserId("");
    }
  }

  return (
    <section className="admin-user-manager">
      <div className="admin-user-manager__header">
        <div>
          <h3>
            <Users size={20} />
            Quản lý người dùng
          </h3>

          <p>
            Xem tài khoản, thời gian đăng nhập gần nhất
            và khóa hoặc mở khóa người dùng.
          </p>
        </div>

        <button
          type="button"
          className="admin-user-manager__close"
          onClick={onClose}
          title="Đóng"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>
      </div>

      <div className="admin-user-manager__toolbar">
        <div className="admin-user-manager__search">
          <Search size={17} />

          <input
            type="text"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value,
              )
            }
            placeholder="Tìm theo tên hoặc email"
          />
        </div>

        <button
          type="button"
          className="admin-user-manager__refresh"
          onClick={loadUsers}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "is-spinning"
                : ""
            }
          />

          Làm mới
        </button>
      </div>

      {error && (
        <div className="admin-user-manager__error">
          {error}
        </div>
      )}

      <div className="admin-user-manager__table-wrapper">
        <table className="admin-user-manager__table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Ngày tạo</th>
              <th>Đăng nhập gần nhất</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-user-manager__empty">
                    Đang tải danh sách người dùng...
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-user-manager__empty">
                    Không tìm thấy người dùng.
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map(
                (item) => {
                  const isProcessing =
                    actionUserId ===
                    item.id;

                  const selectedDuration =
                    getSelectedLockDuration(
                      item.id,
                    );

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-user-manager__identity">
                          <div className="admin-user-manager__avatar">
                            {item.avatarUrl ? (
                              <img
                                src={item.avatarUrl}
                                alt={`Ảnh đại diện của ${
                                  item.displayName ||
                                  item.email
                                }`}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>
                                {(
                                  item.displayName ||
                                  item.email ||
                                  "U"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="admin-user-manager__user-text">
                            <strong className="admin-user-manager__name">
                              {item.displayName ||
                                "Chưa đặt tên"}
                            </strong>

                            <span className="admin-user-manager__email">
                              {item.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {formatDateTime(
                          item.createdAt,
                        )}
                      </td>

                      <td>
                        {formatDateTime(
                          item.lastSignInAt,
                          "Chưa đăng nhập",
                        )}
                      </td>

                      <td>
                        <div className="admin-user-manager__status-wrapper">
                          <span
                            className={
                              item.isBanned
                                ? "admin-user-status admin-user-status--locked"
                                : "admin-user-status admin-user-status--active"
                            }
                          >
                            {item.isBanned
                              ? "Đã khóa"
                              : "Hoạt động"}
                          </span>

                          {item.isBanned &&
                            item.bannedUntil && (
                              <small className="admin-user-manager__banned-until">
                                - Đến:{" "}
                                {formatDateTime(
                                  item.bannedUntil,
                                )}
                              </small>
                            )}
                        </div>
                      </td>

                      <td>
                        <div className="admin-user-manager__actions">
                          {!item.isBanned && (
                            <select
                              className="admin-user-manager__lock-duration"
                              value={
                                selectedDuration
                              }
                              onChange={(
                                event,
                              ) =>
                                handleLockDurationChange(
                                  item.id,
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                isProcessing ||
                                item.isCurrentUser
                              }
                              title="Chọn thời gian khóa"
                              aria-label={`Chọn thời gian khóa cho ${item.email}`}
                            >
                              {LOCK_DURATION_OPTIONS.map(
                                (
                                  option,
                                ) => (
                                  <option
                                    key={
                                      option.value
                                    }
                                    value={
                                      option.value
                                    }
                                  >
                                    {
                                      option.label
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          )}

                          <button
                            type="button"
                            className={
                              item.isBanned
                                ? "admin-user-action admin-user-action--unlock"
                                : "admin-user-action admin-user-action--lock"
                            }
                            onClick={() =>
                              handleToggleLock(
                                item,
                              )
                            }
                            disabled={
                              isProcessing ||
                              item.isCurrentUser
                            }
                            title={
                              item.isCurrentUser
                                ? "Không thể tự khóa tài khoản đang đăng nhập"
                                : item.isBanned
                                  ? "Mở khóa tài khoản"
                                  : `Khóa tài khoản trong ${getLockDurationLabel(
                                      selectedDuration,
                                    )}`
                            }
                          >
                            {item.isBanned ? (
                              <UnlockKeyhole
                                size={16}
                              />
                            ) : (
                              <LockKeyhole
                                size={16}
                              />
                            )}

                            {isProcessing
                              ? "Đang xử lý..."
                              : item.isBanned
                                ? "Mở khóa"
                                : "Khóa"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                },
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}