import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { message } from "antd";
import jwt_decode from "jwt-decode"; // Import đúng cách
import "./Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Kiểm tra tên đăng nhập và mật khẩu không được để trống
    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    try {
      // Gửi request đăng nhập
      const response = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      // Lấy dữ liệu từ response
      const data = await response.json();

      if (!response.ok || !data.authenticated) {
        setError("Tên đăng nhập hoặc mật khẩu không chính xác.");
        return;
      }

      // --- Giải mã token để lấy thông tin từ token ---
      const decodedToken = jwt_decode(data.token);
      const { scope } = decodedToken; // Lấy scope từ token

      // Cập nhật role và scope từ decoded token
      const role = scope === "ADMIN" ? "admin" : scope.toLowerCase(); // Giả sử `ADMIN` -> "admin", còn lại có thể là "customer", "restaurant", ...

      // Lưu thông tin user và token vào localStorage và context
      const fullUserData = {
        username,
        token: data.token,
        role,  // Cập nhật role vào userData
        scope, // Lưu scope vào userData để có thể dùng sau này
      };

      localStorage.setItem("currentUser", JSON.stringify(fullUserData));
      setCurrentUser(fullUserData);

      // Hiển thị thông báo thành công
      message.success(`Chào mừng, ${username} 👋`, 2);

      // Điều hướng đến trang tương ứng với role
      switch (role) {
        case "admin":
          navigate("/admin");
          break;
        case "restaurant":
          navigate("/restaurantadmin");
          break;
        case "customer":
        default:
          navigate("/");
          break;
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Đã có lỗi xảy ra khi đăng nhập.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Đăng Nhập</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              type="text"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-btn">Đăng nhập</button>
        </form>

        <p className="register-link">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
