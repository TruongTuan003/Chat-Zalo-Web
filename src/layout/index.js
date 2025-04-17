import React from "react";
import { useNavigate } from "react-router-dom";
export const AuthLayouts = ({ children }) => {
  const navigate = useNavigate();
  return (
    <>
      <header className="bg-white flex justify-center items-center py-3 h-20 shadow-md">
        <h1
          onClick={() => navigate("/login")}
          className="text-2xl font-bold text-blue-600 cursor-pointer"
        >
          Zalo App
        </h1>
      </header>
      {children}
    </>
  );
};
