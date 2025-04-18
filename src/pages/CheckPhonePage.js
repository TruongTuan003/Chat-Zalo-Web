import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { TbUserCircle } from "react-icons/tb";

function CheckPhonePage() {
  const [data, setData] = useState({
    phone: "",
  });
  const [errors, setErrors] = useState({
    phone: "",
  });
  const navigate = useNavigate();

  const validatePhone = (phone) => {
    const errors = {};
    
    if (!phone) {
      errors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^[0-9]{10}$/.test(phone)) {
      errors.phone = "Số điện thoại phải có 10 chữ số";
    } else if (!/^0[0-9]{9}$/.test(phone)) {
      errors.phone = "Số điện thoại phải bắt đầu bằng số 0";
    }

    return errors;
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    
    setData((prev) => ({
      ...prev,
      [name]: numericValue,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate phone
    const validationErrors = validatePhone(data.phone);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const URL = `${process.env.REACT_APP_BACKEND}/api/phone`;
    try {
      const response = await axios.post(URL, data);
      console.log("response", response);
      toast.success("Kiểm tra số điện thoại thành công");
      if (response.data.success) {
        setData({
          phone: "",
        });
        navigate("/password", {
          state: response?.data?.data,
        });
      }
    } catch (error) {
      toast.error("Số điện thoại không tồn tại hoặc không hợp lệ");
      console.log("error", error);
    }
  };

  return (
    <div className="mt-5">
      <div className="bg-white w-full max-w-md rounded overflow-hidden p-4 mx-auto">
        <div className="w-fit mx-auto mb-2">
          <TbUserCircle size={80} />
        </div>
        <h3>Chào mừng đến với ứng dụng Chat!</h3>
        <form className="grid gap-4 mt-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="phone">Số điện thoại:</label>
            <input
              type="text"
              id="phone"
              name="phone"
              placeholder="Nhập số điện thoại của bạn"
              className={`bg-slate-100 px-2 py-1 focus:outline-primary ${
                errors.phone ? "border border-red-500" : ""
              }`}
              value={data.phone}
              onChange={handleOnChange}
              maxLength={10}
              required
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <button 
            className="bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!!errors.phone}
          >
            Tiếp tục
          </button>
        </form>
        <p className="my-3 text-center">
          Chưa có tài khoản?
          <Link to={"/register"} className="hover:text-primary font-semibold">
            Đăng ký
          </Link>{" "}
        </p>
      </div>
    </div>
  );
}

export default CheckPhonePage;
