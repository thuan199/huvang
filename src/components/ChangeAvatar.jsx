import {
  Camera,
  LoaderCircle,
} from "lucide-react";

import {
  useRef,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

/*
 * Cắt ảnh vuông từ chính giữa,
 * resize về 320 x 320 và nén thành WebP.
 */
function resizeAvatarImage(
  file,
  size = 320,
  quality = 0.82
) {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();
      const objectUrl =
        URL.createObjectURL(file);

      image.onload = () => {
        try {
          const sourceWidth =
            image.naturalWidth;

          const sourceHeight =
            image.naturalHeight;

          /*
           * Lấy cạnh ngắn nhất để cắt vuông.
           */
          const sourceSize =
            Math.min(
              sourceWidth,
              sourceHeight
            );

          const sourceX =
            (
              sourceWidth -
              sourceSize
            ) / 2;

          const sourceY =
            (
              sourceHeight -
              sourceSize
            ) / 2;

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = size;
          canvas.height = size;

          const context =
            canvas.getContext("2d");

          if (!context) {
            throw new Error(
              "Trình duyệt không hỗ trợ xử lý ảnh."
            );
          }

          /*
           * Chất lượng ảnh khi thu nhỏ tốt hơn.
           */
          context.imageSmoothingEnabled =
            true;

          context.imageSmoothingQuality =
            "high";

          context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            size,
            size
          );

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(
                objectUrl
              );

              if (!blob) {
                reject(
                  new Error(
                    "Không thể nén ảnh đại diện."
                  )
                );
                return;
              }

              resolve(blob);
            },
            "image/webp",
            quality
          );
        } catch (error) {
          URL.revokeObjectURL(
            objectUrl
          );

          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "Không thể đọc file hình ảnh."
          )
        );
      };

      image.src = objectUrl;
    }
  );
}

export default function ChangeAvatar({
  user,
  onAvatarChanged,
}) {
  const fileInputRef =
    useRef(null);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  function openFilePicker() {
    if (uploading) {
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleFileChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    /*
     * Reset input để người dùng có thể
     * chọn lại đúng file vừa chọn.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      alert(
        "Vui lòng chọn một file hình ảnh."
      );
      return;
    }

    /*
     * Giới hạn ảnh gốc trước khi xử lý.
     * 10 MB là đủ cho ảnh chụp từ điện thoại.
     */
    const maxOriginalFileSize =
      10 * 1024 * 1024;

    if (
      file.size >
      maxOriginalFileSize
    ) {
      alert(
        "Ảnh gốc không được lớn hơn 10 MB."
      );
      return;
    }

    if (!user?.id) {
      alert(
        "Không tìm thấy thông tin người dùng."
      );
      return;
    }

    try {
      setUploading(true);

      /*
       * Resize trước khi upload.
       */
      const resizedBlob =
        await resizeAvatarImage(
          file,
          320,
          0.82
        );

      console.log(
        "Dung lượng ảnh gốc:",
        Math.round(
          file.size / 1024
        ),
        "KB"
      );

      console.log(
        "Dung lượng sau resize:",
        Math.round(
          resizedBlob.size / 1024
        ),
        "KB"
      );

      /*
       * Luôn lưu dưới dạng WebP.
       */
      const fileName =
        `avatar-${Date.now()}.webp`;

      const filePath =
        `${user.id}/${fileName}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("avatars")
          .upload(
            filePath,
            resizedBlob,
            {
              cacheControl:
                "3600",

              upsert: false,

              contentType:
                "image/webp",
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from("avatars")
          .getPublicUrl(
            filePath
          );

      const avatarUrl =
        publicUrlData
          ?.publicUrl;

      if (!avatarUrl) {
        throw new Error(
          "Không lấy được đường dẫn ảnh đại diện."
        );
      }

      const oldAvatarPath =
        user.user_metadata
          ?.custom_avatar_path ||
        "";

      const {
        data,
        error: updateError,
      } =
        await supabase.auth
          .updateUser({
            data: {
              ...user.user_metadata,

              custom_avatar_url:
                avatarUrl,

              custom_avatar_path:
                filePath,
            },
          });

      if (updateError) {
        /*
         * Nếu cập nhật metadata lỗi,
         * xóa ảnh vừa upload.
         */
        await supabase.storage
          .from("avatars")
          .remove([
            filePath,
          ]);

        throw updateError;
      }

      /*
       * Xóa avatar cũ sau khi avatar mới
       * đã được lưu thành công.
       */
      if (
        oldAvatarPath &&
        oldAvatarPath !==
          filePath
      ) {
        const {
          error: deleteOldError,
        } =
          await supabase.storage
            .from("avatars")
            .remove([
              oldAvatarPath,
            ]);

        if (deleteOldError) {
          console.warn(
            "Không xóa được avatar cũ:",
            deleteOldError
          );
        }
      }

      onAvatarChanged?.(
        data.user
      );
    } catch (error) {
      console.error(
        "Lỗi đổi ảnh đại diện:",
        error
      );

      alert(
        error?.message ||
          "Không thể đổi ảnh đại diện."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="change-avatar-button"
        onClick={openFilePicker}
        disabled={uploading}
        title="Đổi ảnh đại diện"
        aria-label="Đổi ảnh đại diện"
      >
        {uploading ? (
          <LoaderCircle
            size={15}
            className="avatar-loading-icon"
          />
        ) : (
          <Camera size={15} />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="avatar-file-input"
        onChange={
          handleFileChange
        }
      />
    </>
  );
}