import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "./AdminCreateRestaurant.css";

export default function AdminCreateRestaurant() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    restaurantPhone: "",
    phone: "",
    image: "",
    password: "",
    city: "",
    latitude: "",
    longitude: "",
    description: "",
    username: "",
    fullname: "",
    email: "",
    registerPhone: "", // Phone for the register request (owner)
    registerPassword: "", // Password for the register request (owner)
  });
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState([]); // Store list of restaurants
  const { currentUser } = useAuth(); // Use Auth context to get current user info

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch list of restaurants from the API
  const fetchRestaurants = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/restaurants?filter=status==OPEN", {
        headers: {
          Authorization: `Bearer ${currentUser.token}`, // Add token to headers
        },
      });
      setRestaurants(response.data.items);
    } catch (err) {
      console.error("Error fetching restaurants", err);
    }
  };

  // Convert the status enum from the API to a human-readable format
  const getStatusText = (status) => {
    switch (status) {
      case "OPEN":
        return "Đang mở cửa";
      case "CLOSED":
        return "Đã đóng cửa";
      case "INACTIVE":
        return "Không hoạt động";
      default:
        return "Không xác định";
    }
  };

  // Create a new restaurant via API
  const handleCreateRestaurant = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const requestData = {
        name: form.name,
        address: {
          street: form.address,
          city: form.city,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          type: "RESTAURANT",
        },
        phone: form.restaurantPhone,
        email: form.email,
        description: form.description || "",
        registerRequest: {
          username: form.username,
          password: form.registerPassword, // Password for the owner
          fullname: form.fullname,
          email: form.email,
          phone: form.registerPhone, // Phone number for owner registration
          status: "ACTIVE",
        },
      };

      const response = await axios.post("http://localhost:8080/api/restaurants", requestData, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`, // Add token to headers
        },
      });

      if (response.status === 200) {
        alert("✅ Tạo nhà hàng thành công!");
        setForm({
          name: "",
          address: "",
          phone: "",
          password: "",
          city: "",
          latitude: "",
          longitude: "",
          description: "",
          username: "",
          fullname: "",
          email: "",
          registerPhone: "",
          registerPassword: "",
        });
        fetchRestaurants(); // Re-fetch the list of restaurants
      }
    } catch (err) {
      console.error("🔥 Lỗi khi tạo nhà hàng:", err);
      alert("❌ Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // Update restaurant info
  const handleUpdateRestaurant = async (restaurantId) => {
    const updatedDescription = prompt("Nhập mô tả mới:");
    if (!updatedDescription) return;

    try {
      const response = await axios.put(
        `http://localhost:8080/api/restaurants/${restaurantId}`,
        {
          description: updatedDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`, // Add token to headers
          },
        }
      );

      if (response.status === 200) {
        alert("✅ Cập nhật nhà hàng thành công!");
        fetchRestaurants(); // Re-fetch after update
      }
    } catch (err) {
      console.error("🔥 Lỗi khi cập nhật nhà hàng:", err);
      alert("❌ Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  // Delete restaurant
  const handleDeleteRestaurant = async (restaurantId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhà hàng này?")) return;

    try {
      const response = await axios.delete(
        `http://localhost:8080/api/restaurants/${restaurantId}`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`, // Add token to headers
          },
        }
      );

      if (response.status === 200) {
        alert("✅ Xoá nhà hàng thành công!");
        fetchRestaurants(); // Re-fetch the list of restaurants
      }
    } catch (err) {
      console.error("🔥 Lỗi khi xoá nhà hàng:", err);
      alert("❌ Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  // Fetch list of restaurants when the component mounts
  useEffect(() => {
    fetchRestaurants();
  }, []);

  return (
    <div className="acr-container">
      <h2 className="acr-title">🏪 Tạo Nhà Hàng Mới</h2>

      <form className="acr-form" onSubmit={handleCreateRestaurant}>
        <div className="acr-grid">
          <label>
            Tên Nhà hàng
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </label>
          <label>
            Địa chỉ
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </label>
          <label>
            Thành phố
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
            />
          </label>
          <label>
            Số điện thoại
            <input
              name="restaurantPhone"
              value={form.restaurantPhone}
              onChange={handleChange}
            />
          </label>
          <label>
            Vĩ độ
            <input
              name="latitude"
              value={form.latitude}
              onChange={handleChange}
              type="number"
              step="0.000001"
            />
          </label>
          <label>
            Kinh độ
            <input
              name="longitude"
              value={form.longitude}
              onChange={handleChange}
              type="number"
              step="0.000001"
            />
          </label>
          <label>
            Mô tả
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </label>
        </div>

        <hr className="acr-divider" />

        <h3 className="acr-subtitle">🔑 Thông tin đăng nhập</h3>
        <div className="acr-grid">
          <label>
            Tên đăng nhập
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
            />
          </label>
          <label>
            Mật khẩu
            <input
              name="registerPassword"
              type="password"
              value={form.registerPassword}
              onChange={handleChange}
            />
          </label>
          <label>
            Họ và tên
            <input
              name="fullname"
              value={form.fullname}
              onChange={handleChange}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
          </label>
          <label>
            Số điện thoại
            <input
              name="registerPhone"
              type="text"
              value={form.registerPhone}
              onChange={handleChange}
            />
          </label>
        </div>

        <button className="acr-btn" type="submit" disabled={loading}>
          {loading ? "Đang tạo..." : "Tạo Nhà hàng"}
        </button>
      </form>

      <h2 className="acr-title">Danh Sách Nhà Hàng</h2>
      <table className="acr-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên</th>
            <th>Địa chỉ</th>
            <th>Điện thoại</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((restaurant) => (
            <tr key={restaurant.id}>
              <td>{restaurant.id}</td>
              <td>{restaurant.name}</td>
              <td>{restaurant.address.street}, {restaurant.address.city}</td>
              <td>{restaurant.phone}</td>
              <td>{getStatusText(restaurant.status)}</td>
              <td>
                <button
                  className="acr-btn"
                  onClick={() => handleUpdateRestaurant(restaurant.id)}
                >
                  Cập nhật
                </button>
                <button
                  className="acr-btn"
                  onClick={() => handleDeleteRestaurant(restaurant.id)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
