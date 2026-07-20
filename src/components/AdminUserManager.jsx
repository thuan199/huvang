import {
  useCallback,
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

const STATUS_FILTER_OPTIONS = [
  {
    value: "all",
    label: "Tất cả",
  },
  {
    value: "active",
    label: "Hoạt động",
  },
  {
    value: "banned",
    label: "Đã khóa",
  },
];

function formatDateTime(
  value,
  emptyText = "-",
) {
  if (!value) {
    return emptyText;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return emptyText;
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Asia/Ho_Chi_Minh",
    },
  ).format(date);
}

function getLockDurationLabel(
  duration,
) {
  return (
    LOCK_DURATION_OPTIONS.find(
      (option) =>
        option.value ===
        duration,
    )?.label || duration
  );
}

/*
 * Tạo thời gian hết khóa tạm thời ở frontend.
 *
 * Dùng trong trường hợp service không trả về bannedUntil.
 */
function createLocalBannedUntil(
  duration,
) {
  const matched =
    /^(\d+)h$/.exec(
      String(duration),
    );

  if (!matched) {
    return null;
  }

  const hours =
    Number(matched[1]);

  if (
    !Number.isFinite(hours) ||
    hours <= 0
  ) {
    return null;
  }

  return new Date(
    Date.now() +
      hours *
        60 *
        60 *
        1000,
  ).toISOString();
}

function isUserCurrentlyBanned(
  user,
) {
  if (!user?.bannedUntil) {
    return false;
  }

  const bannedUntilTime =
    new Date(
      user.bannedUntil,
    ).getTime();

  return (
    Number.isFinite(
      bannedUntilTime,
    ) &&
    bannedUntilTime >
      Date.now()
  );
}

