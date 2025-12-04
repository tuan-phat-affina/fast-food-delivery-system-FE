import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "./WaitingForConfirmation.css";

// Firebase import
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

// -------------------- HÀM HELPER --------------------
function formatTime(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return "";
  if (totalSeconds < 1) return "Đã đến nơi";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (minutes > 0) return `${minutes} phút ${seconds} giây`;
  return `${seconds} giây`;
}

function formatDistance(totalMeters) {
  if (totalMeters === null || totalMeters === undefined) return "";
  if (totalMeters < 1) return "0 km";
  const kilometers = totalMeters / 1000;
  return `${kilometers.toFixed(1)} km`;
}

// -------------------- COMPONENT: ROUTING MACHINE --------------------
function RoutingMachine({ from, to, onRouteFound }) {
  const map = useMap();
  const routingControlRef = useRef(null);
  useEffect(() => {
    if (!map || !from || !to) return;

    if (routingControlRef.current) {
      try {
        routingControlRef.current.getPlan()?.setWaypoints([]);
        map.removeControl(routingControlRef.current);
      } catch (e) {
        console.warn("⚠️ Không thể xóa routing control cũ:", e);
      }
      routingControlRef.current = null;
    }

    const control = L.Routing.control({
      router: L.Routing.osrmv1({
        serviceUrl: "https://routing.openstreetmap.de/routed-car/route/v1",
      }),
      waypoints: [L.latLng(from.lat, from.lng), L.latLng(to.lat, to.lng)],
      lineOptions: { styles: [{ color: "#007bff", weight: 5, opacity: 0.8 }] },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      show: false, // ⛔ Ẩn bảng hướng dẫn
      createMarker: () => null,
    });

    control.on("routesfound", (e) => {
      if (e.routes && e.routes[0]) {
        const route = e.routes[0];
        onRouteFound({
          coordinates: route.coordinates,
          distance: route.summary.totalDistance,
          time: route.summary.totalTime,
        });
      }
    });

    try {
      control.addTo(map);
      routingControlRef.current = control;
    } catch (e) {
      console.warn("⚠️ Không thể add routing control:", e);
    }

    return () => {
      if (routingControlRef.current) {
        try {
          routingControlRef.current.getPlan()?.setWaypoints([]);
          map.removeControl(routingControlRef.current);
        } catch (e) {
          console.warn("⚠️ Bỏ qua lỗi removeControl khi cleanup:", e);
        }
        routingControlRef.current = null;
      }
    };
  }, [map, from, to, onRouteFound]);
}

