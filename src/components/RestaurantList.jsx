import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RestaurantList.css";

function RestaurantList() {
    const navigate = useNavigate();
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const perPage = 8;

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const response = await fetch("http://localhost:8080/api/restaurants");
                const data = await response.json();

                const items = data?.items || [];// <-- items BE trả về
                setRestaurants(items);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách nhà hàng:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRestaurants();
    }, []);

    if (loading) return <p>Đang tải danh sách nhà hàng...</p>;

    // Phân trang FE
    const start = (page - 1) * perPage;
    const currentRestaurants = restaurants.slice(start, start + perPage);
    console.log("currentRestaurants:", currentRestaurants);
    const totalPages = Math.ceil(restaurants.length / perPage);

    return (
        <div className="restaurant-list">
            <h2>Danh sách nhà hàng</h2>

            <div className="restaurant-grid">
                {currentRestaurants.map((res) => (
                    <div
                        key={res.id}
                        className="restaurant-card"
                        onClick={() => navigate(`/restaurant/${res.id}`)}
                    >
                        <img
                            src={
                                res.image ||
                                "https://media.istockphoto.com/id/2149219718/vi/anh/3d-render-of-cafe-restaurant-interior.jpg?s=2048x2048&w=is&k=20&c=Ondl2olldAhWIveWg59z3q6xwAHRQprvRrBx6wyNnWM="
                            }
                            alt={res.name}
                        />

                        <h3>{res.name}</h3>

                        {/* Address object */}
                        <p>
                            {res.address?.street}, {res.address?.city}
                        </p>

                        <p className="desc">{res.description}</p>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>◀</button>
                <span>{page}/{totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>▶</button>
            </div>
        </div>
    );
}

export default RestaurantList;
