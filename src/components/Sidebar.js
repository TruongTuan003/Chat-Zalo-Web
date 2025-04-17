import React, { useState } from "react";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import { FaUserPlus } from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import Avatar from "./Avatar";
import { useDispatch, useSelector } from "react-redux";
import EditUserDetails from "./EditUserDetails";
import { logout } from "../redux/userSlice";
import SearchUser from "./SearchUser";

export const Sidebar = () => {
  const user = useSelector((state) => state?.user);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [searchUserOpen, setSearchUserOpen] = useState(false);
  const [allUser, setAllUser] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    localStorage.clear();
  };

  return (
    <div className="w-full h-full grid grid-cols-[48px,1fr] bg-white">
      <div className="bg-slate-100 w-12 h-full rounded-tr-lg rounded-br-lg py-5 text-slate-600 flex flex-col justify-between">
        <div>
          <NavLink
            className={({ isActive }) =>
              `w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 ${
                isActive && "bg-slate-200"
              }`
            }
            title="chat"
          >
            <IoChatbubbleEllipsesSharp size={20} />
          </NavLink>
          <div
            title="add friend"
            className="w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200"
            onClick={() => setSearchUserOpen(true)}
          >
            <FaUserPlus size={20} />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <button
            className="mx-auto"
            title={user.name}
            onClick={() => setEditUserOpen(true)}
          >
            <Avatar
              imageUrl={user?.profile_pic}
              width={40}
              height={40}
              name={user.name}
            />
            <div></div>
          </button>
          <button
            title="logout"
            className="w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200"
            onClick={handleLogout}
          >
            <span className="-ml-1">
              <BiLogOut size={20} />
            </span>
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="h-16 flex items-center">
          <h2 className="text-xl font-bold p-4 text-slate-800">message</h2>
        </div>
        <div className="bg-slate-200 p-[0.5px]"></div>
        <div className="h-[calc(100vh-65px)] overflow-x-hidden overflow-y-auto scrollbar">
          {allUser.length === 0 && (
            <div>
              <div></div>
              <p className="text-lg text-center text-slate-400">
                Explore user to start a conversation with.
              </p>
            </div>
          )}
        </div>
      </div>

      {/** edit user details */}
      {editUserOpen && (
        <EditUserDetails onClose={() => setEditUserOpen(false)} user={user} />
      )}

      {/** search user */}
      {searchUserOpen && (
        <SearchUser onClose={() => setSearchUserOpen(false)} />
      )}
    </div>
  );
};
