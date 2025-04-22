import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

const FriendRequestActions = ({ userId, requestId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useSelector((state) => state?.user);
  const socketConnection = useSelector((state) => state?.user?.socketConnection);

  const handleAcceptRequest = async () => {
    try {
      setIsLoading(true);
      const URL = `${process.env.REACT_APP_BACKEND}/api/handle-friend-request`;
      
      const response = await axios.post(URL, {
        currentUserId: currentUser._id,
        requestId: requestId,
        action: 'accept'
      });

      if (response.data.success) {
        // Emit socket event for friend request response
        socketConnection.emit("friend-request-response", {
          fromUserId: userId,
          action: 'accept'
        });

        toast.success("Đã chấp nhận lời mời kết bạn!");
        window.location.reload(); // Reload to update the UI
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    try {
      setIsLoading(true);
      const URL = `${process.env.REACT_APP_BACKEND}/api/handle-friend-request`;
      
      const response = await axios.post(URL, {
        currentUserId: currentUser._id,
        requestId: requestId,
        action: 'reject'
      });

      if (response.data.success) {
        // Emit socket event for friend request response
        socketConnection.emit("friend-request-response", {
          fromUserId: userId,
          action: 'reject'
        });

        toast.success("Đã từ chối lời mời kết bạn!");
        window.location.reload(); // Reload to update the UI
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleAcceptRequest}
        disabled={isLoading}
        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50 text-sm"
      >
        Chấp nhận
      </button>
      <button
        onClick={handleRejectRequest}
        disabled={isLoading}
        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
      >
        Từ chối
      </button>
    </div>
  );
};

export default FriendRequestActions; 