import React from "react";
import { TbUserCircle } from "react-icons/tb";
import { useSelector } from "react-redux";

export const Avatar = ({ userId, name, imageUrl, width = 50, height = 50 }) => {
  const onlineUser = useSelector((state) => state?.user?.onlineUser);

  let avatarName = "";

  if (name) {
    const splitName = name.split(" ");
    if (splitName.length > 1) {
      avatarName = splitName[0][0] + splitName[1][0]; // Lấy ký tự đầu của 2 từ đầu
    } else {
      avatarName = splitName[0][0]; // Lấy ký tự đầu tiên của tên
    }
  }

  const isOnline = onlineUser.includes(userId);

  return (
    <div
      className="text-slate-800 overflow-hidden font-bold rounded-full flex items-center justify-center relative"
      style={{ width, height }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          width={width}
          height={height}
          alt={name}
          className="overflow-hidden rounded-full"
        />
      ) : name ? (
        <div
          style={{
            width,
            height,
            fontSize: width / 2,
            backgroundColor: "#ccc",
          }}
          className="flex items-center justify-center rounded-full font-bold text-white"
        >
          {avatarName.toUpperCase()}
        </div>
      ) : (
        <TbUserCircle size={width} />
      )}

      {isOnline && (
        <div className="bg-green-600 p-2 absolute bottom-0 right-0  rounded-full"></div>
      )}
    </div>
  );
};

export default Avatar;
