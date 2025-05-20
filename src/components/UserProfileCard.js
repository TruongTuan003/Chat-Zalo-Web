import React from 'react';
import { IoClose } from "react-icons/io5";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Avatar from './Avatar';

export const UserProfileCard = ({ user, onClose, onChatClick }) => {
  const currentUser = useSelector((state) => state?.user);
  const navigate = useNavigate();

  const handleStartChat = () => {
    navigate(`/chat/${user._id}`);
    onClose();
  };

  // Xử lý hiển thị avatar, sử dụng trường profile_pic như bên Sidebar
  const getAvatarUrl = () => {
    // Kiểm tra nếu user và user.profile_pic tồn tại
    if (user && user.profile_pic) {
      // Kiểm tra nếu user.profile_pic đã là một URL đầy đủ
      if (user.profile_pic.startsWith('http://') || user.profile_pic.startsWith('https://')) {
        return user.profile_pic;
      } else {
        // Nếu không phải URL đầy đủ, giả định là đường dẫn tương đối từ backend
        const backendUrl = process.env.REACT_APP_BACKEND ? process.env.REACT_APP_BACKEND.replace(/\/$/, '') : '';
        const avatarPath = user.profile_pic.startsWith('/') ? user.profile_pic.substring(1) : user.profile_pic;
        return `${backendUrl}/${avatarPath}`;
      }
    }
    // Trả về avatar mặc định nếu user hoặc user.profile_pic không tồn tại
    return "https://via.placeholder.com/150";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Thông tin người dùng</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <IoClose size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Avatar */}
        <div className="flex justify-center">
          <img
            src={getAvatarUrl()}
            alt={user.name}
            className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://via.placeholder.com/150"; // fallback image
            }}
          />
        </div>

        {/* Thông tin cơ bản */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
          <p className="text-gray-600">{user.phone}</p>
        </div>

        {/* Nút hành động */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => onChatClick && onChatClick(user)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mr-2"
          >
            Nhắn tin
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}; 