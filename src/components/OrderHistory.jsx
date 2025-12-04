import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./OrderHistory.css";

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser?.username) {
        console.log("⛔ Không có currentUser hoặc chưa đăng nhập");
        setLoading(false);
        return;
      }

      try {
        // Gọi API lấy đơn hàng từ server
        const response = await fetch(
          `http://localhost:8080/api/orders?filter=customer.username==${currentUser.username}`,
          {
              method: "GET",
              headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${currentUser.token}`,
              },
          }
        );
        const data = await response.json();

        if (data.status === 200) {
          let userOrders = data.data.items.map((order) => ({
            id: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            restaurantName: order.restaurantName,
            status: order.status,
            totalAmount: order.totalAmount,
            items: order.items,
            date: new Date(order.createdAt), // Chuyển đổi createdAt từ ISO string thành Date
          }));

          // ✅ Sắp xếp các đơn theo trạng thái
          userOrders = userOrders.sort((a, b) => {
            const priority = { "Chờ xác nhận": 1, "Đang giao": 2, "Đã giao": 3 };
            return priority[a.status] - priority[b.status];
          });

          setOrders(userOrders);
        } else {
          console.error("Lỗi khi lấy đơn hàng", data.message);
        }
      } catch (err) {
        console.error("🔥 Lỗi lấy lịch sử đơn hàng:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  if (loading) return <p className="loading-message">⏳ Đang tải lịch sử đơn hàng...</p>;

  return (
    <div className="order-history-page">
      <h2>Lịch sử đơn hàng</h2>

      {orders.length === 0 ? (
        <p className="no-orders-message">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((order) => (
            <li key={order.id} className="order-card">
              <div className="order-header">
                <h3>Đơn hàng #{order.id.substring(0, 6)}...</h3>
                <span>{order.date ? order.date.toLocaleDateString("vi-VN") : "N/A"}</span>
              </div>

              <div className="order-body">
                <ul className="order-items-list">
                  {order.items?.map((item, index) => (
                    <li key={`${order.id}-${index}`} className="order-item">
                      <span>{item.qty}x {item.dishName}</span>
                      <span>{(item.subtotal).toLocaleString()}₫</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="order-footer">
                <div className="order-total">
                  <strong>
                    Tổng tiền: {order.totalAmount ? order.totalAmount.toLocaleString() + "₫" : "Đang cập nhật"}
                  </strong>
                </div>

                <div className="order-status">
                  Trạng thái: <span className={`status-tag ${order.status?.replace(/\s+/g, "-").toLowerCase()}`}>{order.status}</span>
                </div>

                {/* ✅ NÚT THEO DÕI ĐƠN - CHỈ HIỆN NẾU CHỜ XÁC NHẬN HOẶC ĐANG GIAO */}
                {(order.status === "SHIPPING") && (
                  <button
                    className="track-btn"
                    onClick={() => navigate(`/waiting/${order.id}`)} // Điều hướng sang trang WaitingForConfirmation và truyền orderId
                  >
                    Theo dõi đơn
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrderHistory;
