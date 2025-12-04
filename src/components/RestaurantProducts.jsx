import { useEffect, useState } from "react";
import { Table, Input, Slider, Modal, message, Spin } from "antd";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import "./Products.css";

export default function AdminProducts() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const { currentUser } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    restaurantId: "", // restaurantId sẽ được gán tự động
    price: 0,
    description: "",
  });

  // ===== FETCH DATA =====
  useEffect(() => {
    if (currentUser) {
      fetchRestaurantId();
    }
  }, [currentUser]);

  // Lấy restaurantId từ userId (currentUser)
  const fetchRestaurantId = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/restaurants?filter=owner.username==${currentUser.username}`
      );
      const restaurantData = response.data.items;
      if (restaurantData && restaurantData.length > 0) {
        const restaurantId = restaurantData[0].id;
        fetchDishes(restaurantId);
      } else {
        message.error("❌ Không tìm thấy nhà hàng cho người dùng này!");
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải nhà hàng:", err);
      message.error("Không thể tải thông tin nhà hàng!");
    }
  };

  // Lấy danh sách món ăn theo restaurantId
  const fetchDishes = async (restaurantId) => {
    try {
      const response = await axios.get("http://localhost:8080/api/dishes", {
        params: {
          filter: `restaurant.id==${restaurantId}`, // Lọc món ăn theo restaurantId
          page: 1,
          size: 100, // Lấy tất cả món ăn
        },
      });
      const dishes = response.data.data.items;
      setData(dishes);
      setFilteredData(dishes);
    } catch (err) {
      console.error("❌ Lỗi khi tải món ăn:", err);
      message.error("Không thể tải danh sách món ăn!");
    } finally {
      setLoading(false);
    }
  };

  // ===== FILTER =====
  useEffect(() => {
    let filtered = data.filter((item) => {
      const matchName = item.name?.toLowerCase().includes(searchText.toLowerCase());
      const matchPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
      return matchName && matchPrice;
    });
    setFilteredData(filtered);
  }, [searchText, priceRange, data]);

  // ===== CRUD =====
  const handleAdd = async () => {
    // Kiểm tra dữ liệu đầu vào
    if (!form.name.trim()) return message.warning("⚠️ Vui lòng nhập tên món ăn!");
    if (form.price === "" || isNaN(Number(form.price)))
      return message.warning("⚠️ Vui lòng nhập giá hợp lệ!");

    // Tự động lấy restaurantId từ món ăn đầu tiên
    const restaurantId = filteredData.length > 0 ? filteredData[0].restaurantId : null;
    if (!restaurantId) {
      return message.warning("❌ Không tìm thấy nhà hàng cho món ăn này.");
    }

    try {
      // Gọi API để thêm món ăn với ID nhà hàng
      const response = await axios.post(
        `http://localhost:8080/api/dishes/${restaurantId}`, // Sử dụng ID nhà hàng thay vì tên nhà hàng
        {
          name: form.name.trim(),
          description: form.description.trim() || "",
          price: Number(form.price),
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`, // Thêm token vào headers
          },
        }
      );
      const newDish = response.data.data;
      message.success(`✅ Đã thêm món ăn "${newDish.name}" cho nhà hàng!`);

      // Reset form và đóng modal
      setShowAddModal(false);
      setForm({
        id: "",
        name: "",
        restaurantId: "", // restaurantId không cần nhập nữa
        price: 0,
        description: "",
      });

      // Tải lại danh sách món ăn
      fetchDishes(restaurantId);
    } catch (err) {
      console.error("🔥 Lỗi khi thêm món ăn:", err);
      message.error("❌ Có lỗi xảy ra khi thêm món ăn!");
    }
  };

  const handleDelete = async (id) => {
    message.warning("❌ Chức năng xóa chưa được tích hợp.");
  };

  const handleEdit = async () => {
    try {
      const response = await axios.put(
        `http://localhost:8080/api/dishes/${form.id}/restaurant/${form.restaurantId}`,
        {
          name: form.name.trim(),
          description: form.description.trim() || "",
          price: Number(form.price),
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`, // Thêm token vào headers
          },
        }
      );
      const updatedDish = response.data.data;
      message.success("✏️ Đã cập nhật món ăn!");
      setShowEditModal(false);
      fetchDishes(form.restaurantId);
    } catch (err) {
      console.error("🔥 Lỗi cập nhật món ăn:", err);
      message.error("❌ Cập nhật thất bại!");
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "Tên món ăn",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Nhà hàng",
      render: (_, record) => record.restaurantId, // Hiển thị restaurantId
    },
    {
      title: "Giá (VND)",
      dataIndex: "price",
      render: (p) => p?.toLocaleString(),
      sorter: (a, b) => a.price - b.price,
    },
    { title: "Mô tả", dataIndex: "description", ellipsis: true },
    {
      title: "Hành động",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="edit-btn"
            onClick={() => {
              setForm(record);
              setShowEditModal(true);
            }}
          >
            ✏️ Sửa
          </button>
          <button className="delete-btn" onClick={() => handleDelete(record.id)}>
            ❌ Xóa
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 60 }}>
        <Spin size="large" tip="Đang tải dữ liệu..." fullscreen />
      </div>
    );
  }

  return (
    <div className="products-page">
      <h1 className="page-title">🍔 Quản lý món ăn (Admin)</h1>

      {/* ===== FILTER ===== */}
      <div className="filter-container">
        <div className="filter-item">
          <label>Tìm kiếm:</label>
          <Input placeholder="Nhập tên món ăn..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>

        <div className="filter-item">
          <label>Khoảng giá:</label>
          <div className="price-range">
            <Slider
              range
              min={0}
              max={1000000}
              step={10000}
              value={priceRange}
              onChange={setPriceRange}
              tooltip={{ formatter: null }}
            />
            <div className="price-values">
              <span>{priceRange[0].toLocaleString()} ₫</span>
              <span>{priceRange[1].toLocaleString()} ₫</span>
            </div>
          </div>
        </div>

        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          ➕ Thêm món ăn
        </button>
      </div>

      {/* ===== TABLE ===== */}
      <Table columns={columns} dataSource={filteredData} rowKey="id" pagination={{ pageSize: 6 }} />

      {/* ===== ADD MODAL ===== */}
      <Modal
        open={showAddModal}
        title="Thêm món ăn mới"
        onCancel={() => setShowAddModal(false)}
        onOk={handleAdd}
        okText="Thêm"
        centered
      >
        <label>Tên món ăn</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label>Giá</label>
        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />

        <label>Mô tả</label>
        <Input.TextArea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        open={showEditModal}
        title="Chỉnh sửa món ăn"
        onCancel={() => setShowEditModal(false)}
        onOk={handleEdit}
        okText="Cập nhật"
        centered
      >
        <label>Tên món ăn</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label>Giá</label>
        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />

        <label>Mô tả</label>
        <Input.TextArea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Modal>
    </div>
  );
}