// -------------------- COMPONENT CHÍNH --------------------
export default function WaitingForConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [drone, setDrone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restaurantPos, setRestaurantPos] = useState(null);
  const [customerPos, setCustomerPos] = useState(null);
  const [dronePos, setDronePos] = useState(null);
  const [routePoints, setRoutePoints] = useState(null);
  const [totalDistance, setTotalDistance] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const { currentUser } = useAuth();

  // -------------------- FETCH DỮ LIỆU ĐƠN HÀNG --------------------
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(
          `http://localhost:8080/api/orders?filter=id==${orderId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentUser.token}`,
            },
          }
        );
        const data = await response.json();

        if (data.status === 200 && data.data.items.length > 0) {
          const orderData = data.data.items[0];

          // Cập nhật thông tin vị trí nhà hàng và khách hàng
          setRestaurantPos({
            lat: orderData.deliveryTask.pickupLat,
            lng: orderData.deliveryTask.pickupLng,
          });
          setCustomerPos({
            lat: orderData.deliveryTask.dropoffLat,
            lng: orderData.deliveryTask.dropoffLng,
          });

          // Cập nhật thông tin đơn hàng
          setOrder({
            id: orderData.id,
            status: orderData.status,
            restaurantName: orderData.restaurantName,
            customer: orderData.customerName,
            items: orderData.items,
          });

          // Khi dữ liệu đã được lấy xong, set loading thành false
          setLoading(false);
        } else {
          console.error("Không tìm thấy đơn hàng.");
          setLoading(false); // Set loading thành false trong trường hợp không tìm thấy đơn hàng
        }
      } catch (err) {
        console.error("Lỗi khi gọi API đơn hàng:", err);
        setLoading(false); // Set loading thành false nếu có lỗi
      }
    };

    fetchOrderDetails();
  }, [orderId, currentUser.token]);

  // -------------------- MÔ PHỎNG DRONE BAY --------------------
  useEffect(() => {
    if (!order || !routePoints || !customerPos || !restaurantPos || totalTime === null || totalDistance === null)
      return;

    if (order.status === "SHIPPING") {
      setDronePos(restaurantPos);
      let currentStep = 0;
      const totalSteps = routePoints.length;
      const intervalTime = 200;

      const move = setInterval(() => {
        if (currentStep >= totalSteps) {
          clearInterval(move);
          setDronePos(customerPos);
          setRemainingTime(0);
          setRemainingDistance(0);
        } else {
          const currentPoint = routePoints[currentStep];
          setDronePos({ lat: currentPoint.lat, lng: currentPoint.lng });
          const progress = currentStep / totalSteps;
          setRemainingTime(totalTime * (1 - progress));
          setRemainingDistance(totalDistance * (1 - progress));
          currentStep++;
        }
      }, intervalTime);

      return () => clearInterval(move);
    }

    if (order.status === "Đã giao") {
      setDronePos(customerPos);
      setRemainingTime(0);
    }
  }, [order, routePoints, customerPos, restaurantPos, totalDistance, totalTime]);

  // -------------------- XÁC NHẬN NHẬN HÀNG --------------------
  const handleConfirmReceived = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/orders/${orderId}/confirmed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );
      const data = await response.json();

      if (data.status === 200) {
        alert("✅ Đơn hàng đã được xác nhận nhận!");
        navigate("/"); // Chuyển hướng về trang chủ
      } else {
        alert("❌ Không thể xác nhận nhận hàng.");
      }
    } catch (err) {
      console.error("Lỗi khi xác nhận nhận hàng:", err);
      alert("❌ Không thể xác nhận nhận hàng.");
    }
  };

  const handleRouteFound = useCallback(({ coordinates, distance, time }) => {
    setRoutePoints(coordinates);
    setTotalDistance(distance);
    setTotalTime(time);
    setRemainingDistance(distance);
    setRemainingTime(time);
  }, []);

  // -------------------- RENDER --------------------
  if (loading) return <p>⏳ Đang tải dữ liệu đơn hàng và bản đồ...</p>;
  if (!order) return <p>❌ Không tìm thấy đơn hàng #{orderId}</p>;
  if (!restaurantPos || !customerPos)
    return <p>❌ Không thể tải tọa độ nhà hàng hoặc khách hàng.</p>;

  // Icon — thay icon bị 404 bằng icon mặc định
  const droneIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/10419/10419013.png",
    iconSize: [40, 40],
  });
  const restaurantIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [35, 35],
  });
  const customerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [35, 35],
  });

  return (
    <div className="wfc-page">
      <h2>📦 Theo dõi đơn hàng #{order.id}</h2>

      <div className="wfc-container">
        <div className="wfc-info-panel">
          <div className="wfc-info-content">
            <h3>Chi tiết đơn hàng</h3>
            <p><strong>Nhà hàng:</strong> {order.restaurantName}</p>
            <p><strong>Khách hàng:</strong> {order.customer}</p>
            <div className="wfc-item-list">
              <strong>Món ăn đã đặt:</strong>
              <ul>
                {order.items?.map((item) => (
                  <li key={item.id}>
                    {item.qty} x {item.dishName}
                  </li>
                ))}
              </ul>
            </div>

            <p><strong>Tổng tiền:</strong> {order.totalAmount?.toLocaleString()}₫</p>
            <p><strong>Trạng thái:</strong> {order.status}</p>

            <h3 className="wfc-tracking-details">Theo dõi trực tiếp</h3>
            <p><strong>Khoảng cách còn lại:</strong> {formatDistance(remainingDistance)}</p>
            <p><strong>Thời gian còn lại:</strong> {formatTime(remainingTime)}</p>
          </div>

          {(order.status === "SHIPPING") &&
            remainingDistance !== null &&
            remainingDistance < 80 && ( // < 80m mới hiện
              <button className="wfc-btn-received" onClick={handleConfirmReceived}>
                ✅ Xác nhận nhận hàng
              </button>
          )}
        </div>

        <div className="wfc-map-panel">
          <MapContainer
            center={dronePos || restaurantPos}
            zoom={15}
            style={{ height: "700px", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {dronePos && <Marker position={dronePos} icon={droneIcon}><Popup>🚁 Drone đang giao hàng</Popup></Marker>}
            <Marker position={restaurantPos} icon={restaurantIcon}><Popup>🍽️ Nhà hàng</Popup></Marker>
            <Marker position={customerPos} icon={customerIcon}><Popup>🏠 Khách hàng</Popup></Marker>

            <RoutingMachine from={restaurantPos} to={customerPos} onRouteFound={handleRouteFound} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
