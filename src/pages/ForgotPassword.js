import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import firebase from "../firebase"; // giống file RegisterPage
import { TbUserCircle } from "react-icons/tb";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function ForgotPasswordPage() {
  const [step, setStep] = useState("checkPhone");
  const [data, setData] = useState({
    phone: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOtpExpired, setIsOtpExpired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});

  useEffect(() => {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      "recaptcha-container",
      { size: "invisible", defaultCountry: "VN" }
    );
  }, []);

  useEffect(() => {
    let timer;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsOtpExpired(true);
            clearInterval(timer);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "newPassword") {
      const passwordError = validatePassword(value);
      setErrors((prev) => ({
        ...prev,
        password: passwordError,
      }));
    } else if (name === "confirmPassword") {
      const confirmPasswordError = validateConfirmPassword(value);
      setErrors((prev) => ({
        ...prev,
        confirmPassword: confirmPasswordError,
      }));
    } else if (name === "phone") {
      const phoneError = validatePhone(value);
      setErrors((prev) => ({
        ...prev,
        phone: phoneError,
      }));
    }
  };

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

  const validateOTP = (otp) => {
    if (!otp) {
      return "Vui lòng nhập mã OTP";
    } else if (!/^[0-9]{6}$/.test(otp)) {
      return "Mã OTP phải có 6 chữ số";
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
    } else if (confirmPassword !== data.newPassword) {
      return "Mật khẩu xác nhận không khớp";
    }
    return "";
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    const phone = data.phone.startsWith("+84")
      ? data.phone
      : data.phone.replace(/^0/, "+84");

    const phoneError = validatePhone(data.phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return;
    }

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND}/api/phone`,
        { phone: data.phone }
      );

      if (res.data.success) {
        setToken(res.data.token);
        const appVerifier = window.recaptchaVerifier;
        const confirmationResult = await firebase
          .auth()
          .signInWithPhoneNumber(phone, appVerifier);
        window.confirmationResult = confirmationResult;
        setStep("verifyOtp");
        setTimeLeft(30);
        setIsOtpExpired(false);
        toast.success("Mã OTP đã được gửi đến số điện thoại của bạn");
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error("Số điện thoại không tồn tại");
      } else {
        toast.error(
          err?.response?.data?.message ||
            "Không thể gửi mã OTP. Vui lòng thử lại sau."
        );
      }
    }
  };

  const handleResendOTP = async () => {
    if (isResending) return;
    setIsResending(true);

    try {
      const phone = data.phone.startsWith("+84")
        ? data.phone
        : data.phone.replace(/^0/, "+84");

      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await firebase
        .auth()
        .signInWithPhoneNumber(phone, appVerifier);

      window.confirmationResult = confirmationResult;
      setTimeLeft(30);
      setIsOtpExpired(false);
      toast.success("Đã gửi lại mã OTP thành công!");
    } catch (error) {
      console.log(error);
      toast.error("Không thể gửi lại mã OTP. Vui lòng thử lại sau.");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (isOtpExpired) {
      toast.error("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
      return;
    }

    const otpError = validateOTP(otp);
    if (otpError) {
      setErrors({ otp: otpError });
      return;
    }

    try {
      await window.confirmationResult.confirm(otp);
      toast.success("Xác thực số điện thoại thành công");
      setStep("resetPassword");
    } catch (err) {
      toast.error("Mã OTP không chính xác");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const passwordError = validatePassword(data.newPassword);
    const confirmPasswordError = validateConfirmPassword(data.confirmPassword);

    if (passwordError || confirmPasswordError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      if (passwordError) {
        document.querySelector('input[name="newPassword"]').focus();
      } else if (confirmPasswordError) {
        document.querySelector('input[name="confirmPassword"]').focus();
      }
      return;
    }

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND}/api/reset-password`,
        {
          newPassword: data.newPassword,
          token,
        }
      );
      toast.success("Đặt lại mật khẩu thành công");
      navigate("/login");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể đặt lại mật khẩu");
    }
  };

  return (
    <div className="mt-5">
      <div className="bg-white max-w-md mx-auto rounded p-4">
        <div className="w-fit mx-auto mb-2">
          <TbUserCircle size={80} />
        </div>
        <h3 className="text-center text-xl font-bold mb-4">Quên mật khẩu</h3>

        {step === "checkPhone" && (
          <form onSubmit={handlePhoneSubmit} className="grid gap-4">
            <label className="text-sm font-medium">
              Số điện thoại:
              <input
                type="text"
                name="phone"
                value={data.phone}
                onChange={handleChange}
                required
                className={`mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? "border-red-500" : ""
                }`}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </label>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Gửi mã OTP
            </button>
          </form>
        )}

        {step === "verifyOtp" && (
          <form onSubmit={handleVerifyOtp} className="grid gap-4">
            <label className="text-sm font-medium">
              Nhập mã OTP:
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className={`mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.otp ? "border-red-500" : ""
                }`}
              />
              {errors.otp && (
                <p className="text-red-500 text-sm mt-1">{errors.otp}</p>
              )}
            </label>
            <div className="text-center text-sm text-gray-600">
              {timeLeft > 0 ? (
                <p>Mã OTP hết hạn sau: {formatTime(timeLeft)}</p>
              ) : (
                <p className="text-red-500">Mã OTP đã hết hạn</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isOtpExpired}
              className={`${
                isOtpExpired
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white font-medium py-2 px-4 rounded-lg transition duration-200`}
            >
              Xác thực
            </button>
            {isOtpExpired && (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isResending}
                className={`${
                  isResending
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white font-medium py-2 px-4 rounded-lg transition duration-200`}
              >
                {isResending ? "Đang gửi..." : "Gửi lại mã OTP"}
              </button>
            )}
          </form>
        )}

        {step === "resetPassword" && (
          <form onSubmit={handlePasswordSubmit} className="grid gap-4">
            <label className="text-sm font-medium relative">
              Mật khẩu mới:
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={data.newPassword}
                onChange={handleChange}
                required
                className={`mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? "border-red-500" : ""
                }`}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-500"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <FaEyeSlash size={18} />
                ) : (
                  <FaEye size={18} />
                )}
              </button>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </label>
            <label className="text-sm font-medium relative">
              Xác nhận mật khẩu:
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={data.confirmPassword}
                onChange={handleChange}
                required
                className={`mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.confirmPassword ? "border-red-500" : ""
                }`}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <FaEyeSlash size={18} />
                ) : (
                  <FaEye size={18} />
                )}
              </button>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </label>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Đặt lại mật khẩu
            </button>
          </form>
        )}

        <p className="text-center mt-4">
          Đã có tài khoản?{" "}
          <a href="/login" className="text-blue-500">
            Đăng nhập
          </a>
        </p>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
}

export default ForgotPasswordPage;
