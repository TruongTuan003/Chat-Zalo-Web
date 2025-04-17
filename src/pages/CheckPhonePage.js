import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { TbUserCircle } from "react-icons/tb";

function CheckPhonePage() {
  const [data, setData] = useState({
    phone: "",
  });
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOtpExpired, setIsOtpExpired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [token, setToken] = useState("");
  const [userData, setUserData] = useState(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  const navigate = useNavigate();

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

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => {
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const URL = `${process.env.REACT_APP_BACKEND}/api/phone`;
    try {
      const response = await axios.post(URL, data);
      console.log("response", response);
      toast.success(response.data.message);
      if (response.data.success) {
        setUserData(response.data.data);
        setToken(response.data.token);
        setTimeLeft(response.data.otpExpiresIn || 30);
        setIsOtpExpired(false);
        setShowOtpInput(true);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message);
      console.log("error", error);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (isOtpExpired) {
      toast.error("OTP has expired. Please request a new one.");
      return;
    }
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND}/api/verify-otp`,
        {
          phone: userData.phone,
          otp,
          token
        }
      );
      
      if (response.data.success) {
        toast.success("OTP verified successfully!");
        // Navigate to reset password page with token
        navigate("/password", {
          state: {
            token: response.data.token || token,
            userData: userData
          }
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Invalid OTP");
    }
  };

  const handleResendOtp = async () => {
    if (isResending) return;
    
    setIsResending(true);
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND}/api/resend-otp`,
        { token }
      );
      
      if (response.data.success) {
        setToken(response.data.token);
        setTimeLeft(response.data.otpExpiresIn || 30);
        setIsOtpExpired(false);
        toast.success("New OTP sent successfully!");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 30);
    const secs = seconds % 30;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-5">
      <div className="bg-white w-full max-w-md rounded overflow-hidden p-4 mx-auto">
        <div className="w-fit mx-auto mb-2">
          <TbUserCircle size={80} />
        </div>
        <h3>Welcome to Chat app!</h3>
        
        {!showOtpInput ? (
          <form className="grid gap-4 mt-3" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <label htmlFor="phone">Phone Number :</label>
              <input
                type="text"
                id="phone"
                name="phone"
                placeholder="Enter your phone number"
                className="bg-slate-100 px-2 py-1 focus:outline-primary"
                value={data.phone}
                onChange={handleOnChange}
                required
              />
            </div>

            <button className="bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide">
              Send OTP
            </button>
          </form>
        ) : (
          <form className="grid gap-4 mt-3" onSubmit={handleVerifyOtp}>
            <div className="flex flex-col gap-1">
              <label htmlFor="otp">Enter OTP:</label>
              <input
                type="text"
                id="otp"
                placeholder="Enter OTP code"
                className="bg-slate-100 px-2 py-1 focus:outline-primary"
                value={otp}
                onChange={handleOtpChange}
                required
              />
            </div>
            
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
                  : "bg-primary hover:bg-secondary"
              } text-lg px-4 py-1 rounded mt-2 font-bold text-white leading-relaxed tracking-wide`}
            >
              Verify OTP
            </button>
            
            {isOtpExpired && (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className={`${
                  isResending
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-lg px-4 py-1 rounded mt-2 font-bold text-white leading-relaxed tracking-wide`}
              >
                {isResending ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </form>
        )}
        
        <p className="my-3 text-center">
          New User ?
          <Link to={"/register"} className="hover:text-primary font-semibold">
            Register
          </Link>{" "}
        </p>
      </div>
    </div>
  );
}

export default CheckPhonePage;
