import React, { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";
import uploadFile from "../helpers/uploadFile";
import { Diveder } from "./Diveder";
import axios from "axios";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/userSlice";

const EditUserDetails = ({ onClose, user }) => {
  const [data, setData] = useState({
    name: user?.user,
    profile_pic: user?.profile_pic,
  });
  const uploadPhotoRef = useRef();
  const dispatch = useDispatch();

  useEffect(() => {
    if (user) {
      setData((prev) => ({
        ...prev,
        ...user,
      }));
      localStorage.setItem("edit-user-data", JSON.stringify(user));
    }
  }, [user]);

  console.log("user edit", user);

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
    try {
      const URL = `${process.env.REACT_APP_BACKEND}/api/update-user`;

      const response = await axios({
        method: "post",
        url: URL,
        data: data,
        withCredentials: true,
      });

      toast.success(response?.data?.message || "User updated successfully!");

      if (response.data.success) {
        dispatch(setUser(response.data.data));
      }
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message);
    }
  };

  const handleOpenUploadPhoto = (e) => {
    e.preventDefault();
    e.stopPropagation();

    uploadPhotoRef.current.click();
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    const uploadPhoto = await uploadFile(file);
    setData((preve) => {
      return {
        ...preve,
        profile_pic: uploadPhoto?.url,
      };
    });
  };

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 bg-gray-700 bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-4 rounded w-full max-w-sm">
        <h2 className="font-semibold">Profile</h2>
        <p className="text-sm">Edit user detail</p>
        <form className="grid gap-3 mt-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="name">
              Name:
              <input
                type="text"
                name="name"
                id="name"
                value={data.name}
                onChange={handleOnChange}
                className="w-full py-1 px-2 focus:outline-primary border-0.5"
              />
            </label>
          </div>
          <div>
            <div>Photo:</div>
            <div className="my-1 flex items-center gap-4">
              <Avatar
                width={40}
                height={40}
                imageUrl={data?.profile_pic}
                name={data?.name}
              />
              <button
                type="button"
                onClick={handleOpenUploadPhoto}
                className="font-semibold"
              >
                Change Photo
              </button>
              <input
                type="file"
                className="hidden"
                ref={uploadPhotoRef}
                onChange={handleUploadPhoto}
              />
            </div>
          </div>
          <Diveder />
          <div className="flex gap-2 w-fit ml-auto">
            <button
              onClick={onClose}
              className="border-primary text-primary border px-4 py-1 rounded hover:bg-primary hover:text-white"
            >
              Cancel
            </button>
            <button
              onSubmit={handleSubmit}
              className="border-primary text-white bg-primary border px-4 py-1 rounded hover:bg-secondary"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(EditUserDetails);
