import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./MarketNews.css";

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
    }).format(date);
}

export default function MarketNews() {
    const [lastUpdated, setLastUpdated] = useState(null);
    const [news, setNews] = useState([]);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] =
        useState("");

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

            setNews(data ?? []);

            if (data?.length) {
                const latestUpdatedAt = data.reduce(
                    (latest, item) => {
                        if (!item.updated_at) return latest;

                        const itemTime = new Date(item.updated_at).getTime();
                        const latestTime = latest
                            ? new Date(latest).getTime()
                            : 0;

                        return itemTime > latestTime
                            ? item.updated_at
                            : latest;
                    },
                    null
                );

                setLastUpdated(latestUpdatedAt);
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



            setArticles(data ?? []);
            setLoading(false);
        }

        loadMarketNews();

        const intervalId =
            window.setInterval(
                loadMarketNews,
                10 * 60 * 1000
            );

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);

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

    const formatUpdatedTime = (value) => {
        if (!value) return "";

        return new Intl.DateTimeFormat("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour12: false,
            timeZone: "Asia/Ho_Chi_Minh",
        }).format(new Date(value));
    };

    return (
        <section className="market-news">
            <div className="market-news__header">
                <div>
                    <h2>📰 Tin tức thị trường</h2>

                    <p>
                        Cập nhật tin tức mới nhất về vàng và kinh tế
                        {lastUpdated && (
                            <>
                                {" "}• Cập nhật lúc {formatUpdatedTime(lastUpdated)}
                            </>
                        )}
                    </p>
                </div>
            </div>

            {articles.length === 0 ? (
                <p className="market-news__status">
                    Hiện chưa có tin tức.
                </p>
            ) : (
                <div className="market-news__list">
                    {articles.map((article) => (
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
                    ))}
                    <footer className="app-footer">
                        <p>
                            © 2026 Phạm Ngọc Thuần
                        </p>
                    </footer>
                </div>

            )}
        </section>
    );
}