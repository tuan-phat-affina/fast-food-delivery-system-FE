import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./RestaurantDetail.css";

function RestaurantDetail({ onAdd }) {
  const { id } = useParams(); // id string từ URL
  const navigate = useNavigate(); // <-- Thêm navigate
  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- 1. Fetch restaurant ---
        const restResponse = await fetch(
          `http://localhost:8080/api/restaurants?filter=id==${id}`
        );
        const restData = await restResponse.json();
        const foundRestaurant = restData.items?.[0];
        if (!foundRestaurant) {
          setError("❌ Không tìm thấy nhà hàng này!");
          setLoading(false);
          return;
        }
        setRestaurant(foundRestaurant);

        // --- 2. Fetch dishes ---
        const dishResponse = await fetch(
          `http://localhost:8080/api/dishes?filter=restaurant.id==${id}`
        );
        const dishData = await dishResponse.json();
        const items = dishData?.data?.items || [];
        setDishes(items);
      } catch (err) {
        console.error("🔥 Lỗi khi tải dữ liệu:", err);
        setError("Không thể tải dữ liệu từ API.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddToCart = (dish) => {
    onAdd({
      ...dish,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
  };

  const handleGoToDishDetail = (dishId) => {
    navigate(`/product-detail/${dishId}`);
  };

  if (loading) return <p className="loading">⏳ Đang tải dữ liệu...</p>;
  if (error) return <p className="loading">{error}</p>;

  return (
    <div className="restaurant-detail-page">
      {/* --- Header nhà hàng --- */}
      <div className="restaurant-header">
        <img
          src={restaurant.image || "https://media.istockphoto.com/id/2149219718/vi/anh/3d-render-of-cafe-restaurant-interior.jpg?s=2048x2048&w=is&k=20&c=Ondl2olldAhWIveWg59z3q6xwAHRQprvRrBx6wyNnWM="}
          alt={restaurant.name}
        />
        <div className="restaurant-info">
          <h1>{restaurant.name}</h1>
          <p className="restaurant-address">
            {restaurant.address?.street}, {restaurant.address?.city}
          </p>
          <p className="restaurant-description">{restaurant.description}</p>
        </div>
      </div>

      {/* --- Menu món ăn --- */}
      <h2 className="menu-title">🍽️ Danh sách món ăn</h2>
      {dishes.length === 0 ? (
        <p className="no-products">😥 Nhà hàng chưa có món ăn nào.</p>
      ) : (
        <div className="product-grid">
          {dishes.map(dish => (
            <div
              key={dish.id}
              className="product-card"
              style={{ cursor: "pointer" }}
              onClick={() => handleGoToDishDetail(dish.id)} // <-- redirect khi click
            >
              {dish.discount > 0 && (
                <span className="discount-badge">-{dish.discount}%</span>
              )}
              <img
                src={"https://cdn-icons-png.flaticon.com/512/1046/1046784.png"}
                alt={dish.name}
              />
              <h3>{dish.name}</h3>
              <p className="product-price">
                {(dish.price * (1 - (dish.discount || 0) / 100)).toLocaleString()}₫
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Ngăn click trên card trigger navigate
                  handleAddToCart(dish);
                }}
                style={{
                  backgroundColor: "#e44d26",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  padding: "8px 12px",
                  marginBottom: "12px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                🛒 Thêm vào giỏ
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RestaurantDetail;
