import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ProductDetail.css";

function ProductDetail({ onAdd }) {
    const { id } = useParams();

    const [dish, setDish] = useState(null);
    const [related, setRelated] = useState([]);
    const [loading, setLoading] = useState(true);

    // ====================================
    // Fetch detail + related dishes
    // ====================================
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            try {
                // 1) Fetch detail món theo ID
                const detailRes = await fetch(
                    `http://localhost:8080/api/dishes?filter=id==${id}`
                );

                const detailData = await detailRes.json();
                const detailItems = detailData?.data?.items || [];
                const foundDish = detailItems[0] || null;

                setDish(foundDish);

                if (foundDish) {
                    // 2) Fetch toàn bộ món để lọc món liên quan
                    const allRes = await fetch(`http://localhost:8080/api/dishes`);
                    const allData = await allRes.json();
                    const allItems = allData?.data?.items || [];

                    const relatedList = allItems
                        .filter(
                            x =>
                                x.restaurantId === foundDish.restaurantId &&
                                x.id !== foundDish.id
                        )
                        .slice(0, 4);

                    setRelated(relatedList);
                }

            } catch (err) {
                console.error("Lỗi fetch dữ liệu:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // ====================================
    // Render UI
    // ====================================
    if (loading) return <p className="productDetail__loading">⏳ Đang tải món ăn...</p>;
    if (!dish) return <p className="productDetail__loading">Không tìm thấy món ăn.</p>;

    return (
        <div className="productDetail">
            <div className="productDetail__container">

                <div className="productDetail__image">
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/1046/1046784.png"
                        alt={dish.name}
                    />
                </div>

                {/* Thông tin món */}
                <div className="productDetail__info">
                    <h2 className="productDetail__name">{dish.name}</h2>

                    <div className="productDetail__rating">
                        <span className="stars">⭐4.5</span>
                        <span className="reviews">({100} đánh giá)</span>
                    </div>

                    <div className="productDetail__price">
                        <p className="price--discounted">
                            {dish.price.toLocaleString()}₫
                        </p>
                    </div>

                    <p className="productDetail__desc">{dish.description}</p>

                    <p className="productDetail__restaurant">
                        Nhà hàng ID: <strong>{dish.restaurantId}</strong>
                    </p>

                    <button
                        className="productDetail__addBtn"
                        onClick={() =>
                            onAdd({
                                ...dish,
                                quantity: 1
                            })
                        }
                    >
                        🛒 Thêm vào giỏ hàng
                    </button>

                    <Link to="/" className="productDetail__backLink">
                        ⬅ Quay lại danh sách món
                    </Link>
                </div>
            </div>

            {/* Related dishes */}
            <div className="relatedProducts">
                <h3>Các món khác từ nhà hàng này</h3>
                <div className="relatedProducts__grid">
                    {related.length > 0 ? (
                        related.map(item => (
                            <Link
                                key={item.id}
                                to={`/product-detail/${item.id}`}
                                className="relatedProducts__link"
                            >
                                <div className="relatedProducts__item">
                                    <img
                                        src="https://cdn-icons-png.flaticon.com/512/1046/1046784.png"
                                        alt={item.name}
                                    />
                                    <h4>{item.name}</h4>
                                    <p>{item.price.toLocaleString()}₫</p>

                                    <button
                                        className="relatedProducts__addBtn"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onAdd({
                                                ...item,
                                                quantity: 1
                                            });
                                        }}
                                    >
                                        🛒 Thêm
                                    </button>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p>Không có món tương tự.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductDetail;
