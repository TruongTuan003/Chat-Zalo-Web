import React, { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import uploadFile from "../helpers/uploadFile";
import axios from "axios";
import toast from "react-hot-toast";
import firebase from "../firebase";

function RegisterPage() {
  const [data, setData] = useState({
    name: "",
    phone: "",
    password: "",
    profile_pic: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    phone: "",
    password: "",
    profile_pic: "",
  });
  const [uploadPhoto, setUploadPhoto] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOtpExpired, setIsOtpExpired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      "recaptcha-container",
      {
        size: "invisible",
        defaultCountry: "VN",
      }
    );
  }, []);

  // Timer effect for OTP countdown
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

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const validateName = (name) => {
    if (!name) {
      return "Vui lòng nhập tên";
    } else if (name.length < 2) {
      return "Tên phải có ít nhất 2 ký tự";
    } else if (name.length > 50) {
      return "Tên không được vượt quá 50 ký tự";
    }
    return "";
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

  const validateProfilePic = (profile_pic) => {
    if (!profile_pic) {
      return "Vui lòng tải lên ảnh đại diện";
    }
    return "";
  };

  const validateForm = () => {
    const newErrors = {
      name: validateName(data.name),
      phone: validatePhone(data.phone),
      password: validatePassword(data.password),
      profile_pic: validateProfilePic(data.profile_pic),
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== "");
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

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|jpg|gif)$/)) {
      setErrors(prev => ({
        ...prev,
        profile_pic: "Vui lòng tải lên file ảnh hợp lệ (JPEG, PNG, JPG, GIF)"
      }));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        profile_pic: "Kích thước ảnh không được vượt quá 5MB"
      }));
      return;
    }
    
    const uploadPhoto = await uploadFile(file);
    setUploadPhoto(file);
    setData((prev) => ({
      ...prev,
      profile_pic: uploadPhoto?.url,
    }));
    
    // Clear error if upload successful
    setErrors(prev => ({
      ...prev,
      profile_pic: ""
    }));
  };

  const handleClearUploadPhoto = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setUploadPhoto(null);
    setData(prev => ({
      ...prev,
      profile_pic: ""
    }));
    setErrors(prev => ({
      ...prev,
      profile_pic: "Vui lòng tải lên ảnh đại diện"
    }));
  };

  const handleSendOTP = async () => {
    // Validate phone before sending OTP
    const phoneError = validatePhone(data.phone);
    if (phoneError) {
      setErrors(prev => ({
        ...prev,
        phone: phoneError
      }));
      return;
    }

    try {
      // Kiểm tra số điện thoại đã tồn tại chưa
      try {
        await axios.post(
          `${process.env.REACT_APP_BACKEND}/api/check-phone`,
          { phone: data.phone }
        );
        // Nếu không có lỗi, nghĩa là số điện thoại đã tồn tại
        toast.error("Số điện thoại này đã được đăng ký");
        return;
      } catch (checkError) {
        // Nếu lỗi 400, nghĩa là số điện thoại chưa tồn tại (đúng với yêu cầu đăng ký)
        if (checkError.response?.status !== 400) {
          // Nếu lỗi khác 400, có thể là lỗi server
          throw checkError;
        }
      }

      const appVerifier = window.recaptchaVerifier;
      const phone = data.phone.startsWith("+84")
        ? data.phone
        : data.phone.replace(/^0/, "+84");

      const confirmationResult = await firebase
        .auth()
        .signInWithPhoneNumber(phone, appVerifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      setTimeLeft(30); // Set 30 seconds timeout
      setIsOtpExpired(false);
      toast.success("Đã gửi mã OTP thành công!");
    } catch (error) {
      console.log(error);
      toast.error("Không thể gửi mã OTP. Vui lòng thử lại sau.");
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
      setTimeLeft(30); // Reset timer to 30 seconds
      setIsOtpExpired(false);
      toast.success("Đã gửi lại mã OTP thành công!");
    } catch (error) {
      console.log(error);
      toast.error("Không thể gửi lại mã OTP. Vui lòng thử lại sau.");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (isOtpExpired) {
      toast.error("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
      return;
    }

    try {
      await window.confirmationResult.confirm(otp);
      toast.success("Xác thực số điện thoại thành công");
      setIsPhoneVerified(true);
    } catch (error) {
      console.log(error);
      toast.error("Mã OTP không chính xác");
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!isPhoneVerified) {
      toast.error("Vui lòng xác thực số điện thoại trước");
      return;
    }
    
    const URL = `${process.env.REACT_APP_BACKEND}/api/register`;
    try {
      const response = await axios.post(URL, data);
      toast.success(response.data.message);
      if (response.data.success) {
        setData({
          name: "",
          phone: "",
          password: "",
          profile_pic: "",
        });
        navigate("/login");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Đăng ký thất bại");
      console.log("error", error);
    }
  };

  return (
    <div className="mt-5">
      <div className="bg-white max-w-md mx-auto rounded p-4">
        <h3 className="text-center text-xl font-bold mb-4">Đăng ký</h3>

        <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
          {!isPhoneVerified && (
            <>
              <label>
                Số điện thoại:
                <input
                  type="text"
                  name="phone"
                  placeholder="Nhập số điện thoại của bạn"
                  className={`w-full px-3 py-2 border rounded focus:outline-blue-500 bg-gray-100 ${
                    errors.phone ? "border-red-500" : ""
                  }`}
                  value={data.phone}
                  onChange={handleOnChange}
                  maxLength={10}
                  required
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </label>
              <button
                type="button"
                onClick={handleSendOTP}
                className="bg-blue-600 text-white rounded py-2"
                disabled={!!errors.phone}
              >
                Gửi mã OTP
              </button>

              {otpSent && (
                <>
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
                    type="button"
                    onClick={handleVerifyOTP}
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
                </>
              )}
            </>
          )}

          {isPhoneVerified && (
            <>
              <label>
                Tên:
                <input
                  type="text"
                  name="name"
                  placeholder="Nhập tên của bạn"
                  className={`w-full px-3 py-2 border rounded focus:outline-blue-500 bg-gray-100 ${
                    errors.name ? "border-red-500" : ""
                  }`}
                  value={data.name}
                  onChange={handleOnChange}
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </label>

              <label>
                Mật khẩu:
                <input
                  type="password"
                  name="password"
                  placeholder="Nhập mật khẩu của bạn"
                  className={`w-full px-3 py-2 border rounded focus:outline-blue-500 bg-gray-100 ${
                    errors.password ? "border-red-500" : ""
                  }`}
                  value={data.password}
                  onChange={handleOnChange}
                  required
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </label>

              <label>
                Ảnh đại diện:
                <div className={`w-full h-14 px-3 py-2 bg-gray-200 border rounded flex items-center justify-between cursor-pointer hover:border-blue-500 ${
                  errors.profile_pic ? "border-red-500" : ""
                }`}>
                  <span className="truncate">
                    {uploadPhoto?.name || "Tải lên ảnh đại diện"}
                  </span>
                  {uploadPhoto?.name && (
                    <button
                      className="text-xl hover:text-red-600"
                      onClick={handleClearUploadPhoto}
                    >
                      <IoClose />
                    </button>
                  )}
                </div>
                {errors.profile_pic && (
                  <p className="text-red-500 text-sm mt-1">{errors.profile_pic}</p>
                )}
                <input
                  type="file"
                  id="profile_pic"
                  name="profile_pic"
                  className="hidden"
                  onChange={handleUploadPhoto}
                  accept="image/jpeg,image/png,image/jpg,image/gif"
                />
              </label>

              <button
                type="button"
                onClick={handleSubmit}
                className="bg-blue-600 text-white rounded py-2"
                disabled={Object.values(errors).some(error => error !== "")}
              >
                Đăng ký
              </button>
            </>
          )}
        </form>
        <p className="text-center mt-4">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-blue-500">
            Đăng nhập
          </Link>
        </p>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
}

export default RegisterPage;
