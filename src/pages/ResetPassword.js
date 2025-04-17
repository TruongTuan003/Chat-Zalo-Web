import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const token = location?.state?.token;
  console.log("tokennn", token);

  const handleSubmit = async (e) => {
    e.preventDefault();

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
              className="bg-slate-100 px-2 py-1 focus:outline-primary"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <button className="bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
