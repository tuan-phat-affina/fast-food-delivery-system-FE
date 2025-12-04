// src/components/Product.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./ProductCard.css";

function Product({ product, onAdd }) {
    if (!product) return null;

    const {
        id,
        name = "Sản phẩm chưa có tên",
        description = "",
        price = 0,
        available = true,
        restaurantId = null,
        restaurantName = null
    } = product;

    // BE không trả về ảnh → dùng ảnh mặc định
    const img =
        product.img ||
        "https://cdn-icons-png.flaticon.com/512/1046/1046784.png";

    const displayPrice = Number(price || 0).toLocaleString("vi-VN");

    return (
        <div className="prd-card">
            <Link to={`/product-detail/${id}`} className="prd-link">
                <img src={img} alt={name} loading="lazy" className="prd-img" />
                <div className="prd-info">
                    <h3 className="prd-name">{name}</h3>
                    <p className="prd-price">{displayPrice} ₫</p>

                    {/* BE chỉ có restaurantId */}
                    <p className="prd-restaurant">
                        🏠 Nhà hàng #{restaurantName}
                    </p>

                    {!available && (
                        <p className="prd-unavailable">⚠ Tạm hết hàng</p>
                    )}
                </div>
            </Link>

            <div className="prd-actions">
                <button
                    className="prd-add-btn"
                    onClick={() => onAdd(product)}
                    disabled={!available}
                >
                    🛒 Thêm vào giỏ
                </button>
            </div>
        </div>
    );
}

export default Product;
