import axios from "axios";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  logout,
  setOnlineUser,
  setSocketConnection,
  setUser,
} from "../redux/userSlice";
import { Sidebar } from "../components/Sidebar";
import io from "socket.io-client";

function Home() {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  console.log("user", {
    _id: user._id,
    name: user.name,
    email: user.email,
    profile_pic: user.profile_pic,
    token: user.token,
    onlineUser: user.onlineUser,
  });

  const fetchUserDetails = async () => {
    try {
      const URL = `${process.env.REACT_APP_BACKEND}/api/user-details`;
      const token = localStorage.getItem("token");

      const response = await axios.get(URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      dispatch(setUser(response.data.data));

      if (response.data.data.logout) {
        dispatch(logout());
        navigate("/phone");
      }

      console.log("current user details", response.data.data);
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);
  /**socket connection */

  useEffect(() => {
    const socketConnection = io(process.env.REACT_APP_BACKEND, {
      auth: {
        token: localStorage.getItem("token"),
      },
    });
    socketConnection.on("onlineUser", (data) => {
      console.log("data", data);
      dispatch(setOnlineUser(data));
    });
    dispatch(setSocketConnection(socketConnection));
    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const basePath = location.pathname === "/";
  return (
    <div className="grid lg:grid-cols-[300px,1fr] h-screen max-h-screen">
      <section className={`bg-white ${!basePath && "hidden"} lg:block`}>
        <Sidebar />
      </section>
      {/* Message component */}
      <section className={`${basePath && "hidden"}`}>
        <Outlet />
      </section>

      <div
        className={`justify-center items-center flex-col gap-2 hidden ${
          !basePath ? "hidden" : "lg:flex"
        }`}
      >
        <h1 className="text-2xl font-bold text-slate-500">Zalo App</h1>
      </div>
    </div>
  );
}

export default Home;
