import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({
    phone: "",
    password: "",
  });
  const navigate = useNavigate();

  const qrCodeUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Login%20QRCode";

  const validatePhone = (phone) => {
    if (!phone) {
      return "Vui lòng nhập số điện thoại";
    } else if (!/^[0-9]{10}$/.test(phone)) {
      return "Số điện thoại phải có 10 chữ số";
    } else if (!/^0[0-9]{9}$/.test(phone)) {
      return "Số điện thoại phải bắt đầu bằng số 0";
    }
    return "";
  };

  const validatePassword = (password) => {
    if (!password) {
      return "Vui lòng nhập mật khẩu";
    }
    return "";
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setPhone(numericValue);
    
    // Clear error when user starts typing
    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: ""
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    
    // Clear error when user starts typing
    if (errors.password) {
      setErrors(prev => ({
        ...prev,
        password: ""
      }));
    }
  };

  const handleLogin = async () => {
    const phoneError = validatePhone(phone);
    const passwordError = validatePassword(password);

    if (phoneError || passwordError) {
      setErrors({
        phone: phoneError,
        password: passwordError,
      });
      return;
    }

    try {
      const baseURL = process.env.REACT_APP_BACKEND;

      // 1. Gửi số điện thoại để check và lấy userId
      const checkPhoneRes = await axios.post(
        `${baseURL}/api/phone`,
        { phone },
        { withCredentials: true }
      );

      const userId = checkPhoneRes.data.data._id;

      // 2. Gửi password + userId để login
      const loginRes = await axios.post(
        `${baseURL}/api/password`,
        {
          password,
          userId,
        },
        { withCredentials: true }
      );

      if (loginRes.data.success) {
        const token = loginRes.data.token;
        localStorage.setItem("token", token);
        toast.success("Đăng nhập thành công");
        navigate("/");
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Số điện thoại không tồn tại");
      } else if (error.response?.status === 401) {
        toast.error("Mật khẩu không đúng");
      } else {
        toast.error("Đăng nhập thất bại. Vui lòng thử lại sau.");
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#e6f0fa]">
      <div className="w-[400px] bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-[#2f80ed] text-center mb-2">
          Zalo
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Đăng nhập tài khoản Zalo để kết nối với ứng dụng Zalo Web
        </p>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 text-sm font-medium border-b border-gray-200">
          <span className="text-[#2f80ed] border-b-2 border-[#2f80ed] pb-2 cursor-pointer">
            Đăng nhập với mật khẩu
          </span>
          <span className="text-gray-400 cursor-pointer">
            Đăng nhập qua mã QR
          </span>
        </div>

        {/* Phone Input */}
        <div className="flex flex-col mb-4">
          <div className={`flex items-center border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`}>
            <span className="text-gray-500 mr-2">📱 +84</span>
            <span className="text-gray-500 mr-2">•</span>
            <input
              type="text"
              placeholder="Số điện thoại"
              className="flex-1 text-sm focus:outline-none"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={10}
            />
          </div>
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Password Input */}
        <div className="flex flex-col mb-4">
          <div className={`flex items-center border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`}>
            <span className="text-gray-500 mr-2">🔒</span>
            <input
              type="password"
              placeholder="Mật khẩu"
              className="flex-1 text-sm focus:outline-none"
              value={password}
              onChange={handlePasswordChange}
            />
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
          )}
        </div>

        {/* Forgot Password */}
        <p
          onClick={() => navigate("/forgot-password")}
          className="text-blue-500 text-xs text-right mb-4 cursor-pointer hover:underline"
        >
          Quên mật khẩu
        </p>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full bg-[#2f80ed] hover:bg-blue-600 text-white py-2 text-sm rounded mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!!errors.phone || !!errors.password || !phone || !password}
        >
          Đăng nhập với mật khẩu
        </button>

        <button
          onClick={() => navigate("/register")}
          className="w-full bg-white text-blue-600 border border-blue-600 py-2 text-sm rounded mb-4 hover:bg-blue-50 transition"
        >
          Tạo tài khoản
        </button>

        {/* Zalo PC Section */}
        <div className="flex items-center justify-between border border-gray-300 rounded px-3 py-2 mb-4">
          <div className="flex items-center">
            <img
              src="https://via.placeholder.com/40"
              alt="Zalo PC"
              className="w-10 h-10 mr-2"
            />
            <div>
              <p className="text-sm text-gray-700">
                Nâng cao hiệu quả công việc với Zalo PC
              </p>
              <p className="text-xs text-gray-500">
                Gửi file lớn tới 1 GB, chụp màn hình, gọi video và nhiều tiện
                ích hơn nữa
              </p>
            </div>
          </div>
          <button className="bg-[#2f80ed] text-white px-4 py-1 rounded text-sm">
            Tải ngay
          </button>
        </div>

        {/* Language Switch */}
        <div className="flex justify-center text-xs">
          <span className="text-blue-500 text-xs cursor-pointer hover:underline">
            Tiếng Việt
          </span>
          <span className="text-gray-500 text-xs mx-2">•</span>
          <span className="text-blue-500 text-xs cursor-pointer hover:underline">
            English
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
