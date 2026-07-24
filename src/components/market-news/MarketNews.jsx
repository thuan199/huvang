import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./MarketNews.css";

const ITEMS_PER_PAGE = 5;

function formatPublishedTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
}

function formatUpdatedTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
}

export default function MarketNews() {
    const [news, setNews] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const totalPages = Math.ceil(
        news.length / ITEMS_PER_PAGE
    );

    const startIndex =
        (currentPage - 1) * ITEMS_PER_PAGE;

    const paginatedNews = news.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
    );

    useEffect(() => {
        let isMounted = true;

        async function loadMarketNews() {
            setLoading(true);
            setErrorMessage("");

            const { data, error } = await supabase
                .from("market_news")
                .select(`
                    id,
                    title,
                    article_url,
                    source_name,
                    summary,
                    image_url,
                    category,
                    published_at,
                    updated_at
                `)
                .order("published_at", {
                    ascending: false,
                    nullsFirst: false,
                })
                .limit(20);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error(
                    "Load market news error:",
                    error
                );

                setErrorMessage(
                    "Không thể tải tin tức thị trường."
                );

                setLoading(false);
                return;
            }

            const marketNews = data ?? [];

            setNews(marketNews);

            if (marketNews.length > 0) {
                const latestUpdatedAt =
                    marketNews.reduce(
                        (latest, item) => {
                            if (!item.updated_at) {
                                return latest;
                            }

                            const itemTime = new Date(
                                item.updated_at
                            ).getTime();

                            const latestTime = latest
                                ? new Date(
                                      latest
                                  ).getTime()
                                : 0;

                            return itemTime >
                                latestTime
                                ? item.updated_at
                                : latest;
                        },
                        null
                    );

                setLastUpdated(latestUpdatedAt);
            } else {
                setLastUpdated(null);
            }

            setLoading(false);
        }

        loadMarketNews();

        const intervalId = window.setInterval(
            loadMarketNews,
            10 * 60 * 1000
        );

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (
            totalPages > 0 &&
            currentPage > totalPages
        ) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handlePreviousPage = () => {
        setCurrentPage((page) =>
            Math.max(page - 1, 1)
        );
    };

    const handleNextPage = () => {
        setCurrentPage((page) =>
            Math.min(page + 1, totalPages)
        );
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    if (loading) {
        return (
            <section className="market-news">
                <div className="market-news__header">
                    <h2>📰 Tin tức thị trường</h2>
                </div>

                <p className="market-news__status">
                    Đang tải tin tức...
                </p>
            </section>
        );
    }

    if (errorMessage) {
        return (
            <section className="market-news">
                <div className="market-news__header">
                    <h2>📰 Tin tức thị trường</h2>
                </div>

                <p className="market-news__status market-news__status--error">
                    {errorMessage}
                </p>
            </section>
        );
    }

    return (
        <section className="market-news">
            <div className="market-news__header">
                <div>
                    <h2>📰 Tin tức thị trường</h2>

                    <p>
                        Cập nhật tin tức mới nhất về
                        vàng và kinh tế
                        {lastUpdated && (
                            <>
                                {" "}
                                • Cập nhật lúc{" "}
                                {formatUpdatedTime(
                                    lastUpdated
                                )}
                            </>
                        )}
                    </p>
                </div>
            </div>

            {news.length === 0 ? (
                <p className="market-news__status">
                    Hiện chưa có tin tức.
                </p>
            ) : (
                <>
                    <div className="market-news__list">
                        {paginatedNews.map(
                            (article) => (
                                <article
                                    key={article.id}
                                    className="market-news__item"
                                >
                                    {article.image_url && (
                                        <a
                                            className="market-news__image-link"
                                            href={
                                                article.article_url
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <img
                                                className="market-news__image"
                                                src={
                                                    article.image_url
                                                }
                                                alt={
                                                    article.title ||
                                                    ""
                                                }
                                                loading="lazy"
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        "none";
                                                }}
                                            />
                                        </a>
                                    )}

                                    <div className="market-news__content">
                                        <div className="market-news__meta">
                                            <span className="market-news__source">
                                                {
                                                    article.source_name
                                                }
                                            </span>

                                            {article.published_at && (
                                                <span>
                                                    {formatPublishedTime(
                                                        article.published_at
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="market-news__title">
                                            <a
                                                href={
                                                    article.article_url
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {
                                                    article.title
                                                }
                                            </a>
                                        </h3>

                                        {article.summary && (
                                            <p className="market-news__summary">
                                                {
                                                    article.summary
                                                }
                                            </p>
                                        )}
                                    </div>
                                </article>
                            )
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="market-news__pagination">
                            <button
                                type="button"
                                className="market-news__page-button"
                                onClick={
                                    handlePreviousPage
                                }
                                disabled={
                                    currentPage === 1
                                }
                            >
                                Trước
                            </button>

                            <div className="market-news__page-numbers">
                                {Array.from(
                                    {
                                        length: totalPages,
                                    },
                                    (_, index) => {
                                        const pageNumber =
                                            index + 1;

                                        return (
                                            <button
                                                key={
                                                    pageNumber
                                                }
                                                type="button"
                                                className={`market-news__page-number ${
                                                    currentPage ===
                                                    pageNumber
                                                        ? "market-news__page-number--active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    handlePageChange(
                                                        pageNumber
                                                    )
                                                }
                                            >
                                                {
                                                    pageNumber
                                                }
                                            </button>
                                        );
                                    }
                                )}
                            </div>

                            <button
                                type="button"
                                className="market-news__page-button"
                                onClick={
                                    handleNextPage
                                }
                                disabled={
                                    currentPage ===
                                    totalPages
                                }
                            >
                                Sau
                            </button>
                        </div>
                    )}

                    <footer className="app-footer">
                        <p>
                            © 2026 Phạm Ngọc
                            Thuần
                        </p>
                    </footer>
                </>
            )}
        </section>
    );
}