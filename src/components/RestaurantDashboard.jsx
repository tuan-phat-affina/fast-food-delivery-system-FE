import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { Input, Table, Tag, Select, Modal, Button, Progress, notification } from "antd";
import "./Orders.css";

export default function OrdersList() {
  const { currentUser } = useAuth(); // Lấy thông tin người dùng hiện tại
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");

  // State modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [action, setAction] = useState("ACCEPT"); // Chọn hành động: ACCEPT / REJECT
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false); // Modal confirm
  const [isDroneModalVisible, setIsDroneModalVisible] = useState(false); // Modal drone progress
  const [droneProgress, setDroneProgress] = useState(0); // Tiến độ drone
  const [loadingDrone, setLoadingDrone] = useState(false); // Trạng thái quá trình drone

  // Fetch Orders từ API
  useEffect(() => {
    async function fetchOrders() {
      if (!currentUser) return; // Nếu chưa có user, không lấy data

      try {
        const userId = currentUser.username; // Giả sử bạn lấy id của currentUser
        console.log("user: ", currentUser);

        const filterConditions = [];

        if (statusFilter && statusFilter !== "all") {
          filterConditions.push(`status==${statusFilter}`);
        }
        if (restaurantFilter && restaurantFilter !== "all") {
          filterConditions.push(`restaurant.name==${restaurantFilter}`);
        }

        const now = new Date();
        if (timeFilter !== "all") {
          let timeFilterCondition = "";
          if (timeFilter === "24h") {
            const last24h = new Date(now - 24 * 60 * 60 * 1000); // 24h trước
            timeFilterCondition = `createdAt>=${last24h.toISOString()}`;
          }
          if (timeFilter === "3d") {
            const last3Days = new Date(now - 72 * 60 * 60 * 1000); // 3 ngày trước
            timeFilterCondition = `createdAt>=${last3Days.toISOString()}`;
          }
          if (timeFilter === "7d") {
            const last7Days = new Date(now - 168 * 60 * 60 * 1000); // 7 ngày trước
            timeFilterCondition = `createdAt>=${last7Days.toISOString()}`;
          }
          if (timeFilterCondition) {
            filterConditions.push(timeFilterCondition);
          }
        }

        let filterQuery = "";
        if (filterConditions.length > 0) {
          filterQuery = ` and ${filterConditions.join(" and ")}`;
        }

        const response = await fetch(
          `http://localhost:8080/api/orders?filter=restaurant.owner.username==${userId}${filterQuery}`,
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
          setOrders(data.data.items);
        }
      } catch (error) {
        console.error("❌ Lỗi tải đơn hàng:", error);
      }
    }

    fetchOrders();
  }, [currentUser, search, statusFilter, timeFilter, restaurantFilter]);

  // Filter + Sort Orders
  const filteredOrders = useMemo(() => {
    return orders.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);

      const timeA = dateA.getTime ? dateA.getTime() : 0;
      const timeB = dateB.getTime ? dateB.getTime() : 0;

      return timeB - timeA;
    });
  }, [orders]);

  // Xử lý khi người dùng bấm vào đơn hàng có status "PREPARING"
  const handleOrderClick = (order) => {
    if (order.status === "PREPARING") {
      setSelectedOrder(order); // Lưu đơn hàng đã chọn
      setIsModalVisible(true); // Mở modal
    }
    if (order.status === "COOKING") {
      setSelectedOrder(order); // Lưu đơn hàng đã chọn
      setIsConfirmModalVisible(true); // Mở modal xác nhận
    }
  };

  // Xử lý khi người dùng chọn hành động và bấm Submit
  const handleSubmitAction = async () => {
    if (!selectedOrder || !action) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/orders/${selectedOrder.id}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify({ action }),
        }
      );

      const data = await response.json();
      if (data.status === 200) {
        // Nếu thành công, đóng modal và gọi lại API để lấy danh sách đơn hàng
        setIsModalVisible(false);
        setSelectedOrder(null);
        setAction("");
        fetchOrders(); // Gọi lại API để làm mới danh sách đơn hàng
      } else {
        console.error("Lỗi cập nhật trạng thái đơn hàng");
      }
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật trạng thái đơn hàng:", error);
    }
  };

  // Xác nhận đã chuẩn bị xong (COOKING -> DRONE PICKUP)
  const handleConfirmCooking = async () => {
    if (!selectedOrder) return;

    try {
      // Cập nhật trạng thái đơn hàng thành "DRONE_PICKUP"
      const response = await fetch(
        `http://localhost:8080/api/orders/${selectedOrder.id}/pick-up`,
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
        // Thành công, bắt đầu mô phỏng quá trình drone
        setIsConfirmModalVisible(false);
        startDroneProcess();
      } else {
        console.error("❌ Lỗi cập nhật trạng thái đơn hàng");
      }
    } catch (error) {
      console.error("❌ Lỗi khi xác nhận chuẩn bị xong:", error);
    }
  };

  // Mô phỏng quá trình drone
  const startDroneProcess = () => {
    setLoadingDrone(true);
    let progress = 0;
    const interval = setInterval(() => {
      if (progress < 100) {
        progress += 20;
        setDroneProgress(progress);
      } else {
        clearInterval(interval);
        setLoadingDrone(false);
        setIsDroneModalVisible(false);
        notification.success({
          message: "Drone đã tới nhận hàng!",
          description: "Quá trình giao hàng đã hoàn thành.",
        });
        fetchOrders(); // Gọi lại API để làm mới danh sách đơn hàng
      }
    }, 1000); // Cập nhật mỗi 1s, mô phỏng khoảng 5s
  };

  // Các cột trong bảng
  const columns = [
    { title: "Mã ĐH", dataIndex: "id", key: "id" },
    { title: "Khách hàng", dataIndex: "customerName", key: "customer" },
    { title: "SĐT", dataIndex: "customerPhone", key: "phone" },
    {
      title: "Nhà hàng",
      dataIndex: "restaurantName",
      key: "restaurantName",
      render: (_, record) =>
        record.restaurantName || record.restaurant?.name || "—",
    },
    {
      title: "Ngày đặt",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val) => (val ? val.toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Thành tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (val) => `${Number(val || 0).toLocaleString("vi-VN")}₫`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status = "") => {
        const s = status.toUpperCase();
        let color = "blue";

        if (s === "DELIVERED") color = "green";
        else if (s === "SHIPPING") color = "geekblue";
        else if (s === "PENDING" || s === "PREPARING") color = "orange";
        else if (s === "COOKING") color = "volcano";
        else if (s === "CANCELLED") color = "red";

        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>📦 Quản lý đơn hàng</h1>
      </div>

      <div className="filter-container">
        <div className="filter-item">
          <label>Tìm kiếm:</label>
          <Input
            placeholder="Nhập tên hoặc mã đơn hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>

        <div className="filter-item">
          <label>Trạng thái:</label>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "Chờ xác nhận", value: "PENDING" },
              { label: "Đang xử lý", value: "PREPARING" },
              { label: "Đang chế biến", value: "COOKING" },
              { label: "Đang giao", value: "SHIPPING" },
              { label: "Đã giao", value: "DELIVERED" },
              { label: "Đã huỷ", value: "CANCELLED" },
            ]}
          />
        </div>

        <div className="filter-item">
          <label>Thời gian:</label>
          <Select
            value={timeFilter}
            onChange={setTimeFilter}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "24 giờ", value: "24h" },
              { label: "3 ngày", value: "3d" },
              { label: "7 ngày", value: "7d" },
            ]}
          />
        </div>

        <div className="filter-item">
          <label>Nhà hàng:</label>
          <Select
            value={restaurantFilter}
            onChange={setRestaurantFilter}
            options={[
              { label: "Tất cả", value: "all" },
              ...Array.from(
                new Set(
                  orders.map((o) => o.restaurantName || o.restaurant?.name)
                )
              )
                .filter(Boolean)
                .map((r) => ({ label: r, value: r })),
            ]}
            showSearch
            optionFilterProp="label"
          />
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        pagination={{ pageSize: 8 }}
        className="orders-table"
        onRow={(record) => ({
          onClick: () => handleOrderClick(record), // Bấm vào đơn hàng
        })}
      />

      {/* Modal để tiếp nhận hoặc huỷ đơn hàng */}
      <Modal
        title="Cập nhật trạng thái đơn hàng"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmitAction}
          >
            Submit
          </Button>,
        ]}
      >
        <Select
          value={action}
          onChange={setAction}
          getPopupContainer={(trigger) => trigger.parentNode}
          options={[
            { label: "Tiếp nhận đơn hàng", value: "ACCEPT" },
            { label: "Huỷ đơn hàng", value: "REJECT" },
          ]}
        />
      </Modal>

      {/* Modal xác nhận đã chuẩn bị xong */}
      <Modal
        title="Xác nhận đã chuẩn bị xong"
        open={isConfirmModalVisible}
        onCancel={() => setIsConfirmModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsConfirmModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleConfirmCooking}
          >
            Xác nhận
          </Button>,
        ]}
      >
        <p>Chắc chắn đơn hàng đã chuẩn bị xong và sẵn sàng giao cho drone?</p>
      </Modal>

      {/* Modal tiến độ drone */}
      <Modal
        title="Drone đang nhận hàng"
        open={isDroneModalVisible}
        footer={null}
        closable={false}
      >
        <Progress percent={droneProgress} />
        {loadingDrone && <p>Đang nhận hàng...</p>}
      </Modal>
    </div>
  );
}
