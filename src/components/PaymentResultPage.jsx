import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const PaymentResultPage = () => {
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const status = queryParams.get("status");

    if (status === "success") {
      setPaymentStatus("success");
    } else if (status === "failure") {
      setPaymentStatus("failure");
    } else if (status === "timeout") {
      setPaymentStatus("timeout");
    } else {
      setPaymentStatus("failure");
    }

    setLoading(false);
  }, [navigate]);

  if (loading) {
    return <h2>Đang kiểm tra trạng thái thanh toán...</h2>;
  }

  if (paymentStatus === "success") {
    return (
      <div>
        <h1>🎉 Thanh toán thành công!</h1>
        <p>Cảm ơn bạn đã mua hàng tại cửa hàng của chúng tôi.</p>
        <button onClick={() => navigate("/")}>Quay lại trang chủ</button>
      </div>
    );
  } else if (paymentStatus === "failure") {
    return (
      <div>
        <h1>❌ Thanh toán thất bại!</h1>
        <p>Vui lòng thử lại hoặc liên hệ với chúng tôi để được hỗ trợ.</p>
        <button onClick={() => navigate("/")}>Quay lại trang chủ</button>
      </div>
    );
  } else if (paymentStatus === "timeout") {
    return (
      <div>
        <h1>⏰ Thời gian chờ đã hết!</h1>
        <p>Chúng tôi không thể xác nhận trạng thái thanh toán của bạn. Vui lòng thử lại sau.</p>
        <button onClick={() => navigate("/")}>Quay lại trang chủ</button>
      </div>
    );
  }

  return null; // In case something goes wrong
};

export default PaymentResultPage;
