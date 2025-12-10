import React, { useEffect, useState } from "react";
import { message, Select } from "antd";
import "./Dashboard.css";
import { useAuth } from "../context/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function AdminDashboard() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);

  // Month / Year selectable
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  const [chartData, setChartData] = useState([]);

  // 1️⃣ Lấy restaurantId của owner
  const loadRestaurantId = async () => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/restaurants?filter=owner.username==${currentUser.username}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${currentUser.token}` },
        }
      );

      const json = await res.json();
      if (!json.items || json.items.length === 0) {
        throw new Error("Không có nhà hàng nào cho owner này");
      }

      setRestaurantId(json.items[0].id);
    } catch (err) {
      console.error("🔥 Lỗi lấy restaurantId:", err);
      message.error("Không thể tải thông tin nhà hàng của bạn");
    }
  };

  // 2️⃣ Load Dashboard Stats
  const loadDashboardData = async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      // --- API: tổng revenue & orders theo tháng ---
      const revenueRes = await fetch("http://localhost:8080/api/revenue/monthly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          restaurantId,
          year,
          month,
        }),
      });

      const revenueJson = await revenueRes.json();
      if (revenueJson.status !== 200) {
        throw new Error("Lỗi API /revenue/monthly");
      }

      // --- API: tổng nhà hàng ---
      const restRes = await fetch("http://localhost:8080/api/revenue/restaurant", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      const restJson = await restRes.json();
      if (restJson.status !== 200) {
        throw new Error("Lỗi API /revenue/restaurant");
      }

      setStats({
        totalUsers: 0,
        totalRestaurants: restJson.data,
        totalOrders: revenueJson.data.totalOrders,
        totalRevenue: revenueJson.data.totalRevenue,
      });

      // Dummy chart (nếu bạn có API real thì thay vào đây)
      const fakeChart = [
        { date: "01", revenue: 120000, count: 1 },
        { date: "05", revenue: 340000, count: 2 },
        { date: "10", revenue: 500000, count: 2 },
        { date: "15", revenue: 680000, count: 3 },
        { date: "20", revenue: 200045, count: 1 },
      ];
      setChartData(fakeChart);
    } catch (err) {
      console.error("🔥 Lỗi load Dashboard:", err);
      message.error("Không thể tải dữ liệu Dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Load restaurant ID lúc component mount
  useEffect(() => {
    loadRestaurantId();
  }, []);

  // Khi restaurantId, month hoặc year thay đổi → reload dashboard
  useEffect(() => {
    if (restaurantId) loadDashboardData();
  }, [restaurantId, month, year]);

  if (loading) return <div className="loading">⏳ Đang tải dữ liệu...</div>;

  return (
    <div className="dashboard">
      <h1>📊 BẢNG QUẢN TRỊ HỆ THỐNG</h1>

      {/* Bộ chọn tháng năm */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <Select
          value={month}
          style={{ width: 120 }}
          onChange={setMonth}
          options={Array.from({ length: 12 }, (_, i) => ({
            value: i + 1,
            label: `Tháng ${i + 1}`,
          }))}
        />

        <Select
          value={year}
          style={{ width: 120 }}
          onChange={setYear}
          options={[2024, 2025, 2026].map((y) => ({
            value: y,
            label: y,
          }))}
        />
      </div>

      {/* Cards */}
      <div className="cards">

        <div className="card green">
          <h2>{stats.totalOrders}</h2>
          <p>Số đơn hàng tháng {month}</p>
        </div>

        <div className="card blue">
          <h2>{stats.totalRevenue.toLocaleString()}₫</h2>
          <p>Doanh thu tháng {month}/{year}</p>
        </div>
      </div>

      {/* ==== Charts ==== */}
      <div className="charts">
        <div className="chart-container">
          <h3>💰 Doanh thu theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => `${v.toLocaleString()}₫`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#4f46e5"
                strokeWidth={3}
                name="Doanh thu"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>📦 Số đơn hàng theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="count"
                fill="#10b981"
                name="Số đơn hàng"
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
