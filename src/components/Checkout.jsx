import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Checkout.css";

export default function Checkout({ cart, setCart }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const restaurantId = cart.length > 0 ? cart[0].restaurantId : null;

  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    address: "",
  });

  const [paymentMethod] = useState("VNPAY");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [useCurrentAddress, setUseCurrentAddress] = useState(false); // Để xác định người dùng có muốn sử dụng địa chỉ hiện tại không

  // ==== Auto-fill thông tin user ====
  useEffect(() => {
    if (currentUser) {
      setForm({
        lastName: currentUser.lastname || "",
        firstName: currentUser.firstname || "",
        phone: currentUser.phonenumber || "",
        address: currentUser.address || "",
      });
    }
  }, [currentUser]);

  // ==== Lấy thông tin nhà hàng từ API ====
  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurantId) return;
      try {
        const response = await fetch(`http://localhost:8080/api/restaurants?filter=id==${restaurantId}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const restaurantData = data.items[0];
          setRestaurantDetails({
            name: restaurantData.name,
            address: `${restaurantData.address.street}, ${restaurantData.address.city}`,
            phone: restaurantData.phone,
            description: restaurantData.description,
          });
        } else {
          setRestaurantDetails(null);
        }
      } catch (err) {
        console.error("Lỗi tải thông tin nhà hàng:", err);
        setRestaurantDetails(null);
      }
    };
    fetchRestaurantDetails();
  }, [restaurantId]);

  // ==== Lấy thông tin người dùng hiện tại từ API khi chọn "Giao cho tôi" ====
  useEffect(() => {
    if (useCurrentAddress && currentUser) {
      const fetchUserAddress = async () => {
        try {
          const response = await fetch(`http://localhost:8080/api/users?filter=username==${currentUser.username}`);
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const userData = data.items[0];
            setForm({
              ...form,
              address: `${userData.address.street}, ${userData.address.city}`,
            });
            setCustomerCoords({
              lat: userData.address.latitude,
              lng: userData.address.longitude,
            });
          }
        } catch (err) {
          console.error("Lỗi tải thông tin người dùng:", err);
        }
      };

      fetchUserAddress();
    }
  }, [useCurrentAddress, currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // === Geocoding với Nominatim ===
  // === Geocoding với Nominatim ===
  const getCoordinatesForAddress = async (address) => {
    try {
      const query = `${address}, Vietnam`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=vn`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);

      const data = await res.json();

      // Nếu không tìm thấy địa chỉ, trả về tọa độ cố định (hard-code)
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }

      // Trả về tọa độ cố định nếu không tìm thấy kết quả từ API
      return { lat: 10.754085, lng: 106.686847 };  // Tọa độ hard-code

    } catch (err) {
      console.error("Lỗi geocoding:", err);
      return { lat: 10.754085, lng: 106.686847 };  // Tọa độ hard-code khi có lỗi
    }
  };


  // === Kiểm tra + xử lý thanh toán ===
  const handleCheckout = async () => {
    if (!currentUser) {
      alert("⚠️ Bạn cần đăng nhập để thanh toán!");
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }
    if (cart.length === 0) {
      alert("🛒 Giỏ hàng của bạn đang trống!");
      navigate("/cart");
      return;
    }
    if (!restaurantDetails) {
      alert("⚠️ Không tải được thông tin nhà hàng!");
      return;
    }
    if (!form.address || form.address.trim().length < 5) {
      alert("📍 Vui lòng nhập địa chỉ giao hàng cụ thể hơn.");
      return;
    }

    setIsProcessing(true);
    const coords = await getCoordinatesForAddress(form.address);
    setIsProcessing(false);

    if (!coords) {
      alert("❌ Không thể tìm thấy tọa độ cho địa chỉ của bạn.");
      return;
    }

    setCustomerCoords(coords);

    await createOrderAndPayment();
  };

  // === Tạo đơn hàng và thanh toán ===
  // Tạo thanh toán
  const createOrderAndPayment = async () => {
    if (!customerCoords) {
      alert("❗Thiếu tọa độ khách hàng. Vui lòng thử lại.");
      return;
    }

    setIsProcessing(true);
    try {
      const token = currentUser?.token;  // Thay đổi này tuỳ vào cách lưu token trong context của bạn

      let deliveryAddressId = null;
      let deliveryAddress = null;

      // Kiểm tra địa chỉ người dùng
      if (useCurrentAddress && currentUser) {
        const response = await fetch(`http://localhost:8080/api/users?filter=username==${currentUser.username}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const userData = data.items[0];
          deliveryAddressId = userData.address.id;  // Lấy ID địa chỉ người dùng
          deliveryAddress = useCurrentAddress ? null : {
            street: form.address,
            city: "Hồ Chí Minh",
            latitude: customerCoords.lat,
            longitude: customerCoords.lng,
            type: "HOME",
          };
        } else {
          alert("❌ Không tìm thấy thông tin địa chỉ người dùng.");
          return;
        }
      } else {
        // Nếu không chọn "Giao cho tôi", lấy địa chỉ nhập tay
        deliveryAddressId = "null";  // Trường hợp giao đến địa chỉ khác
        deliveryAddress = {
          street: form.address,
          city: "Hồ Chí Minh",
          latitude: customerCoords.lat,
          longitude: customerCoords.lng,
          type: "HOME",
        };
      }

      // Tạo đơn hàng
      const orderResponse = await fetch("http://localhost:8080/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          restaurantId,
          deliveryAddressId,
          deliveryAddress,
          items: cart.map(item => ({
            dishId: item.id,
            quantity: item.quantity,
          })),
          paymentMethod: "VNPAY",
        }),
      });

      const orderData = await orderResponse.json();
      if (orderData.status !== 200) {
        alert("❌ Lỗi tạo đơn hàng");
        return;
      }

      // Tạo thanh toán
      const paymentResponse = await fetch("http://localhost:8080/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          orderId: orderData.data.id,
          method: "ONLINE",
        }),
      });

      const paymentData = await paymentResponse.json();
      if (paymentData.status === 200) {
        // Redirect đến trang thanh toán VNPAY
        window.location.href = paymentData.data.paymentUrl;

        // Bắt đầu kiểm tra trạng thái đơn hàng sau khi redirect
        checkOrderStatus(orderData.data.id);
      } else {
        alert("❌ Lỗi tạo thanh toán");
      }
    } catch (err) {
      console.error("Lỗi tạo đơn hàng hoặc thanh toán:", err);
      alert("Có lỗi xảy ra khi thanh toán, vui lòng thử lại!");
    } finally {
      setIsProcessing(false);
    }
  };

  // Hàm kiểm tra trạng thái của đơn hàng
  const checkOrderStatus = (orderId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/orders/status/${orderId}`);
        const data = await response.json();
        if (data.status === 200) {
          if (data.orderStatus === "DELIVERY") {
            clearInterval(interval);  // Dừng lại khi đã thành công
            navigate("/payment-result?status=success");
          } else if (data.orderStatus === "CANCELLED") {
            clearInterval(interval);  // Dừng lại khi thanh toán bị hủy
            navigate("/payment-result?status=failure");
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái đơn hàng:", error);
      }
    }, 5000); // Kiểm tra mỗi 5 giây

    setTimeout(() => {
      clearInterval(interval); // Dừng kiểm tra sau 1 phút
      navigate("/payment-result?status=timeout");
    }, 60000); // Timeout sau 1 phút
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    await handleCheckout();
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link to="/cart">
          <button className="checkout-back-btn">⬅ Quay lại giỏ hàng</button>
        </Link>
        <h2>🔒 THÔNG TIN ĐẶT HÀNG</h2>
      </div>

      <div className="checkout-container">
        {/* ===== CỘT TRÁI ===== */}
        <div className="checkout-info">
          <div className="checkout-info-block">
            <h3>ĐƯỢC GIAO TỪ:</h3>
            <p className="store-name">{restaurantDetails ? restaurantDetails.name : "Đang tải..."}</p>
            <p className="store-address">{restaurantDetails ? restaurantDetails.address : "..."}</p>
          </div>

          <div className="checkout-info-block">
            <h3>GIAO ĐẾN:</h3>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Nhập địa chỉ giao hàng..."
              className="address-input"
            />
            <div className="use-current-address">
              <input
                type="checkbox"
                checked={useCurrentAddress}
                onChange={() => setUseCurrentAddress(!useCurrentAddress)}
              />
              <label>Giao cho tôi</label>
            </div>
            <iframe
              title="map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(form.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="300"
              style={{ border: 0, margin: "20px 0", borderRadius: "10px" }}
            />
          </div>
        </div>

        {/* ===== CỘT PHẢI ===== */}
        <aside className="checkout-summary">
          <div className="summary-card">
            <h3>TÓM TẮT ĐƠN HÀNG:</h3>
            <ul>
              {cart.map((item) => (
                <li key={item.id} className="summary-item">
                  <span>{item.quantity} x {item.name}</span>
                  <span>{(item.price * item.quantity).toLocaleString()}₫</span>
                </li>
              ))}
            </ul>
            <div className="summary-line total">
              <span>Tổng thanh toán</span>
              <strong>{total.toLocaleString()}₫</strong>
            </div>
          </div>

          {/* 🧾 THÔNG TIN KHÁCH HÀNG */}
          <div className="customer-info-card">
            <h2>THÔNG TIN KHÁCH HÀNG:</h2>
            <form onSubmit={handleSubmit} className="checkout-form">
              <div className="form-group-inline">
                <div className="form-group">
                  <label>Họ</label>
                  <input type="text" name="lastName" value={form.lastName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Tên</label>
                  <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
              </div>

              <button type="submit" className="checkout-btn-primary" disabled={isProcessing}>
                {isProcessing ? "Đang xử lý..." : "Xác nhận đặt hàng"}
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* 🎉 POPUP SUCCESS */}
      {showSuccessPopup && (
        <div className="success-popup">
          <div className="success-popup-content">
            <h2>🎉 Đặt hàng thành công!</h2>
          </div>
        </div>
      )}
    </div>
  );
}