export default function AdminUserManager({
  confirm,
  showToast,
  onClose,
}) {
  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    hasLoaded,
    setHasLoaded,
  ] = useState(false);

  const [
    actionUserId,
    setActionUserId,
  ] = useState("");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    error,
    setError,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    perPage,
    setPerPage,
  ] = useState(10);

  const [
    totalUsers,
    setTotalUsers,
  ] = useState(0);

  /*
   * Trang đã được tải gần nhất.
   *
   * currentPage có thể thay đổi khi bấm Trang trước/Trang sau,
   * nhưng dữ liệu chỉ tải khi bấm Làm mới.
   */
  const [
    loadedPage,
    setLoadedPage,
  ] = useState(0);

  /*
   * Số dòng đã được tải gần nhất.
   */
  const [
    loadedPerPage,
    setLoadedPerPage,
  ] = useState(0);

  /*
   * Lưu thời gian khóa được chọn riêng
   * cho từng người dùng.
   */
  const [
    lockDurations,
    setLockDurations,
  ] = useState({});

  /*
   * Hàm này chỉ được gọi khi người dùng
   * chủ động bấm nút Làm mới.
   */
  const loadUsers =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const result =
            await getAdminUsers({
              page: currentPage,
              perPage,
            });

          const nextUsers =
            Array.isArray(
              result?.users,
            )
              ? result.users
              : [];

          setUsers(
            nextUsers,
          );

          setTotalUsers(
            Number(
              result?.total ?? 0,
            ),
          );

          setLoadedPage(
            currentPage,
          );

          setLoadedPerPage(
            perPage,
          );

          setHasLoaded(true);
        } catch (err) {
          console.error(
            "Lỗi tải danh sách người dùng:",
            err,
          );

          const errorMessage =
            err?.message ||
            "Không thể tải danh sách người dùng.";

          setError(
            errorMessage,
          );

          showToast?.(
            errorMessage,
            "error",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        currentPage,
        perPage,
        showToast,
      ],
    );

  const filteredUsers =
    useMemo(() => {
      const keyword =
        searchText
          .trim()
          .toLowerCase();

      return users.filter(
        (item) => {
          const email =
            String(
              item?.email ?? "",
            ).toLowerCase();

          const displayName =
            String(
              item?.displayName ??
                "",
            ).toLowerCase();

          const phone =
            String(
              item?.phone ?? "",
            ).toLowerCase();

          const matchesSearch =
            !keyword ||
            email.includes(
              keyword,
            ) ||
            displayName.includes(
              keyword,
            ) ||
            phone.includes(
              keyword,
            );

          const isBanned =
            isUserCurrentlyBanned(
              item,
            );

          const matchesStatus =
            statusFilter ===
              "all" ||
            (
              statusFilter ===
                "active" &&
              !isBanned
            ) ||
            (
              statusFilter ===
                "banned" &&
              isBanned
            ) ||
            (
              statusFilter ===
                "admin" &&
              Boolean(
                item?.isAdmin,
              )
            );

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      users,
      searchText,
      statusFilter,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalUsers /
          perPage,
      ),
    );

  const startItem =
    !hasLoaded ||
    totalUsers === 0
      ? 0
      : (
          loadedPage - 1
        ) *
          loadedPerPage +
        1;

  const endItem =
    !hasLoaded
      ? 0
      : Math.min(
          loadedPage *
            loadedPerPage,
          totalUsers,
        );

  /*
   * true khi người dùng đã chọn trang hoặc số dòng mới
   * nhưng chưa bấm Làm mới.
   */
  const hasPendingPagination =
    hasLoaded &&
    (
      currentPage !==
        loadedPage ||
      perPage !==
        loadedPerPage
    );

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
        [userId]:
          duration,
      }),
    );
  }

  function handlePreviousPage() {
    setCurrentPage(
      (current) =>
        Math.max(
          1,
          current - 1,
        ),
    );
  }

  function handleNextPage() {
    setCurrentPage(
      (current) =>
        Math.min(
          totalPages,
          current + 1,
        ),
    );
  }

  function handlePerPageChange(
    event,
  ) {
    const nextPerPage =
      Number(
        event.target.value,
      );

    if (
      !Number.isFinite(
        nextPerPage,
      ) ||
      nextPerPage < 1
    ) {
      return;
    }

    setPerPage(
      nextPerPage,
    );

    setCurrentPage(1);
  }

  function handleSearchChange(
    event,
  ) {
    setSearchText(
      event.target.value,
    );
  }

  function handleStatusFilterChange(
    event,
  ) {
    setStatusFilter(
      event.target.value,
    );
  }

  async function handleToggleLock(
    user,
  ) {
    const isBanned =
      isUserCurrentlyBanned(
        user,
      );

    const selectedDuration =
      getSelectedLockDuration(
        user.id,
      );

    const durationLabel =
      getLockDurationLabel(
        selectedDuration,
      );

    const confirmMessage =
      isBanned ? (
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
          Trong thời gian này, người dùng sẽ không thể
          đăng nhập vào hệ thống.
        </>
      );

    const confirmed =
      await confirm({
        title:
          isBanned
            ? "Mở khóa tài khoản?"
            : "Khóa tài khoản?",

        message:
          confirmMessage,

        confirmText:
          isBanned
            ? "Mở khóa"
            : "Khóa tài khoản",

        cancelText:
          "Hủy",

        type:
          isBanned
            ? "warning"
            : "danger",

        icon:
          isBanned
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

      if (isBanned) {
        await unlockAdminUser(
          user.id,
        );

        /*
         * Cập nhật đúng tài khoản vừa mở khóa.
         * Không tải lại toàn bộ danh sách.
         */
        setUsers(
          (currentUsers) =>
            currentUsers.map(
              (item) =>
                item.id ===
                user.id
                  ? {
                      ...item,
                      bannedUntil:
                        null,
                    }
                  : item,
            ),
        );

        showToast?.(
          `Đã mở khóa tài khoản ${user.email}.`,
          "success",
        );
      } else {
        const result =
          await lockAdminUser(
            user.id,
            selectedDuration,
          );

        const bannedUntil =
          result?.user
            ?.bannedUntil ??
          result?.bannedUntil ??
          createLocalBannedUntil(
            selectedDuration,
          );

        /*
         * Cập nhật đúng tài khoản vừa khóa.
         * Không tải lại toàn bộ danh sách.
         */
        setUsers(
          (currentUsers) =>
            currentUsers.map(
              (item) =>
                item.id ===
                user.id
                  ? {
                      ...item,
                      bannedUntil,
                    }
                  : item,
            ),
        );

        showToast?.(
          `Đã khóa tài khoản ${user.email} trong ${durationLabel}.`,
          "success",
        );
      }
    } catch (err) {
      console.error(
        "Lỗi cập nhật tài khoản:",
        err,
      );

      const errorMessage =
        err?.message ||
        "Không thể cập nhật tài khoản.";

      setError(
        errorMessage,
      );

      showToast?.(
        errorMessage,
        "error",
      );
    } finally {
      setActionUserId(
        "",
      );
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
        <div className="admin-user-manager__filters">
          <div className="admin-user-manager__search">
            <Search size={17} />

            <input
              type="text"
              value={searchText}
              onChange={
                handleSearchChange
              }
              placeholder="Tìm theo tên hoặc email"
            />
          </div>

          <select
            className="admin-user-manager__status-filter"
            value={statusFilter}
            onChange={
              handleStatusFilterChange
            }
            aria-label="Lọc người dùng"
          >
            {STATUS_FILTER_OPTIONS.map(
              (option) => (
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

          {loading
            ? "Đang tải..."
            : "Làm mới"}
        </button>
      </div>

      {hasPendingPagination && (
        <div className="admin-user-manager__notice">
          Đã chọn trang {currentPage} với {perPage} dòng.
          Nhấn <strong>Làm mới</strong> để tải dữ liệu.
        </div>
      )}

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
            ) : !hasLoaded ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-user-manager__empty">
                    Nhấn “Làm mới” để tải danh sách người dùng.
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length ===
              0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-user-manager__empty">
                    Không tìm thấy người dùng phù hợp.
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map(
                (item) => {
                  const isProcessing =
                    actionUserId ===
                    item.id;

                  const isBanned =
                    isUserCurrentlyBanned(
                      item,
                    );

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
                                src={
                                  item.avatarUrl
                                }
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
                            <div className="admin-user-manager__name-row">
                              <strong className="admin-user-manager__name">
                                {item.displayName ||
                                  "Chưa đặt tên"}
                              </strong>

                              {item.isAdmin && (
                                <span className="admin-user-manager__admin-badge">
                                  Admin
                                </span>
                              )}
                            </div>

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
                              isBanned
                                ? "admin-user-status admin-user-status--locked"
                                : "admin-user-status admin-user-status--active"
                            }
                          >
                            {isBanned
                              ? "Đã khóa"
                              : "Hoạt động"}
                          </span>

                          {isBanned &&
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
                          {!isBanned && (
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
                                (option) => (
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
                              isBanned
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
                                : isBanned
                                  ? "Mở khóa tài khoản"
                                  : `Khóa tài khoản trong ${getLockDurationLabel(
                                      selectedDuration,
                                    )}`
                            }
                          >
                            {isBanned ? (
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
                              : isBanned
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

      <div className="admin-user-manager__pagination">
        <div className="admin-user-manager__pagination-info">
          {hasLoaded &&
          totalUsers > 0 ? (
            <>
              Hiển thị{" "}
              <strong>
                {startItem}
              </strong>
              {" - "}
              <strong>
                {endItem}
              </strong>
              {" trên "}
              <strong>
                {totalUsers}
              </strong>
              {" người dùng"}
            </>
          ) : (
            "Chưa tải danh sách"
          )}
        </div>

        <div className="admin-user-manager__pagination-controls">
          <label>
            <span>
              Số dòng:
            </span>

            <select
              value={perPage}
              onChange={
                handlePerPageChange
              }
              disabled={loading}
            >
              <option value={10}>
                10
              </option>

              <option value={20}>
                20
              </option>

              <option value={50}>
                50
              </option>

              <option value={100}>
                100
              </option>
            </select>
          </label>

          <button
            type="button"
            onClick={
              handlePreviousPage
            }
            disabled={
              loading ||
              currentPage <= 1
            }
          >
            Trang trước
          </button>

          <span>
            Trang{" "}
            <strong>
              {currentPage}
            </strong>
            {" / "}
            <strong>
              {totalPages}
            </strong>
          </span>

          <button
            type="button"
            onClick={
              handleNextPage
            }
            disabled={
              loading ||
              currentPage >=
                totalPages
            }
          >
            Trang sau
          </button>
        </div>
      </div>
    </section>
  );
}