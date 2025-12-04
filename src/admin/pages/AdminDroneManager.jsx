import React, { useState, useEffect } from "react";
import { Table, Input, Select, message, Modal, Button, Form, Row, Col } from "antd";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'; // Import icons from Ant Design
import axios from "axios";

const DRONE_STATUS = ["AVAILABLE", "DELIVERING", "MAINTENANCE", "OFFLINE"];

export default function AdminDroneManager() {
  const [drones, setDrones] = useState([]);
  const [form, setForm] = useState({
    code: "",
    status: "AVAILABLE",
    batteryLevel: 100,
    currentLat: 0,
    currentLng: 0,
  });
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 5,
    totalItems: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal visibility state
  const [isEditing, setIsEditing] = useState(false); // Track if we are in edit mode
  const [filters, setFilters] = useState({
    status: "",
  });

  // Hàm tạo chuỗi filter theo định dạng RSQL
  const buildFilterQuery = () => {
    const filterParts = [];
    if (filters.status) {
      filterParts.push(`status==${filters.status}`);
    }
    return filterParts.join(';');
  };

  // Hàm gọi API để lấy danh sách drone
  const fetchDrones = async (page = 1, size = 5) => {
    const token = localStorage.getItem("currentUser")
      ? JSON.parse(localStorage.getItem("currentUser")).token
      : null;

    if (!token) {
      message.error("Bạn cần đăng nhập để xem danh sách drones!");
      return;
    }

    setLoading(true);
    try {
      const filterQuery = buildFilterQuery(); // Lấy chuỗi filter từ các giá trị filter
      const response = await axios.get(
        `http://localhost:8080/api/drones`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: page,
            size: size,
            sort: "code,asc", // Sort mặc định
            filter: filterQuery, // Truyền filter vào query params
            all: false, // Nếu bạn muốn phân trang
          },
        }
      );

      const { items, currentItemCount, totalItems } = response.data;
      setDrones(items);
      setPagination({
        ...pagination,
        totalItems,
        currentPage: page,
      });
    } catch (error) {
      console.error("Fetch drones error:", error);
      message.error("Có lỗi khi tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý thay đổi trang và kích thước trang
  const handleTableChange = (pagination) => {
    fetchDrones(pagination.current, pagination.pageSize);
  };

  // Hàm thêm mới hoặc cập nhật drone
  const handleSave = async () => {
    const token = localStorage.getItem("currentUser")
      ? JSON.parse(localStorage.getItem("currentUser")).token
      : null;

    if (!token) {
      message.error("Bạn cần đăng nhập để thực hiện thao tác này!");
      return;
    }

    try {
      let response;
      if (isEditing) {
        // Cập nhật drone
        response = await axios.put(
          `http://localhost:8080/api/drones/${form.code}`,
          form,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        message.success("Cập nhật drone thành công!");
      } else {
        // Thêm mới drone
        response = await axios.post(
          "http://localhost:8080/api/drones",
          form,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        message.success("Thêm drone thành công!");
      }

      // Sau khi thêm hoặc cập nhật, làm mới danh sách drone
      fetchDrones(pagination.currentPage, pagination.pageSize);
      setForm({ code: "", status: "AVAILABLE", batteryLevel: 100, currentLat: 0, currentLng: 0 });
      setIsModalVisible(false); // Đóng modal
      setIsEditing(false); // Reset chế độ chỉnh sửa
    } catch (error) {
      console.error("Save drone error:", error);
      message.error(isEditing ? "Có lỗi khi cập nhật drone!" : "Có lỗi khi thêm drone!");
    }
  };

  // Hàm xử lý thay đổi trong form
  const handleFormChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  // Hàm xử lý thay đổi bộ lọc
  const handleFilterChange = (value) => {
    setFilters({ ...filters, status: value });
  };

  // Lấy danh sách drone khi component mount hoặc khi có thay đổi pagination/filter
  useEffect(() => {
    fetchDrones(pagination.currentPage, pagination.pageSize);
  }, [pagination.currentPage, pagination.pageSize, filters]);

  const columns = [
    {
      title: "Mã Drone",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "Vĩ độ",
      dataIndex: "currentLat",
      key: "currentLat",
    },
    {
      title: "Kinh độ",
      dataIndex: "currentLng",
      key: "currentLng",
    },
    {
      title: "Mức Pin",
      dataIndex: "batteryLevel",
      key: "batteryLevel",
    },
    {
      title: "Hành động",
      key: "actions",
      render: (text, record) => (
        <div>
          <Button
            type="link"
            icon={<EditOutlined />} // Sử dụng icon sửa
            onClick={() => {
              setForm({
                code: record.code,
                status: record.status,
                currentLat: record.currentLat,
                currentLng: record.currentLng,
                batteryLevel: record.batteryLevel,
              });
              setIsModalVisible(true); // Open modal for edit
              setIsEditing(true); // Chuyển sang chế độ chỉnh sửa
            }}
          >
            Sửa
          </Button>
          <Button
            type="link"
            icon={<DeleteOutlined />} // Sử dụng icon xóa
            onClick={() => handleDelete(record.code)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-drone-manager">
      <h1 style={{ marginBottom: "20px" }}>Quản lý Drone</h1>

      {/* Filter by status */}
      <div className="filters" style={{ marginBottom: "20px" }}>
        <Form layout="inline">
          <Row gutter={16}>
            <Col>
              <Form.Item label="Trạng thái">
                <Select
                  value={filters.status}
                  onChange={handleFilterChange}
                  options={DRONE_STATUS.map((status) => ({
                    label: status,
                    value: status,
                  }))}
                  placeholder="Chọn trạng thái"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      {/* Button to open modal for adding drone */}
      <Button
        type="primary"
        onClick={() => {
          setIsModalVisible(true);
          setIsEditing(false); // Set to add new drone
        }}
        style={{ marginBottom: "20px" }}
      >
        Thêm Drone
      </Button>

      {/* Modal for adding or editing drone */}
      <Modal
        title={isEditing ? "Cập nhật Drone" : "Thêm Drone"}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSave}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label="Mã Drone">
            <Input
              placeholder="Nhập mã drone"
              value={form.code}
              onChange={(e) => handleFormChange("code", e.target.value)}
              disabled={isEditing} // Disable code input in edit mode
            />
          </Form.Item>
          <Form.Item label="Trạng thái">
            <Select
              value={form.status}
              onChange={(value) => handleFormChange("status", value)}
              options={DRONE_STATUS.map((status) => ({
                label: status,
                value: status,
              }))}
            />
          </Form.Item>
          <Form.Item label="Mức Pin">
            <Input
              placeholder="Nhập mức pin"
              type="number"
              value={form.batteryLevel}
              onChange={(e) => handleFormChange("batteryLevel", e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Vĩ độ">
            <Input
              placeholder="Nhập vĩ độ"
              type="number"
              value={form.currentLat}
              onChange={(e) => handleFormChange("currentLat", e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Kinh độ">
            <Input
              placeholder="Nhập kinh độ"
              type="number"
              value={form.currentLng}
              onChange={(e) => handleFormChange("currentLng", e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Table to display drones */}
      <Table
        rowKey="code"
        columns={columns}
        dataSource={drones}
        pagination={{
          current: pagination.currentPage,
          pageSize: pagination.pageSize,
          total: pagination.totalItems,
        }}
        loading={loading}
        onChange={handleTableChange}
      />
    </div>
  );
}
