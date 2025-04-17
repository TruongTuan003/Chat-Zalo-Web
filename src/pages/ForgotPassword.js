import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import firebase from "../firebase"; // giống file RegisterPage
import { TbUserCircle } from "react-icons/tb";

function ForgotPasswordPage() {
  const [step, setStep] = useState("checkPhone");
  const [data, setData] = useState({ phone: "", newPassword: "" });
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [expiryTime, setExpiryTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOtpExpired, setIsOtpExpired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      "recaptcha-container",
      { size: "invisible", defaultCountry: "VN" }
    );
  }, []);

  // Timer effect for OTP countdown
  useEffect(() => {
    let timer;
    if (expiryTime) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const timeRemaining = Math.max(0, expiryTime - now);
        
        if (timeRemaining <= 0) {
          setIsOtpExpired(true);
          setTimeLeft(0);
          clearInterval(timer);
        } else {
          setTimeLeft(Math.floor(timeRemaining / 1000));
        }
      };
      
      updateTimer(); // Initial call
      timer = setInterval(updateTimer, 1000);
    }
    
    return () => clearInterval(timer);
  }, [expiryTime]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    const phone = data.phone.startsWith("+84")
      ? data.phone
      : data.phone.replace(/^0/, "+84");

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND}/api/phone`,
        { phone: data.phone }
      );

      if (res.data.success) {
        setToken(res.data.token); // lưu token reset mật khẩu
        const appVerifier = window.recaptchaVerifier;
        const confirmationResult = await firebase
          .auth()
          .signInWithPhoneNumber(phone, appVerifier);
        window.confirmationResult = confirmationResult;
        setStep("verifyOtp");
        
        // Set expiry time from backend response (60 seconds from now)
        const expiryTimeFromBackend = res.data.expiryTime || (new Date().getTime() + 60000);
        setExpiryTime(expiryTimeFromBackend);
        setIsOtpExpired(false);
        
        toast.success("OTP sent to your phone");
      }
    } catch (err) {
      console.error("Phone check error:", err);
      
      if (err.response) {
        // Check for specific error from backend
        if (err.response.status === 400 && err.response.data.message === "User does not exist") {
          toast.error("User not found. Please check your phone number or register first.");
        } else {
          toast.error(err.response.data.message || "Phone check failed");
        }
      } else if (err.request) {
        // Network error
        toast.error("Network error. Please check your connection and try again");
      } else {
        // Other errors
        toast.error("An unexpected error occurred. Please try again");
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (isOtpExpired) {
      toast.error("OTP has expired. Please request a new one.");
      return;
    }
    
    try {
      // Send OTP verification to backend
      const verifyRes = await axios.post(
        `${process.env.REACT_APP_BACKEND}/api/verify-otp`,
        { 
          phone: data.phone,
          otp,
          token
        }
      );
      
      if (verifyRes.data.success) {
        // Verify with Firebase
        await window.confirmationResult.confirm(otp);
        toast.success("Phone verified ✅");
        setStep("resetPassword");
      } else {
        toast.error(verifyRes.data.message || "Invalid OTP ❌");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid OTP ❌");
    }
  };

  const handleResendOtp = async () => {
    if (isResending) return; // Prevent multiple clicks
    
    setIsResending(true);
    
    try {
      const phone = data.phone.startsWith("+84")
        ? data.phone
        : data.phone.replace(/^0/, "+84");
      
      // First check if the user exists in Firebase
      try {
        // Send OTP via Firebase first to check if the phone number is valid
        const appVerifier = window.recaptchaVerifier;
        const confirmationResult = await firebase
          .auth()
          .signInWithPhoneNumber(phone, appVerifier);
        
        // If we get here, the phone number is valid in Firebase
        window.confirmationResult = confirmationResult;
        
        // Now call the backend resendOTP endpoint
        const resendRes = await axios.post(
          `${process.env.REACT_APP_BACKEND}/api/resendOTP`,
          { phone: data.phone }
        );
        
        if (resendRes.data.success) {
          // Update token from backend response
          setToken(resendRes.data.token);
          
          // Set expiry time from backend response (15 minutes)
          const expiresAt = new Date(resendRes.data.expiresAt);
          setExpiryTime(expiresAt.getTime());
          setIsOtpExpired(false);
          
          toast.success("New OTP sent to your phone");
        } else {
          toast.error(resendRes.data.message || "Failed to resend OTP");
        }
      } catch (firebaseError) {
        console.error("Firebase error:", firebaseError);
        
        // Check for specific Firebase error codes
        if (firebaseError.code === 'auth/invalid-phone-number') {
          toast.error("Invalid phone number format. Please check and try again.");
        } else if (firebaseError.code === 'auth/quota-exceeded') {
          toast.error("Too many attempts. Please try again later.");
        } else {
          toast.error("User not found. Please check your phone number.");
        }
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 400) {
          if (err.response.data.message === "User does not exist") {
            toast.error("User not found. Please check your phone number or register first.");
          } else {
            toast.error(err.response.data.message || "Invalid phone number");
          }
        } else if (err.response.status === 404) {
          toast.error("User not found. Please check your phone number");
        } else if (err.response.status === 429) {
          toast.error("Too many attempts. Please try again later");
        } else {
          toast.error(err.response.data.message || "Failed to resend OTP. Please try again.");
        }
      } else if (err.request) {
        // The request was made but no response was received
        toast.error("Network error. Please check your connection and try again");
      } else {
        // Something happened in setting up the request that triggered an Error
        toast.error("An unexpected error occurred. Please try again");
      }
    } finally {
      setIsResending(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND}/api/reset-password`,
        {
          newPassword: data.newPassword,
          token,
        }
      );
      toast.success(res.data.message);
      navigate("/login");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reset failed");
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-5">
      <div className="bg-white max-w-md mx-auto rounded p-4">
        <div className="w-fit mx-auto mb-2">
          <TbUserCircle size={80} />
        </div>
        <h3 className="text-center text-xl font-bold mb-4">Forgot Password</h3>

        {step === "checkPhone" && (
          <form onSubmit={handlePhoneSubmit} className="grid gap-4">
            <label className="text-sm font-medium">
              Phone:
              <input
                type="text"
                name="phone"
                value={data.phone}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Send OTP
            </button>
          </form>
        )}

        {step === "verifyOtp" && (
          <form onSubmit={handleVerifyOtp} className="grid gap-4">
            <label className="text-sm font-medium">
              Enter OTP:
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <div className="text-center text-sm text-gray-600">
              {timeLeft > 0 ? (
                <p>OTP expires in: {formatTime(timeLeft)}</p>
              ) : (
                <p className="text-red-500">OTP has expired</p>
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
              Verify
            </button>
            {isOtpExpired && (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className={`${
                  isResending
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                } text-white font-medium py-2 px-4 rounded-lg transition duration-200`}
              >
                {isResending ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </form>
        )}

        {step === "resetPassword" && (
          <form onSubmit={handlePasswordSubmit} className="grid gap-4">
            <label className="text-sm font-medium">
              New Password:
              <input
                type="password"
                name="newPassword"
                value={data.newPassword}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Reset Password
            </button>
          </form>
        )}

        <p className="text-center mt-4">
          New user?{" "}
          <a href="/register" className="text-blue-500">
            Register
          </a>
        </p>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
}

export default ForgotPasswordPage;
