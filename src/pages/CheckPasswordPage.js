import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Avatar } from "../components/Avatar";
import { useDispatch } from "react-redux";
import { setToken } from "../redux/userSlice";

function CheckPasswordPage() {
  const [data, setData] = useState({
    password: "",
  });
  const [errors, setErrors] = useState({
    password: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!location?.state?.name || !location?.state?._id) {
      navigate("/phone");
    }
  }, [location, navigate]);

  const validatePassword = (password) => {
    const errors = {};
    
    if (!password) {
      errors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Mật khẩu phải chứa ít nhất một chữ in hoa";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Mật khẩu phải chứa ít nhất một chữ thường";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Mật khẩu phải chứa ít nhất một chữ số";
    }

    return errors;
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
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

    // Validate password
    const validationErrors = validatePassword(data.password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const URL = `${process.env.REACT_APP_BACKEND}/api/password`;
    try {
      const response = await axios({
        method: "post",
        url: URL,
        data: {
          userId: location?.state?._id,
          password: data.password,
        },
        withCredentials: true,
      });

      if (response.data.success) {
        const token = response.data.token;
        dispatch(setToken(token));
        localStorage.setItem("token", token);
        setData({ password: "" });
        toast.success("Đăng nhập thành công");
        navigate("/");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Mật khẩu không đúng");
      } else {
        toast.error("Đăng nhập thất bại. Vui lòng thử lại sau.");
      }
    }
  };

  const handleForgotPassword = async () => {
    const phone = location?.state?.phone;

    if (!phone) {
      toast.error("Thiếu số điện thoại. Vui lòng thử lại.");
      return;
    }

    const URL = `${process.env.REACT_APP_BACKEND}/api/phone`;
    try {
      const response = await axios.post(URL, { phone });
      toast.success("Vui lòng kiểm tra điện thoại để nhận liên kết đặt lại mật khẩu!");

      if (response.data.success) {
        navigate("/reset-password", {
          state: { token: response.data.token },
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Đã xảy ra lỗi");
    }
  };

  return (
    <div className="mt-5">
      <div className="bg-white w-full max-w-md rounded overflow-hidden p-4 mx-auto">
        <div className="w-fit mx-auto mb-2 flex justify-center items-center flex-col">
          <Avatar
            width={70}
            height={70}
            name={location?.state?.name}
            imageUrl={location?.state?.profile_pic}
          />
          <h2 className="font-semibold text-lg mt-1">
            {location?.state?.name}
          </h2>
        </div>
        <h3>Chào mừng đến với ứng dụng Chat!</h3>
        <form className="grid gap-4 mt-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="password">Mật khẩu:</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Nhập mật khẩu của bạn"
              className={`bg-slate-100 px-2 py-1 focus:outline-primary ${
                errors.password ? "border border-red-500" : ""
              }`}
              value={data.password}
              onChange={handleOnChange}
              required
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <button 
            className="bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!!errors.password}
          >
            Đăng nhập
          </button>
        </form>
        <p className="my-3 text-center">
          <button
            onClick={handleForgotPassword}
            className="text-primary hover:text-secondary"
          >
            Quên mật khẩu?
          </button>
        </p>
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

export default CheckPasswordPage;
