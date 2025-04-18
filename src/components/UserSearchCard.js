import React from "react";
import Avatar from "./Avatar";
import { Link } from "react-router-dom";

export const UserSearchCard = ({ user, onClose }) => {
  return (
    <Link
      to={"/" + user._id}
      onClick={onClose}
      className="flex items-center gap-3 p-2 lg:p-4 border border-transparent border-t-slate-200 hover:border hover:border-blue-300"
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
  );
};
