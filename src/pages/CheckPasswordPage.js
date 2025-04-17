import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Avatar } from "../components/Avatar";
import { useDispatch } from "react-redux";
import { setToken } from "../redux/userSlice";

function CheckPasswordPage() {
  const [data, setData] = useState({
    password: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!location?.state?.name || !location?.state?._id) {
      navigate("/phone");
    }
  }, [location, navigate]);

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

    const URL = `${process.env.REACT_APP_BACKEND}/api/password`;
    try {
      const response = await axios({
        method: "post",
        url: URL,
        data: {
          userId: location?.state?._id,
          password: data.password,
        },
        withCredentials: true,
      });

      toast.success(response.data.message);

      if (response.data.success) {
        dispatch(setToken(response?.data?.token));
        localStorage.setItem("token", response?.data?.token);
        setData({ password: "" });
        navigate("/");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message);
      console.log("error", error);
    }
  };

  const handleForgotPassword = async () => {
    const phone = location?.state?.phone;

    if (!phone) {
      toast.error("Phone number is missing. Please try again.");
      return;
    }

    const URL = `${process.env.REACT_APP_BACKEND}/api/phone`;
    try {
      const response = await axios.post(URL, { phone });
      toast.success("Check your phone for the reset link!");

      if (response.data.success) {
        navigate("/reset-password", {
          state: { token: response.data.token },
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="mt-5">
      <div className="bg-white w-full max-w-md rounded overflow-hidden p-4 mx-auto">
        <div className="w-fit mx-auto mb-2 flex justify-center items-center flex-col">
          <Avatar
            width={70}
            height={70}
            name={location?.state?.name}
            imageUrl={location?.state?.profile_pic}
          />
          <h2 className="font-semibold text-lg mt-1">
            {location?.state?.name}
          </h2>
        </div>
        <h3>Welcome to Chat app!</h3>
        <form className="grid gap-4 mt-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="password">Password :</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              className="bg-slate-100 px-2 py-1 focus:outline-primary"
              value={data.password}
              onChange={handleOnChange}
              required
            />
          </div>

          <button className="bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide">
            Let's Go
          </button>
        </form>
        <p className="my-3 text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="hover:text-primary font-semibold underline mx-auto mt-2"
          >
            Forgot password ?
          </button>
        </p>
      </div>
    </div>
  );
}

export default CheckPasswordPage;
