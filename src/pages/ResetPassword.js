import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState({
    password: "",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const token = location?.state?.token;
  
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
    } else if (password.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự";
    } else if (!/[A-Z]/.test(password)) {
      return "Mật khẩu phải chứa ít nhất một chữ in hoa";
    } else if (!/[a-z]/.test(password)) {
      return "Mật khẩu phải chứa ít nhất một chữ thường";
    } else if (!/[0-9]/.test(password)) {
      return "Mật khẩu phải chứa ít nhất một chữ số";
    }
    return "";
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (!confirmPassword) {
      return "Vui lòng xác nhận mật khẩu";
    } else if (confirmPassword !== newPassword) {
      return "Mật khẩu xác nhận không khớp";
    }
    return "";
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    
    // Clear error when user starts typing
    if (errors.password) {
      setErrors(prev => ({
        ...prev,
        password: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setErrors({
        password: passwordError
      });
      return;
    }

    const URL = `${process.env.REACT_APP_BACKEND}/api/reset-password`;
    try {
      const res = await axios.post(URL, { newPassword, token });

      toast.success(res.data.message);
      navigate("/login");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong");
      console.log("Reset error", error);
    }
  };

  return (
    <div className="mt-5">
      <div className="bg-white w-full max-w-md rounded overflow-hidden p-4 mx-auto">
        <h3 className="text-center text-xl font-bold mb-4">Reset Password</h3>
        <form className="grid gap-4 mt-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="newPassword">New Password:</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              placeholder="Enter your new password"
              className={`bg-slate-100 px-2 py-1 focus:outline-primary ${
                errors.password ? "border border-red-500" : ""
              }`}
              value={newPassword}
              onChange={handlePasswordChange}
              required
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <button 
            className="bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!!errors.password || !newPassword}
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
