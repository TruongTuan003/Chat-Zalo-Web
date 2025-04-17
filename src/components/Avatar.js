import React from "react";
import { TbUserCircle } from "react-icons/tb";

export const Avatar = ({ userId, name, imageUrl, width = 50, height = 50 }) => {
  let avatarName = "";

  if (name) {
    const splitName = name.split(" ");
    if (splitName.length > 1) {
      avatarName = splitName[0][0] + splitName[1][0]; // Lấy ký tự đầu của 2 từ đầu
    } else {
      avatarName = splitName[0][0]; // Lấy ký tự đầu tiên của tên
    }
  }

  return (
    <div
      className="text-slate-800 overflow-hidden font-bold rounded-full flex items-center justify-center"
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
    </div>
  );
};

export default Avatar;
