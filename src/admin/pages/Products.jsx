import { useEffect, useState } from "react";
import { Table, Input, Select, Slider, Modal, message, Spin } from "antd";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "./Products.css";

export default function AdminProducts() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [restaurantsList, setRestaurantsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState("Tất cả");
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const { currentUser } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    restaurantId: "",
    price: 0,
    img: "",
    description: "",
  });

  // ===== FETCH DATA =====
  useEffect(() => {
    fetchDishes();
    fetchRestaurants();
  }, []);

  const fetchDishes = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/dishes", {
        params: {
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

  const fetchRestaurants = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/restaurants");
      const restaurantData = response.data.items;
      setRestaurantsList(restaurantData);
    } catch (err) {
      console.error("❌ Lỗi khi tải nhà hàng:", err);
      message.error("Không thể tải danh sách nhà hàng!");
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // ===== FILTER =====
  useEffect(() => {
    let filtered = data.filter((item) => {
      const matchName = item.name?.toLowerCase().includes(searchText.toLowerCase());
      const matchRestaurant =
        restaurantFilter === "Tất cả" || getRestaurantName(item.restaurantId) === restaurantFilter;
      const matchPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
      return matchName && matchRestaurant && matchPrice;
    });
    setFilteredData(filtered);
  }, [searchText, restaurantFilter, priceRange, data, restaurantsList]);

  // ===== HELPER =====
  const getRestaurantName = (id) => {
    const found = restaurantsList.find((r) => r.id === id);
    return found ? found.name : "Không rõ";
  };

  // ===== CRUD =====
  const handleAdd = async () => {
    // Kiểm tra dữ liệu đầu vào
    if (!form.name.trim()) return message.warning("⚠️ Vui lòng nhập tên món ăn!");
    if (restaurantFilter === "Tất cả") return message.warning("⚠️ Vui lòng chọn nhà hàng!");
    if (form.price === "" || isNaN(Number(form.price)))
      return message.warning("⚠️ Vui lòng nhập giá hợp lệ!");

    // Lấy ID nhà hàng từ restaurantFilter
    const selectedRestaurant = restaurantsList.find(r => r.name === restaurantFilter);
    const restaurantId = selectedRestaurant ? selectedRestaurant.id : null;

    if (!restaurantId) {
      return message.warning("❌ Không tìm thấy nhà hàng đã chọn.");
    }

    try {
      // Gọi API để thêm món ăn với ID nhà hàng
      const response = await axios.post(
        `http://localhost:8080/api/dishes/${restaurantId}`,  // Sử dụng ID nhà hàng thay vì tên nhà hàng
        {
          name: form.name.trim(),
          description: form.description.trim() || "",
          price: Number(form.price),
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,  // Thêm token vào headers
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
        restaurantId: "",
        price: 0,
        img: "",
        description: "",
      });

      // Tải lại danh sách món ăn
      fetchDishes();
    } catch (err) {
      console.error("🔥 Lỗi khi thêm món ăn:", err);
      message.error("❌ Có lỗi xảy ra khi thêm món ăn!");
    }
  };


  const handleDelete = async (id) => {
    // Tạm thời chưa xử lý xóa món ăn
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
            Authorization: `Bearer ${currentUser.token}`,  // Thêm token vào headers
          },
        }
      );
      const updatedDish = response.data.data;
      message.success("✏️ Đã cập nhật món ăn!");
      setShowEditModal(false);
      fetchDishes();
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
      render: (_, record) => getRestaurantName(record.restaurantId),
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
          <label>Nhà hàng:</label>
          <Select
            value={restaurantFilter}
            onChange={setRestaurantFilter}
            style={{ width: "100%" }}
            loading={loadingRestaurants}
            placeholder={loadingRestaurants ? "Đang tải..." : "Chọn nhà hàng"}
          >
            {["Tất cả", ...restaurantsList.map((r) => r.name)].map((rest, i) => (
              <Select.Option key={i} value={rest}>
                {rest}
              </Select.Option>
            ))}
          </Select>
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

        {/* Loại bỏ dropdown nhà hàng */}
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
