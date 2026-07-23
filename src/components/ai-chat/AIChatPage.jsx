import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  supabase,
} from "../../supabaseClient";

import "./AIChatPage.css";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Xin chào! Tôi là trợ lý AI. Bạn có thể hỏi tôi về giá vàng, ngoại tệ, kiến thức tài chính hoặc các nội dung khác.",
};

function createMessage(
  role,
  content,
  options = {}
) {
  return {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    role,
    content,
    ...options,
  };
}

function AIChatPage({
  theme = "light",
}) {
  const [
    messages,
    setMessages,
  ] = useState([
    WELCOME_MESSAGE,
  ]);

  const [
    inputText,
    setInputText,
  ] = useState("");

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const messageEndRef =
    useRef(null);

  const textareaRef =
    useRef(null);

  useEffect(() => {
    messageEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [
    messages,
    sending,
  ]);

  useEffect(() => {
    textareaRef.current
      ?.focus();
  }, []);

  function handleNewChat() {
    if (sending) {
      return;
    }

    setMessages([
      WELCOME_MESSAGE,
    ]);

    setInputText("");
    setError("");

    window.setTimeout(
      () => {
        textareaRef.current
          ?.focus();
      },
      0
    );
  }

  async function readFunctionError(
    functionError
  ) {
    let detail =
      functionError?.message ||
      "Edge Function trả về lỗi.";

    try {
      const context =
        functionError?.context;

      if (!context) {
        return detail;
      }

      /*
       * context thường là Response.
       * clone() giúp tránh lỗi body đã được đọc.
       */
      const response =
        typeof context.clone ===
          "function"
          ? context.clone()
          : context;

      const contentType =
        response.headers?.get(
          "content-type"
        ) || "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const errorBody =
          await response.json();

        console.error(
          "Edge Function response:",
          errorBody
        );

        detail =
          errorBody?.error ||
          errorBody?.message ||
          errorBody?.details ||
          detail;
      } else {
        const errorText =
          await response.text();

        if (errorText) {
          console.error(
            "Edge Function response:",
            errorText
          );

          detail =
            errorText;
        }
      }
    } catch (readError) {
      console.error(
        "Không đọc được nội dung lỗi Edge Function:",
        readError
      );
    }

    return detail;
  }

  async function sendMessage() {
    const trimmedMessage =
      inputText.trim();

    if (
      !trimmedMessage ||
      sending
    ) {
      return;
    }

    const userMessage =
      createMessage(
        "user",
        trimmedMessage
      );

    /*
     * Lấy lịch sử trước khi thêm câu hỏi mới.
     * Câu hỏi hiện tại được gửi riêng trong field message.
     */
    const history =
      messages
        .filter(
          (item) =>
            item.id !==
            "welcome"
        )
        .filter(
          (item) =>
            !item.isError
        )
        .slice(-12)
        .map((item) => ({
          role:
            item.role ===
              "assistant"
              ? "assistant"
              : "user",

          content:
            String(
              item.content ?? ""
            ).trim(),
        }))
        .filter(
          (item) =>
            item.content
              .length > 0
        );

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );

    setInputText("");
    setSending(true);
    setError("");

    try {
      const {
        data,
        error:
        functionError,
      } =
        await supabase.functions.invoke(
          "ask-chatgpt",
          {
            body: {
              message:
                trimmedMessage,
              history,
            },
          }
        );

      if (functionError) {
        console.error(
          "Supabase Function error:",
          functionError
        );

        const detail =
          await readFunctionError(
            functionError
          );

        throw new Error(detail);
      }

      let answer =
        typeof data?.answer ===
          "string"
          ? data.answer.trim()
          : "";

      if (
        data?.finishReason ===
        "MAX_TOKENS"
      ) {
        answer +=
          "\n\n⚠️ Câu trả lời đã đạt giới hạn độ dài. Hãy nhập “Tiếp tục” để xem phần còn lại.";
      }

      if (!answer) {
        console.error(
          "Dữ liệu Edge Function trả về:",
          data
        );

        throw new Error(
          "Trợ lý AI không trả về nội dung câu trả lời."
        );
      }

      const aiMessage =
        createMessage(
          "assistant",
          answer
        );

      setMessages(
        (previous) => [
          ...previous,
          aiMessage,
        ]
      );
    } catch (sendError) {
      console.error(
        "Lỗi gửi câu hỏi:",
        sendError
      );

      const errorMessage =
        sendError?.message ||
        "Không thể gửi câu hỏi. Vui lòng thử lại.";

      setError(
        errorMessage
      );

      /*
       * Hiển thị lỗi ngay trong luồng chat
       * để người dùng dễ nhận biết.
       */
      const errorMessageItem =
        createMessage(
          "assistant",
          errorMessage,
          {
            isError: true,
          }
        );

      setMessages(
        (previous) => [
          ...previous,
          errorMessageItem,
        ]
      );
    } finally {
      setSending(false);

      window.setTimeout(
        () => {
          textareaRef.current
            ?.focus();
        },
        0
      );
    }
  }

  function handleKeyDown(
    event
  ) {
    if (
      event.key ===
      "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  return (
    <section
      className={`ai-chat-page ai-chat-page--${theme}`}
    >
      <div className="ai-chat-container">
        <div className="ai-chat-layout">
          <header className="ai-chat-header">
            <div className="ai-chat-header__info">
              <div className="ai-chat-avatar">
                AI
              </div>

              <div className="ai-chat-header__text">
                <h2>Trợ lý AI</h2>
                <p>Hỏi đáp với Gemini AI</p>
              </div>
            </div>

            <button
              type="button"
              className="ai-chat-new-button"
              disabled={sending}
              onClick={handleNewChat}
            >
              Chat mới
            </button>
          </header>

          <main className="ai-chat-messages">
            <div className="ai-chat-messages__content">
              {messages.map(
                (message) => (
                  <div
                    key={message.id}
                    className={`ai-message-row ai-message-row--${message.role}`}
                  >
                    {message.role ===
                      "assistant" && (
                        <div className="ai-message-avatar">
                          AI
                        </div>
                      )}

                    <div
                      className={[
                        "ai-message-bubble",
                        `ai-message-bubble--${message.role}`,
                        message.isError
                          ? "ai-message-bubble--error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {message.content}
                    </div>

                    {message.role ===
                      "user" && (
                        <div className="ai-message-avatar ai-message-avatar--user">
                          Bạn
                        </div>
                      )}
                  </div>
                )
              )}

              {sending && (
                <div className="ai-message-row ai-message-row--assistant">
                  <div className="ai-message-avatar">
                    AI
                  </div>

                  <div className="ai-message-bubble ai-message-bubble--assistant ai-message-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>
          </main>

          {error && (
            <div
              className="ai-chat-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <footer className="ai-chat-composer">
            <div className="ai-chat-input-wrapper">
              <textarea
                ref={textareaRef}
                rows={1}
                maxLength={5000}
                value={inputText}
                placeholder="Nhập câu hỏi..."
                disabled={sending}
                onChange={(event) =>
                  setInputText(
                    event.target.value
                  )
                }
                onKeyDown={handleKeyDown}
              />

              <button
                type="button"
                className="ai-chat-send-button"
                disabled={
                  sending ||
                  !inputText.trim()
                }
                onClick={sendMessage}
              >
                {sending
                  ? "Đang gửi"
                  : "Gửi"}
              </button>
            </div>

            <div className="ai-chat-composer__hint">
              Enter để gửi, Shift + Enter để xuống dòng
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}

export default AIChatPage;