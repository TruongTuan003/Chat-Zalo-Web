import React, { useEffect, useState, useCallback } from "react";
import { IoSearchOutline, IoClose } from "react-icons/io5";
import { Loading } from "./Loading";
import { UserSearchCard } from "./UserSearchCard";
import { UserProfileCard } from "./UserProfileCard";
import toast from "react-hot-toast";
import axios from "axios";
import { useSelector } from "react-redux";
import Flag from 'react-world-flags';

export const SearchUser = ({ onClose, navigate }) => {
  const [searchUserResult, setSearchUserResult] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [validationError, setValidationError] = useState('');
  const currentUser = useSelector((state) => state?.user);

  const RECENT_SEARCHES_STORAGE_KEY = 'recentPhoneSearches';
  const MAX_RECENT_SEARCHES = 5;

  useEffect(() => {
    const storedRecent = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (storedRecent) {
      try {
        setRecentSearches(JSON.parse(storedRecent));
      } catch (e) {
        console.error("Failed to parse recent searches from localStorage", e);
        setRecentSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  const handleSearchUser = async () => {
    if (search.trim() === '') {
      setSearchUserResult(null);
      setSearchAttempted(false);
      setValidationError('');
      return;
    }

    const phoneRegex = /^(?:\+?84|84|0)?(\d{9,10})$/;
    const match = search.trim().match(phoneRegex);
    
    let phoneNumberToSearch = search.trim();

    if (match) {
       phoneNumberToSearch = match[1].length === 9 ? '0' + match[1] : match[1];
    } else {
       setValidationError('Số điện thoại không hợp lệ');
       setSearchUserResult(null);
       setSearchAttempted(true);
       return;
    }
    
    setValidationError('');

    const URL = `${process.env.REACT_APP_BACKEND}/api/search-user?currentUserId=${currentUser._id}`;

    try {
      setLoading(true);
      setSearchAttempted(true);
      setSearchUserResult(null);
      
      const response = await axios.post(URL, {
        search: phoneNumberToSearch
      });
      
      setLoading(false);
      
      const foundUsers = response.data.data;

      if (foundUsers && foundUsers.length > 0) {
        const foundUser = foundUsers[0];
        setSearchUserResult(foundUser);
        
        setRecentSearches(prevSearches => {
          const existingIndex = prevSearches.findIndex(item => item._id === foundUser._id);
          let newSearches = [];
          if (existingIndex > -1) {
            newSearches = prevSearches.filter(item => item._id !== foundUser._id);
          } else {
            newSearches = [...prevSearches];
          }
          newSearches.unshift(foundUser);
          return newSearches.slice(0, MAX_RECENT_SEARCHES);
        });

      } else {
        setSearchUserResult(null);
      }
    } catch (error) {
      setLoading(false);
      setSearchAttempted(true);
      toast.error(error?.response?.data?.message || 'Đã xảy ra lỗi khi tìm kiếm');
      setSearchUserResult(null);
      setValidationError('');
    }
  };

  useEffect(() => {
      setSearchUserResult(null);
      setSearchAttempted(false);
      setSearch('');
      setValidationError('');
  }, [onClose]);

  const handleUserProfileCardClose = useCallback(() => {
    setSearchUserResult(null);
  }, []);

  console.log("searchUserResult", searchUserResult);
  console.log("recentSearches", recentSearches);

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 bg-slate-700 bg-opacity-40 p-2 flex justify-center items-center z-[9999]">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden">
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
          <div className="flex items-center border-b border-blue-600 pb-2 mb-4">
            <div className="flex items-center gap-1 mr-2 text-slate-600">
              <Flag code="VN" className="w-5 h-auto" />
              <span>(+84)</span>
            </div>
            <input
              key="phone-input"
              className="outline-none text-slate-800 placeholder-slate-400 flex-grow"
              type="text"
              placeholder="Số điện thoại"
              onChange={(e) => {
                const value = e.target.value;
                const numericValue = value.replace(/[^0-9]/g, '');
                setSearch(numericValue);
              }}
              value={search}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchUser();
                }
              }}
            />
            <button
              onClick={handleSearchUser}
              className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
              disabled={loading}
            >
              <IoSearchOutline size={24} />
            </button>
          </div>

          {validationError && (
              <p className="text-red-600 text-sm mt-1">{validationError}</p>
          )}

          <div className="w-full max-h-[calc(100vh-280px)] overflow-y-auto">
            {loading && (
              <div className="text-center">
                <Loading />
              </div>
            )}

            {!loading && searchAttempted && searchUserResult && (
               <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Kết quả tìm kiếm</h3>
                 <UserProfileCard
                   user={searchUserResult}
                   onClose={handleUserProfileCardClose}
                   onChatClick={(userToChat) => {
                     navigate(`/${userToChat._id}`);
                     onClose(); // Close the search modal after navigating
                   }}
                 />
               </div>
            )}

            {!loading && searchAttempted && !searchUserResult && !validationError && (
                 <p className="text-center text-slate-500">Không tìm thấy kết quả phù hợp</p>
            )}

            {!loading && !searchUserResult && recentSearches.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Kết quả gần nhất</h3>
                <div className="space-y-2">
                  {recentSearches.map((user) => (
                    <UserSearchCard key={user._id} user={user} onClose={onClose} />
                  ))}
                </div>
              </div>
            )}

            {!loading && !searchUserResult && recentSearches.length === 0 && (
               <p className="text-center text-slate-500">Không có tìm kiếm nào gần đây</p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
