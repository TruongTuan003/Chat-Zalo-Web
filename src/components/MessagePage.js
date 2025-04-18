import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import Avatar from "./Avatar";
import { HiDotsVertical } from "react-icons/hi";
import { FaAngleLeft, FaPlus, FaImage, FaVideo, FaFile } from "react-icons/fa6";
import uploadFile from "../helpers/uploadFile";
import { IoClose } from "react-icons/io5";
import { Loading } from "./Loading";
import { IoMdSend } from "react-icons/io";
import moment from "moment";
import ForwardedMessage from "./ForwardedMessage";
import ForwardMessageMenu from "./ForwardMessageMenu";
import MessageReactions from "./MessageReactions";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { format } from "date-fns";
import { vi } from "date-fns/locale";

function MessagePage() {
  const params = useParams();
  const socketConnection = useSelector(
    (state) => state?.user?.socketConnection
  );
  const user = useSelector((state) => state?.user);

  const [dataUser, setDataUser] = useState({
    name: "",
    phone: "",
    profile_pic: "",
    online: false,
    _id: "",
  });

  const [message, setMassage] = useState({
    text: "",
    imageUrl: "",
    videoUrl: "",
    fileUrl: "",
    fileName: ""
  });

  const [loading, setLoading] = useState(false);
  const [allMessage, setAllMessage] = useState([]);
  const currentMessage = useRef(null);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (currentMessage.current) {
      currentMessage.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [allMessage]);

  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);

  const handleUploadImageVideoOpen = () => {
    setOpenImageVideoUpload((preve) => !preve);
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];

    setLoading(true);
    const uploadPhoto = await uploadFile(file);
    setLoading(false);
    setOpenImageVideoUpload(false);

    setMassage((prev) => ({
      ...prev,
      imageUrl: uploadPhoto.url,
    }));
  };
  const hanldeClearUploadImage = () => {
    setMassage((prev) => ({
      ...prev,
      imageUrl: "",
    }));
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    setLoading(true);
    const uploadPhoto = await uploadFile(file);
    setLoading(false);
    setOpenImageVideoUpload(false);

    setMassage((prev) => ({
      ...prev,
      videoUrl: uploadPhoto.url,
    }));
  };

  const hanldeClearUploadVideo = () => {
    setMassage((prev) => ({
      ...prev,
      videoUrl: "",
    }));
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn. Kích thước tối đa là 10MB');
      return;
    }

    setLoading(true);
    try {
      const uploadResult = await uploadFile(file);
      setLoading(false);
      setOpenImageVideoUpload(false);

      setMassage((prev) => ({
        ...prev,
        fileUrl: uploadResult.url,
        fileName: file.name
      }));
    } catch (error) {
      setLoading(false);
      toast.error('Không thể tải file lên. Vui lòng thử lại');
    }
  };

  const handleClearUploadFile = () => {
    setMassage((prev) => ({
      ...prev,
      fileUrl: "",
      fileName: ""
    }));
  };

  console.log("params", params.userId);

  useEffect(() => {
    if (socketConnection) {
      socketConnection.emit("message-page", params.userId);
      socketConnection.emit("seen", params.userId);

      socketConnection.on("message-user", (data) => {
        setDataUser(data);
      });

      socketConnection.on("message", (data) => {
        console.log("message data", data);
        setAllMessage(data);
      });

      // Get contacts for forwarding
      socketConnection.emit("get-contacts");
      socketConnection.on("contacts", (data) => {
        console.log("contacts data", data);
        setContacts(data);
      });

      // Listen for delete message success
      socketConnection.on("delete-message-success", (data) => {
        console.log("Message deleted successfully:", data.messageId);
        toast.success('Đã xóa tin nhắn thành công', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      });

      // Listen for errors
      socketConnection.on("error", (error) => {
        console.error("Socket error:", error);
        toast.error(error.message || 'Có lỗi xảy ra', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      });

      // Cleanup socket listeners
      return () => {
        socketConnection.off("message-user");
        socketConnection.off("message");
        socketConnection.off("contacts");
        socketConnection.off("delete-message-success");
        socketConnection.off("error");
      };
    }
  }, [socketConnection, params.userId, user]);

  const handleOnchange = (e) => {
    const { name, value } = e.target;

    setMassage((preve) => {
      return {
        ...preve,
        text: value,
      };
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (message.text || message.imageUrl || message.videoUrl || message.fileUrl) {
      if (socketConnection) {
        socketConnection.emit("new massage", {
          sender: user?._id,
          receiver: params.userId,
          text: message.text,
          imageUrl: message.imageUrl,
          videoUrl: message.videoUrl,
          fileUrl: message.fileUrl,
          msgByUserId: user._id,
        });
        setMassage({
          text: "",
          imageUrl: "",
          videoUrl: "",
          fileUrl: "",
          fileName: ""
        });
      }
    }
  };

  const handleForwardMessage = (messageId, receiverId) => {
    if (socketConnection) {
      socketConnection.emit("forward message", {
        messageId,
        sender: user._id,
        receiver: receiverId
      });
    }
  };

  const handleReaction = (messageId, emoji) => {
    if (socketConnection) {
      socketConnection.emit("react_to_message", {
        messageId,
        emoji
      });
    }
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

    if (isToday) {
      return format(date, "HH:mm", { locale: vi });
    } else if (isYesterday) {
      return `Hôm qua ${format(date, "HH:mm", { locale: vi })}`;
    } else {
      return format(date, "dd/MM/yyyy HH:mm", { locale: vi });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ToastContainer />
      <header className="sticky top-0 h-16 bg-white flex justify-between items-center px-4">
        <div className="flex items-center gap-4">
          <Link to={"/"} className="lg:hidden">
            <FaAngleLeft size={25} />
          </Link>
          <div>
            <Avatar
              width={50}
              height={50}
              imageUrl={dataUser?.profile_pic}
              name={dataUser?.name}
              userId={dataUser?._id}
            />
          </div>
          <div>
            <h3 className="font-semibold text-lg my-0">{dataUser?.name}</h3>
            <p className="-my-2 text-sm">
              {dataUser.online ? (
                <span className="text-primary">online</span>
              ) : (
                <span className="text-slate-400">offline</span>
              )}
            </p>
          </div>
        </div>

        <div className="">
          <button className="cursor-pointer ">
            <HiDotsVertical />
          </button>
        </div>
      </header>

      {/** show all message */}
      <section className="h-[calc(100vh-128px)] overflow-hidden overflow-y-scroll scrollbar relative ">
        {/** all message show here */}
        <div className="flex flex-col gap-2 py-2 mx-2" ref={currentMessage}>
          {allMessage.map((msg, index) => {
            return (
              <div
                key={msg._id}
                className={`bg-white p-1 py-2 rounded w-fit max-w-[280px] md:max-w-sm lg:max-w-md relative ${
                  user._id === msg.msgByUserId ? "ml-auto bg-teal-300" : ""
                }`}
              >
                {msg.forwardFrom && (
                  <ForwardedMessage message={msg.forwardFrom} />
                )}
                <div className="w-full">
                  {msg?.imageUrl && (
                    <img
                      src={msg?.imageUrl}
                      alt="uploadImage"
                      width={300}
                      height={300}
                      className="w-full h-full object-scale-down"
                    />
                  )}
                </div>
                {msg?.videoUrl && (
                  <video
                    src={msg?.videoUrl}
                    alt="uploadVideo"
                    width={300}
                    height={300}
                    controls
                    className="w-full h-full object-scale-down"
                  />
                )}
                {msg?.fileUrl && (
                  <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                    <FaFile className="text-blue-500" />
                    <a 
                      href={msg.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline truncate max-w-[200px]"
                      title={msg.fileName || 'Tải file'}
                    >
                      {msg.fileName || 'Tải file'}
                    </a>
                  </div>
                )}

                <p className="px-2">{msg.text}</p>
                
                <div className="flex items-center justify-between px-2">
                  <MessageReactions 
                    message={msg}
                    onReact={handleReaction}
                    currentUserId={user._id}
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">
                      {formatMessageTime(msg.createdAt)}
                    </p>
                    <ForwardMessageMenu
                      onForward={handleForwardMessage}
                      contacts={contacts}
                      selectedMessage={msg}
                      currentChatUserId={params.userId}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/** upload image display */}
        {message.imageUrl && (
          <div className="w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-10 flex justify-center items-center rounded overflow-hidden ">
            <div
              className="w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600 "
              onClick={hanldeClearUploadImage}
            >
              <IoClose size={30} />
            </div>
            <div className="bg-white p-3">
              <img
                src={message.imageUrl}
                width={300}
                height={300}
                alt="uploadImage"
                className="aspect-square w-full h-full max-w-sm m-2 object-scale-down "
              />
            </div>
          </div>
        )}
        {/** upload video display */}
        {message.videoUrl && (
          <div className="w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-10 flex justify-center items-center rounded overflow-hidden ">
            <div
              className="w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600 "
              onClick={hanldeClearUploadVideo}
            >
              <IoClose size={30} />
            </div>
            <div className="bg-white p-3">
              <video
                src={message.videoUrl}
                width={300}
                height={300}
                className="aspect-square w-full h-full max-w-sm m-2 object-scale-down "
                controls
                muted
                autoPlay
              />
            </div>
          </div>
        )}
        {message.fileUrl && (
          <div className="w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-10 flex justify-center items-center rounded overflow-hidden">
            <div
              className="w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600"
              onClick={handleClearUploadFile}
            >
              <IoClose size={30} />
            </div>
            <div className="bg-white p-3">
              <div className="flex items-center gap-2">
                <FaFile className="text-blue-500" />
                <span className="text-sm">{message.fileName}</span>
              </div>
            </div>
          </div>
        )}
        {loading && (
          <div className="w-full h-full sticky bottom-0 flex justify-center items-center">
            <Loading />
          </div>
        )}
      </section>
      {/**send message */}
      <section className="h-16 bg-white flex items-center px-4">
        <div className=" relative ">
          <button
            onClick={handleUploadImageVideoOpen}
            className="flex justify-center items-center w-11 h-11 rounded-full hover:bg-slate-400 hover:text-white"
          >
            <FaPlus size={20} />
          </button>
          {/**video va image */}
          {openImageVideoUpload && (
            <div className="bg-white shadow rounded absolute bottom-14 w-36 p-2">
              <form>
                <label
                  htmlFor="uploadImage"
                  className="flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer"
                >
                  <div className="text-primary">
                    <FaImage size={18} />
                  </div>
                  <p>Hình ảnh</p>
                </label>
                <label
                  htmlFor="uploadVideo"
                  className="flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer"
                >
                  <div>
                    <FaVideo size={18} />
                  </div>
                  <p>Video</p>
                </label>
                <label
                  htmlFor="uploadFile"
                  className="flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer"
                >
                  <div>
                    <FaFile size={18} />
                  </div>
                  <p>File</p>
                </label>
                <input
                  type="file"
                  id="uploadImage"
                  onChange={handleUploadImage}
                  className="hidden"
                  accept="image/*"
                />
                <input
                  type="file"
                  id="uploadVideo"
                  onChange={handleUploadVideo}
                  className="hidden"
                  accept="video/*"
                />
                <input
                  type="file"
                  id="uploadFile"
                  onChange={handleUploadFile}
                  className="hidden"
                />
              </form>
            </div>
          )}
        </div>

        {/**input box */}
        <form className="h-full w-full flex gap-2" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            className="py-1 px-4 outline-none w-full h-full"
            value={message.text}
            onChange={handleOnchange}
          />
          <button className="hover:text-slate-500 cursor-pointer">
            <IoMdSend size={28} />
          </button>
        </form>
      </section>
    </div>
  );
}

export default MessagePage;
