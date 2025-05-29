import React, { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";
import uploadFile from "../helpers/uploadFile";
import { Diveder } from "./Diveder";
import axios from "axios";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/userSlice";
import { FaPencilAlt, FaTimes, FaCamera, FaLock } from "react-icons/fa";

const EditUserDetails = ({ onClose, user }) => {
  const [data, setData] = useState({
    name: user?.name,
    profile_pic: user?.profile_pic,
    phone: user?.phone,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const uploadPhotoRef = useRef();
  const dispatch = useDispatch();

  useEffect(() => {
    if (user) {
      setData((prev) => ({
        ...prev,
        ...user,
      }));
      try {
        const cloneUser = JSON.parse(JSON.stringify(user));
        localStorage.setItem("edit-user-data", JSON.stringify(cloneUser));
      } catch (err) {
        console.warn("Unable to stringify user for localStorage:", err);
      }
    }
  }, [user]);

  console.log("user edit", user);

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setData((preve) => {
      return {
        ...preve,
        [name]: value,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const URL = `${process.env.REACT_APP_BACKEND}/api/update-user`;

      // Only send necessary user data fields
      const userData = {
        name: data.name,
        profile_pic: data.profile_pic,
        _id: data._id,
        phone: data.phone,
      };

      const response = await axios({
        method: "post",
        url: URL,
        data: userData,
        withCredentials: true,
      });

      toast.success(response?.data?.message || "User updated successfully!");

      if (response.data.success) {
        dispatch(setUser(response.data.data));
      }
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message);
    }
  };

  const handleOpenUploadPhoto = (e) => {
    e.preventDefault();
    e.stopPropagation();

    uploadPhotoRef.current.click();
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const uploadPhoto = await uploadFile(file);
      setData((preve) => {
        return {
          ...preve,
          profile_pic: uploadPhoto?.url,
        };
      });
    }
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
    } else if (confirmPassword !== passwordData.newPassword) {
      return "Mật khẩu xác nhận không khớp";
    }
    return "";
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate on change
    if (name === "newPassword") {
      const error = validatePassword(value);
      setPasswordErrors(prev => ({
        ...prev,
        newPassword: error
      }));
    } else if (name === "confirmPassword") {
      const error = validateConfirmPassword(value);
      setPasswordErrors(prev => ({
        ...prev,
        confirmPassword: error
      }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newPasswordError = validatePassword(passwordData.newPassword);
    const confirmPasswordError = validateConfirmPassword(passwordData.confirmPassword);
    
    if (newPasswordError || confirmPasswordError) {
      setPasswordErrors({
        newPassword: newPasswordError,
        confirmPassword: confirmPasswordError
      });
      return;
    }

    try {
      const URL = `${process.env.REACT_APP_BACKEND}/api/reset-password`;
      const response = await axios.post(URL, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        toast.success("Đổi mật khẩu thành công");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setShowPasswordForm(false);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Mật khẩu hiện tại không đúng");
      } else {
        toast.error(error?.response?.data?.message || "Không thể đổi mật khẩu");
      }
    }
  };

  console.log("data", data.phone);
  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 bg-gray-700 bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
          <FaTimes
            size={18}
            className="text-slate-500 cursor-pointer"
            onClick={onClose}
          />
        </div>

        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          <div className="flex items-center p-4 gap-4 pt-4">
            <div className="relative">
              <Avatar
                imageUrl={data?.profile_pic}
                width={80}
                height={80}
                name={data?.name}
              />
              <div
                className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow cursor-pointer"
                onClick={handleOpenUploadPhoto}
              >
                <FaCamera size={12} className="text-slate-600" />
              </div>
              <input
                type="file"
                className="hidden"
                ref={uploadPhotoRef}
                onChange={handleUploadPhoto}
                accept="image/*"
              />
            </div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <input
                  type="text"
                  value={data.name}
                  onChange={handleOnChange}
                  name="name"
                  className="text-xl font-semibold text-slate-800 border-b border-blue-600 focus:outline-none"
                  onBlur={() => setIsEditingName(false)}
                  autoFocus
                />
              ) : (
                <h3 className="text-xl font-semibold text-slate-800">
                  {data?.name || "User"}
                </h3>
              )}
              <FaPencilAlt
                size={14}
                className="text-slate-500 cursor-pointer"
                onClick={() => setIsEditingName(true)}
              />
            </div>
          </div>

          <div className="p-4">
            <h4 className="text-lg font-semibold mb-3">Thông tin cá nhân</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600 text-sm">
              <div>Điện thoại</div>
              <div className="flex items-center gap-2">
                {isEditingPhone ? (
                  <input
                    type="text"
                    value={data.phone}
                    onChange={handleOnChange}
                    name="phone"
                    className="text-sm text-slate-600 border-b border-blue-600 focus:outline-none w-full"
                    onBlur={() => setIsEditingPhone(false)}
                    autoFocus
                  />
                ) : (
                  <span>{data?.phone || "Chưa có"}</span>
                )}
              </div>
            </div>
          </div>

          <Diveder />

          <div className="p-4 text-sm text-slate-500">
            Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này
          </div>

          <Diveder />

          <div className="p-4">
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-2 text-primary hover:text-secondary"
            >
              <FaLock size={14} />
              {showPasswordForm ? "Đóng" : "Đổi mật khẩu"}
            </button>

            {showPasswordForm && (
              <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      passwordErrors.newPassword ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    required
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      passwordErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    required
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!!passwordErrors.newPassword || !!passwordErrors.confirmPassword}
                >
                  Đổi mật khẩu
                </button>
              </form>
            )}
          </div>

          <div className="p-4 flex justify-end">
            <button
              onClick={handleSubmit}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-secondary"
            >
              <FaPencilAlt size={14} className="inline mr-2" />
              Cập nhật
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EditUserDetails);
