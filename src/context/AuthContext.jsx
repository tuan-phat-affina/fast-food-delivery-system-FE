import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { message } from "antd";
import jwt_decode from "jwt-decode"; // Import đúng cách

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      console.log("🟡 [Auth] Bắt đầu kiểm tra user...");
      try {
        const stored = JSON.parse(localStorage.getItem("currentUser"));
        if (stored && stored.token) {
          // ✅ Hiển thị tạm user local để tránh flicker
          setCurrentUser(stored);

          console.log("📦 [Auth] Có user trong local:", stored.username);

          // --- Giải mã token để lấy thông tin từ JWT ---
          const decodedToken = jwt_decode(stored.token);
          console.log("🔑 [Auth] Token decoded:", decodedToken);

          // Lấy scope và sub từ decoded token
          const { scope, sub } = decodedToken;
          console.log("🔑 [Auth] Scope từ token:", scope);
          console.log("🔑 [Auth] Sub từ token:", sub);  // In ra sub

          // Kiểm tra xem tài khoản có bị chặn không
          if (scope === "banned") {
            message.error("🚫 Tài khoản bị chặn!");
            localStorage.removeItem("currentUser");
            setCurrentUser(null);
            setTimeout(() => (window.location.href = "/login"), 2000);
            return;
          }

          // Lấy thêm thông tin người dùng từ Firestore nếu cần thiết
          const snap = await getDoc(doc(db, "users", stored.uid));
          if (snap.exists()) {
            const dbUser = snap.data();
            console.log("🔥 [Auth] Lấy user từ Firestore:", dbUser.role);
            if (dbUser.status === "banned") {
              message.error("🚫 Tài khoản bị chặn!");
              localStorage.removeItem("currentUser");
              setCurrentUser(null);
              setTimeout(() => (window.location.href = "/login"), 2000);
              return;
            }
            // Cập nhật role, scope và sub vào user
            const updatedUser = { ...stored, ...dbUser, scope, sub }; // Cập nhật sub vào user
            setCurrentUser(updatedUser);  // Cập nhật currentUser

            // Lưu updatedUser vào localStorage
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));
          } else {
            console.warn("⚠️ [Auth] Không tìm thấy user trong Firestore, giữ local user.");
            const updatedUser = { ...stored, scope, sub };  // Cập nhật sub vào user
            setCurrentUser(updatedUser);  // Cập nhật currentUser
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));  // Lưu updatedUser vào localStorage
          }
        } else {
          console.log("⚪ [Auth] Không có user trong localStorage.");
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("🔥 [Auth] Lỗi kiểm tra user:", err);
      } finally {
        console.log("🟢 [Auth] Hoàn tất khởi tạo AuthContext");
        setLoading(false);
      }
    };

    checkUser();
  }, []); // Chạy khi component mount

  const logout = () => {
    console.log("🚪 [Auth] Đăng xuất");
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout, loading }}>
      {loading ? <p>⏳ Đang xác thực người dùng...</p> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
