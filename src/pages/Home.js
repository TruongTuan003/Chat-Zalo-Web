import axios from "axios";
import React, { useEffect, useState } from "react";
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
import EditUserDetails from "../components/EditUserDetails";

function Home() {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [editUserOpen, setEditUserOpen] = useState(false);

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

  // Slider data
  const slides = [
    {
      title: ["Chào mừng đến với ", "Zalo PC", "!"],
      desc: "Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hoá cho máy tính của bạn.",
      img: "https://cdn-icons-png.flaticon.com/512/4149/4149653.png", // Ảnh minh họa cloud
      subTitle: "Trải nghiệm xuyên suốt",
      subDesc: "Kết nối và giải quyết công việc trên mọi thiết bị với dữ liệu luôn được đồng bộ"
    },
    {
      title: ["Gửi file siêu nhanh"],
      desc: "Chia sẻ tài liệu, hình ảnh, video dung lượng lớn dễ dàng và bảo mật.",
      img: "https://cdn-icons-png.flaticon.com/512/724/724933.png", // Ảnh minh họa gửi file
      subTitle: "Chia sẻ tiện lợi",
      subDesc: "Gửi và nhận file mọi lúc mọi nơi, không giới hạn thiết bị"
    },
    {
      title: ["Bảo mật và riêng tư"],
      desc: "Tin nhắn và dữ liệu của bạn luôn được bảo vệ an toàn tuyệt đối.",
      img: "https://cdn-icons-png.flaticon.com/512/3064/3064197.png", // Ảnh minh họa bảo mật
      subTitle: "An tâm sử dụng",
      subDesc: "Mọi thông tin cá nhân đều được mã hoá và bảo mật tối đa"
    }
  ];
  const [current, setCurrent] = useState(0);
  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length);
  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  const basePath = location.pathname === "/";
  return (
    <div className="w-full h-full grid grid-cols-[358px,1fr]">
      <Sidebar setEditUserOpen={setEditUserOpen} />
      <section className="w-full h-full">
        {basePath ? (
          <div className="flex justify-center items-center w-full h-full" style={{ background: '#e9eef6' }}>
            <div className="w-full flex flex-col items-center justify-center h-full select-none">
              <div className="flex flex-row items-center justify-center w-full">
                <button
                  onClick={goPrev}
                  className="text-3xl px-6 py-2 text-blue-700 hover:text-blue-700 focus:outline-none"
                  aria-label="Previous slide"
                  style={{ fontWeight: 300 }}
                >
                  &#60;
                </button>
                <div className="flex flex-col items-center max-w-xl mx-8">
                  <h2 className="text-3xl font-bold text-center mb-2 text-black">
                    {slides[current].title.length === 3 ? (
                      <>
                        {slides[current].title[0]}
                        <span className="text-blue-600 font-bold">{slides[current].title[1]}</span>
                        {slides[current].title[2]}
                      </>
                    ) : (
                      slides[current].title[0]
                    )}
                  </h2>
                  <p className="text-center text-gray-500 mb-6 text-lg">{slides[current].desc}</p>
                  <img
                    src={slides[current].img}
                    alt="welcome-illustration"
                    className="w-40 h-32 object-contain mb-6 drop-shadow"
                    draggable="false"
                    style={{ background: 'white', borderRadius: 16, padding: 12 }}
                  />
                  <div className="text-center mt-2">
                    <div className="text-blue-600 font-semibold text-lg mb-1">
                      {slides[current].subTitle}
                    </div>
                    <div className="text-gray-500 text-base">
                      {slides[current].subDesc}
                    </div>
                  </div>
                </div>
                <button
                  onClick={goNext}
                  className="text-3xl px-6 py-2 text-blue-700 hover:text-blue-700 focus:outline-none"
                  aria-label="Next slide"
                  style={{ fontWeight: 300 }}
                >
                  &#62;
                </button>
              </div>
              {/* Dots */}
              <div className="flex flex-row justify-center mt-8 gap-2">
                {slides.map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-3 h-3 rounded-full ${
                      idx === current ? "bg-blue-500" : "bg-gray-300"
                    } block transition-all`}
                    style={{ margin: "0 4px" }}
                  ></span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </section>
      {editUserOpen && <EditUserDetails onClose={() => setEditUserOpen(false)} user={user} />}
    </div>
  );
}

export default Home;
