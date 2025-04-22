import React, { useState } from "react";
import Avatar from "./Avatar";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

export const UserSearchCard = ({ user, onClose }) => {
  const [isFriend, setIsFriend] = useState(user.isFriend);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useSelector((state) => state?.user);
  const socketConnection = useSelector((state) => state?.user?.socketConnection);

  const handleSendFriendRequest = async () => {
    try {
      setIsLoading(true);
      const URL = `${process.env.REACT_APP_BACKEND}/api/send-friend-request`;
      
      const response = await axios.post(URL, {
        currentUserId: currentUser._id,
        targetUserId: user._id
      });

      if (response.data.success) {
        socketConnection.emit("send-friend-request", {
          targetUserId: user._id
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-2 lg:p-4 border border-transparent border-t-slate-200 hover:border hover:border-blue-300">
      <Link
        to={"/" + user._id}
        onClick={onClose}
        className="flex items-center gap-3 flex-1"
      >
        <div>
          <Avatar
            width={50}
            height={50}
            name={user?.name}
            userId={user?._id}
            imageUrl={user?.profile_pic}
          />
        </div>
        <div className="">
          <div className="font-semibold text-ellipsis line-clamp-1">
            {user.name}
          </div>
          <p className="text-sm text-ellipsis line-clamp-1">{user.phone}</p>
        </div>
      </Link>
      <div>
        {isFriend ? (
          <span className="text-green-500 text-sm">Bạn bè</span>
        ) : (
          <button
            onClick={handleSendFriendRequest}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Đang xử lý..." : "Kết bạn"}
          </button>
        )}
      </div>
    </div>
  );
};
