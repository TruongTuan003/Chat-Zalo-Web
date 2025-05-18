import React, { useEffect, useState } from "react";
import { IoSearchOutline, IoClose } from "react-icons/io5";
import { Loading } from "./Loading";
import { UserSearchCard } from "./UserSearchCard";
import toast from "react-hot-toast";
import axios from "axios";
import { useSelector } from "react-redux";
import Flag from 'react-world-flags';

export const SearchUser = ({ onClose }) => {
  const [searchUser, setSearchUser] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [validationError, setValidationError] = useState('');
  const currentUser = useSelector((state) => state?.user);

  const handleSearchUser = async () => {
    if (search.trim() === '') {
      setSearchUser([]);
      setSearchAttempted(false);
      setValidationError('');
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(search.trim())) {
        setValidationError('Số điện thoại không hợp lệ (phải đủ 10 chữ số)');
        setSearchUser([]);
        setSearchAttempted(true);
        return;
    }

    setValidationError('');

    const URL = `${process.env.REACT_APP_BACKEND}/api/search-user?currentUserId=${currentUser._id}`;

    try {
      setLoading(true);
      setSearchAttempted(true);
      const response = await axios.post(URL, {
        search: search
      });
      setLoading(false);
      setSearchUser(response.data.data);
    } catch (error) {
      setLoading(false);
      setSearchAttempted(true);
      toast.error(error?.response?.data?.message);
      setSearchUser([]);
      setValidationError('');
    }
  };

  useEffect(() => {
      setSearchUser([]);
      setSearchAttempted(false);
      setSearch('');
      setValidationError('');
  }, [onClose]);

  console.log("searchUser", searchUser);
  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 bg-slate-700 bg-opacity-40 p-2 flex justify-center items-center z-[9999]">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden">
        {/** Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Thêm bạn</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <IoClose size={24} />
          </button>
        </div>

        <div className="p-4">
          {/** Input search user with country code */}
          <div className="flex items-center border-b border-blue-600 pb-2 mb-4">
            {/* Flag and Country Code */}
            <div className="flex items-center gap-1 mr-2 text-slate-600">
              {/* Flag Icon */}
              <Flag code="VN" className="w-5 h-auto" />
              {/* Country Code */}
              <span>(+84)</span>
              {/* Dropdown Icon Placeholder */}
              <span className="cursor-pointer">▼</span>
            </div>
            <input
              key="phone-input"
              className="outline-none text-slate-800 placeholder-slate-400 flex-grow"
              type="text"
              placeholder="Số điện thoại"
              onChange={(e) => setSearch(e.target.value)}
              value={search}
            />
          </div>

          {validationError && (
              <p className="text-red-600 text-sm mt-1">{validationError}</p>
          )}

          {/** display search user / messages */}
          <div className="w-full max-h-[calc(100vh-250px)] overflow-y-auto">
            {loading && (
              <div className="text-center">
                <Loading />
              </div>
            )}

            {!loading && !searchAttempted && (
              <p className="text-center text-slate-500">Không có tìm kiếm nào gần đây</p>
            )}

            {!loading && searchAttempted && searchUser.length === 0 && !validationError && (
                 <p className="text-center text-slate-500">Không tìm thấy kết quả phù hợp</p>
            )}

            {!loading && searchUser.length > 0 && (
              searchUser.map((user, index) => (
                <UserSearchCard key={user._id} user={user} onClose={onClose} />
              ))
            )}
          </div>
        </div>

        {/** Action buttons */}
        <div className="flex justify-end gap-3 p-4 bg-slate-100 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-semibold"
          >
            Hủy
          </button>
          <button
            onClick={handleSearchUser}
            className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold"
          >
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
};
