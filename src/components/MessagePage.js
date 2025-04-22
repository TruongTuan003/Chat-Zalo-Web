import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import Avatar from "./Avatar";
import { HiDotsVertical, HiSearch, HiReply } from "react-icons/hi";
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
import FriendRequestActions from "./FriendRequestActions";
import axios from "axios";
import { MdPersonRemove } from "react-icons/md";

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

  const [friendRequestStatus, setFriendRequestStatus] = useState({
    isFriend: false,
    hasPendingRequest: false,
    requestId: null,
    isReceiver: false
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [conversationId, setConversationId] = useState(null);

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messageRefs = useRef({});

  const searchTimeoutRef = useRef(null);

  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);

  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);

  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef(null);

  const debouncedSearch = useCallback((value) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim() && conversationId) {
        setIsSearching(true);
        setShowSearchResults(false);
        socketConnection.emit("search-messages", {
          search: value,
          conversationId: conversationId,
          currentUserId: user._id
        });
      } else {
        setShowSearchResults(false);
        setIsSearching(false);
      }
    }, 300); // 300ms delay
  }, [conversationId, socketConnection, user._id]);

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
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    setLoading(true);
    try {
      const uploadPhoto = await uploadFile(file);
      setLoading(false);
      setOpenImageVideoUpload(false);

      // Gửi ảnh ngay lập tức
      if (socketConnection) {
        socketConnection.emit("new massage", {
          sender: user?._id,
          receiver: params.userId,
          text: "",
          imageUrl: uploadPhoto.url,
          videoUrl: "",
          fileUrl: "",
          fileName: "",
          msgByUserId: user._id,
          replyTo: replyToMessage?._id
        });
      }

      // Reset state
      setMassage({
        text: "",
        imageUrl: "",
        videoUrl: "",
        fileUrl: "",
        fileName: ""
      });
      setReplyToMessage(null);
    } catch (error) {
      setLoading(false);
      toast.error('Không thể tải ảnh lên');
    }
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
        const processedMessages = data.map(msg => {
          if (msg.replyTo) {
            return {
              ...msg,
              replyToMessage: msg.replyTo
            };
          }
          return msg;
        });
        setAllMessage(processedMessages);
      });

      // Get conversation ID
      socketConnection.on("conversation-id", (data) => {
        setConversationId(data.conversationId);
      });

      // Get friends list for forwarding
      socketConnection.emit("get-friends");
      socketConnection.on("friends", (data) => {
        console.log("friends data", data);
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
        toast.error(error);
      });

      // Add search message listeners
      socketConnection.on("search-messages-result", (data) => {
        setIsSearching(false);
        if (data.success) {
          setSearchResults(data.data);
          setShowSearchResults(true);
        }
      });

      socketConnection.on("search-messages-error", (error) => {
        console.error("Search error:", error);
        toast.error(error.message || "Không thể tìm kiếm tin nhắn");
        setIsSearching(false);
        setShowSearchResults(false);
      });

      // Add friend request listeners
      socketConnection.on("new-friend-request", (data) => {
        console.log("Received new friend request:", data);
        setFriendRequestStatus(prev => ({
          ...prev,
          hasPendingRequest: true,
          requestId: data.requestId,
          isReceiver: true
        }));
        toast.info("Bạn có lời mời kết bạn mới");
      });

      socketConnection.on("friend-request-accepted", (data) => {
        setFriendRequestStatus(prev => ({
          ...prev,
          isFriend: true,
          hasPendingRequest: false,
          requestId: null
        }));
        if (!friendRequestStatus.isReceiver) {
          toast.success("Đã trở thành bạn bè");
        }
      });

      socketConnection.on("friend-request-rejected", () => {
        setFriendRequestStatus(prev => ({
          ...prev,
          hasPendingRequest: false,
          requestId: null
        }));
        if (!friendRequestStatus.isReceiver) {
          toast.info("Đã từ chối lời mời kết bạn");
        }
      });

      socketConnection.on("friend-request-sent", (data) => {
        if (data.success) {
          setFriendRequestStatus(prev => ({
            ...prev,
            hasPendingRequest: true,
            requestId: data.requestId,
            isReceiver: false
          }));
          toast.success("Đã gửi lời mời kết bạn");
        }
      });

      socketConnection.on("unfriend-success", (data) => {
        setFriendRequestStatus(prev => ({
          ...prev,
          isFriend: false,
          hasPendingRequest: false,
          requestId: null
        }));
        toast.success("Đã hủy kết bạn");
      });

      socketConnection.on("unfriend-received", (data) => {
        setFriendRequestStatus(prev => ({
          ...prev,
          isFriend: false,
          hasPendingRequest: false,
          requestId: null
        }));
        toast.info("Đối phương đã hủy kết bạn");
      });

      // Cleanup socket listeners
      return () => {
        socketConnection.off("message-user");
        socketConnection.off("message");
        socketConnection.off("conversation-id");
        socketConnection.off("friends");
        socketConnection.off("delete-message-success");
        socketConnection.off("error");
        socketConnection.off("search-messages-result");
        socketConnection.off("search-messages-error");
        socketConnection.off("new-friend-request");
        socketConnection.off("friend-request-accepted");
        socketConnection.off("friend-request-rejected");
        socketConnection.off("friend-request-sent");
        socketConnection.off("unfriend-success");
        socketConnection.off("unfriend-received");
      };
    }
  }, [socketConnection, params.userId, user, friendRequestStatus.isReceiver]);

  useEffect(() => {
    const checkFriendRequestStatus = async () => {
      try {
        const response = await axios.post(`${process.env.REACT_APP_BACKEND}/api/check-friend-request`, {
          currentUserId: user._id,
          targetUserId: dataUser._id
        });

        if (response.data.success) {
          setFriendRequestStatus({
            isFriend: response.data.isFriend,
            hasPendingRequest: response.data.hasPendingRequest,
            requestId: response.data.requestId,
            isReceiver: response.data.isReceiver
          });
        }
      } catch (error) {
        console.error("Error checking friend request status:", error);
      }
    };

    if (user._id && dataUser._id) {
      checkFriendRequestStatus();
    }
  }, [user._id, dataUser._id]);

  const handleOnchange = (e) => {
    const { name, value } = e.target;

    setMassage((preve) => {
      return {
        ...preve,
        text: value,
      };
    });
  };

  const handleReplyMessage = (msg) => {
    setReplyToMessage(msg);
    setShowMessageMenu(null);
    // Focus vào input tin nhắn
    document.querySelector('input[placeholder="Nhập tin nhắn..."]')?.focus();
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
          fileName: message.fileName,
          msgByUserId: user._id,
          replyTo: replyToMessage?._id
        });
        setMassage({
          text: "",
          imageUrl: "",
          videoUrl: "",
          fileUrl: "",
          fileName: ""
        });
        setReplyToMessage(null);
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
    if (!socketConnection || !user?._id) return;
    
    socketConnection.emit("react_to_message", {
      messageId,
      emoji,
      userId: user._id
    });
  };

  // Thêm socket listener cho reaction
  useEffect(() => {
    if (!socketConnection) return;

    const handleReactionAdded = (data) => {
      if (!data?.messageId || !data?.emoji) return;

      setAllMessage(prevMessages => 
        prevMessages.map(msg => {
          if (msg?._id === data.messageId) {
            return {
              ...msg,
              reactions: {
                ...(msg.reactions || {}),
                [data.emoji]: ((msg.reactions || {})[data.emoji] || 0) + 1
              }
            };
          }
          return msg;
        })
      );
    };

    socketConnection.on("reaction_added", handleReactionAdded);

    return () => {
      socketConnection.off("reaction_added", handleReactionAdded);
    };
  }, [socketConnection]);

  // Cập nhật phần hiển thị reaction
  const renderReactions = (message) => {
    if (!message?.reactions || Object.keys(message.reactions).length === 0) return null;
    
    return (
      <div className="flex gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, count]) => (
          <div 
            key={emoji} 
            className="bg-gray-100 px-2 py-1 rounded-full text-xs flex items-center gap-1"
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </div>
        ))}
      </div>
    );
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

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (searchResults.length > 0) {
        // Calculate next index
        const nextIndex = (currentSearchIndex + 1) % searchResults.length;
        setCurrentSearchIndex(nextIndex);
        
        const message = searchResults[nextIndex];
        setHighlightedMessageId(message._id);
        
        if (messageRefs.current[message._id]) {
          messageRefs.current[message._id].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }
  };

  // Reset search index when search term changes
  useEffect(() => {
    setCurrentSearchIndex(-1);
  }, [searchTerm]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Component hiển thị tin nhắn được reply
  const ReplyPreview = ({ message }) => {
    if (!message) return null;
    return (
      <div className="bg-gray-100 p-2 rounded-lg mb-2 flex items-start gap-2">
        <HiReply className="text-gray-500 mt-1" />
        <div className="flex-1 overflow-hidden">
          <p className="font-medium text-sm text-gray-700">
            {message.msgByUserId._id === user._id ? "Bạn" : dataUser.name}
          </p>
          <div className="text-sm text-gray-600 truncate">
            {message.text}
            {message.imageUrl && "(Hình ảnh)"}
            {message.videoUrl && "(Video)"}
            {message.fileUrl && "(File)"}
          </div>
        </div>
        <button 
          onClick={() => setReplyToMessage(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          <IoClose size={16} />
        </button>
      </div>
    );
  };

  const handleSendFriendRequest = async () => {
    try {
      setLoading(true);
      const URL = `${process.env.REACT_APP_BACKEND}/api/send-friend-request`;
      
      const response = await axios.post(URL, {
        currentUserId: user._id,
        targetUserId: dataUser._id
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        socketConnection.emit("send-friend-request", {
          targetUserId: dataUser._id,
          token: localStorage.getItem("token")
        });

        setFriendRequestStatus(prev => ({
          ...prev,
          hasPendingRequest: true
        }));
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequestResponse = async (action) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND}/api/handle-friend-request`, {
        currentUserId: user._id,
        requestId: friendRequestStatus.requestId,
        action
      });

      if (response.data.success) {
        // Emit socket event
        socketConnection.emit("friend-request-response", {
          requestId: friendRequestStatus.requestId,
          action
        });

        // Update local state
        setFriendRequestStatus(prev => ({
          ...prev,
          hasPendingRequest: false,
          isFriend: action === 'accept'
        }));

        // Hiển thị thông báo cho người nhận khi họ click nút
        if (friendRequestStatus.isReceiver) {
          toast.success(action === 'accept' ? 'Đã chấp nhận lời mời kết bạn' : 'Đã từ chối lời mời kết bạn');
        }
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi xử lý yêu cầu kết bạn");
    }
  };

  const handleUnfriend = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    if (window.confirm("Bạn có chắc chắn muốn hủy kết bạn không?")) {
      socketConnection.emit("unfriend", {
        targetUserId: dataUser._id
      });
      setShowOptions(false);
    }
  };

  // Xử lý click ra ngoài menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <HiSearch size={20} />
          </button>

          {!friendRequestStatus.isFriend && !friendRequestStatus.hasPendingRequest && (
            <button
              onClick={handleSendFriendRequest}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Kết bạn
            </button>
          )}

          {friendRequestStatus.hasPendingRequest && friendRequestStatus.isReceiver && (
            <div className="flex gap-2">
              <button
                onClick={() => handleFriendRequestResponse('accept')}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Chấp nhận
              </button>
              <button
                onClick={() => handleFriendRequestResponse('reject')}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Từ chối
              </button>
            </div>
          )}

          {friendRequestStatus.hasPendingRequest && !friendRequestStatus.isReceiver && (
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded-lg cursor-not-allowed"
              disabled
            >
              Đã gửi yêu cầu
            </button>
          )}

          <div className="relative" ref={optionsRef}>
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-full"
            >
              <HiDotsVertical size={20} />
            </button>
            
            {showOptions && (
              <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px] z-[60]">
                {friendRequestStatus.isFriend && (
                  <button
                    onMouseDown={handleUnfriend}
                    className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-100 flex items-center gap-2 transition-colors duration-200"
                  >
                    <MdPersonRemove size={20} />
                    <span>Hủy kết bạn</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main chat area */}
        <div className={`flex-1 ${isSearchExpanded ? 'w-2/3' : 'w-full'}`}>
          {/** show all message */}
          <section className="h-[calc(100vh-128px)] overflow-hidden overflow-y-scroll scrollbar relative z-0">
            {friendRequestStatus.isFriend ? (
              <div className="flex flex-col gap-2 py-2 mx-2" ref={currentMessage}>
                {allMessage.map((msg) => {
                  const isCurrentUser = msg.msgByUserId._id === user._id;
                  return (
                    <div
                      key={msg._id}
                      ref={el => messageRefs.current[msg._id] = el}
                      className={`bg-white p-1 py-2 rounded w-fit max-w-[280px] md:max-w-sm lg:max-w-md relative ${
                        isCurrentUser ? "ml-auto bg-teal-300" : ""
                      } ${highlightedMessageId === msg._id ? 'bg-yellow-100' : ''}`}
                    >
                      {/* Reply message display */}
                      {msg.replyToMessage && (
                        <div 
                          className="bg-gray-100 rounded p-2 mb-2 text-sm cursor-pointer hover:bg-gray-200"
                          onClick={() => {
                            if (messageRefs.current[msg.replyToMessage._id]) {
                              messageRefs.current[msg.replyToMessage._id].scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                              });
                              setHighlightedMessageId(msg.replyToMessage._id);
                              setTimeout(() => setHighlightedMessageId(null), 1000);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <HiReply className="text-gray-500" size={16} />
                            <p className="font-medium text-gray-700">
                              {msg.replyToMessage.msgByUserId._id === user._id ? "Bạn" : dataUser.name}
                            </p>
                          </div>
                          <div className="pl-6">
                            {msg.replyToMessage.text && (
                              <p className="text-gray-600 line-clamp-2">{msg.replyToMessage.text}</p>
                            )}
                            {msg.replyToMessage.imageUrl && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <FaImage size={12} />
                                <span>Hình ảnh</span>
                              </div>
                            )}
                            {msg.replyToMessage.videoUrl && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <FaVideo size={12} />
                                <span>Video</span>
                              </div>
                            )}
                            {msg.replyToMessage.fileUrl && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <FaFile size={12} />
                                <span>{msg.replyToMessage.fileName || 'File'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Message content */}
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
                          <div className="relative">
                            <button
                              onClick={() => setShowMessageMenu(showMessageMenu === msg._id ? null : msg._id)}
                              className="p-1 hover:bg-gray-100 rounded-full"
                            >
                              <HiDotsVertical size={16} />
                            </button>
                            {showMessageMenu === msg._id && (
                              <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-10">
                                <button
                                  onClick={() => handleReplyMessage(msg)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <HiReply />
                                  Trả lời
                                </button>
                                <ForwardMessageMenu
                                  onForward={handleForwardMessage}
                                  contacts={contacts}
                                  selectedMessage={msg}
                                  currentChatUserId={params.userId}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-center space-y-4">
                  <p className="text-gray-500">Các bạn chưa là bạn bè</p>
                  {!friendRequestStatus.isFriend && !friendRequestStatus.hasPendingRequest && (
                    <button 
                      onClick={handleSendFriendRequest}
                      className="bg-primary text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Đang xử lý..." : "Gửi lời mời kết bạn"}
                    </button>
                  )}
                  <p className="text-gray-500">Hãy kết bạn để bắt đầu trò chuyện</p>
                </div>
              </div>
            )}
          </section>

          {/**send message */}
          <section className="h-16 bg-white flex items-center px-4">
            {friendRequestStatus.isFriend && (
              <div className="h-full w-full flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={handleUploadImageVideoOpen}
                      className="flex justify-center items-center w-10 h-10 rounded-full hover:bg-gray-100"
                    >
                      <FaPlus size={20} className="text-gray-600" />
                    </button>
                    {/**video va image */}
                    {openImageVideoUpload && (
                      <div className="bg-white shadow-lg rounded-lg absolute bottom-12 w-40 py-2 z-10">
                        <form>
                          <label
                            htmlFor="uploadImage"
                            className="flex items-center px-4 py-2 gap-3 hover:bg-gray-100 cursor-pointer"
                          >
                            <FaImage className="text-blue-500" size={18} />
                            <p>Hình ảnh</p>
                          </label>
                          <label
                            htmlFor="uploadVideo"
                            className="flex items-center px-4 py-2 gap-3 hover:bg-gray-100 cursor-pointer"
                          >
                            <FaVideo className="text-purple-500" size={18} />
                            <p>Video</p>
                          </label>
                          <label
                            htmlFor="uploadFile"
                            className="flex items-center px-4 py-2 gap-3 hover:bg-gray-100 cursor-pointer"
                          >
                            <FaFile className="text-green-500" size={18} />
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

                  <div className="flex-1 flex items-center gap-3">
                    {/* Reply Preview */}
                    {replyToMessage && (
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg py-1 px-3 max-w-[200px]">
                        <HiReply className="text-gray-500 shrink-0" size={16} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs text-gray-700 truncate">
                            {replyToMessage.msgByUserId._id === user._id ? "Bạn" : dataUser.name}
                          </p>
                          <div className="text-xs text-gray-600 truncate">
                            {replyToMessage.text}
                            {replyToMessage.imageUrl && "(Hình ảnh)"}
                            {replyToMessage.videoUrl && "(Video)"}
                            {replyToMessage.fileUrl && "(File)"}
                          </div>
                        </div>
                        <button 
                          onClick={() => setReplyToMessage(null)}
                          className="text-gray-500 hover:text-gray-700 shrink-0"
                        >
                          <IoClose size={14} />
                        </button>
                      </div>
                    )}

                    <form className="flex-1 flex items-center gap-3" onSubmit={handleSendMessage}>
                      <input
                        type="text"
                        placeholder="Nhập tin nhắn..."
                        className="w-full py-2 px-4 rounded-full bg-gray-100 outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                        value={message.text}
                        onChange={handleOnchange}
                      />
                      <button 
                        type="submit"
                        className="text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <IoMdSend size={24} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Search panel */}
        {isSearchExpanded && (
          <div className="w-1/3 border-l border-gray-200 flex flex-col h-[calc(100vh-64px)] bg-gray-50">
            <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Tìm kiếm tin nhắn..."
                    className="w-full py-2 px-4 pr-10 rounded-full border border-gray-300 focus:outline-none focus:border-primary bg-gray-50"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500">
                    <HiSearch size={20} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchExpanded(false);
                    setSearchTerm("");
                    setShowSearchResults(false);
                    setHighlightedMessageId(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <IoClose size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {isSearching ? (
                <div className="flex justify-center items-center h-full">
                  <Loading />
                </div>
              ) : showSearchResults ? (
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-50 z-10 py-2">
                    <h3 className="font-semibold text-gray-700">
                      Kết quả tìm kiếm ({searchResults.length})
                    </h3>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="space-y-3">
                      {searchResults.map((msg, index) => (
                        <div
                          key={msg._id}
                          className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                            highlightedMessageId === msg._id ? 'bg-yellow-100' : ''
                          } ${currentSearchIndex === index ? 'bg-gray-50' : ''}`}
                          onClick={() => {
                            setCurrentSearchIndex(index);
                            setHighlightedMessageId(msg._id);
                            if (messageRefs.current[msg._id]) {
                              messageRefs.current[msg._id].scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                              });
                            }
                          }}
                        >
                          {msg.forwardFrom && (
                            <ForwardedMessage message={msg.forwardFrom} />
                          )}
                          <div className="w-full">
                            {msg?.imageUrl && (
                              <img
                                src={msg?.imageUrl}
                                alt="uploadImage"
                                className="w-full h-auto rounded max-h-40 object-contain"
                              />
                            )}
                          </div>
                          {msg?.videoUrl && (
                            <video
                              src={msg?.videoUrl}
                              alt="uploadVideo"
                              className="w-full h-auto rounded max-h-40 object-contain"
                              controls
                            />
                          )}
                          {msg?.fileUrl && (
                            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                              <FaFile className="text-blue-500" />
                              <a 
                                href={msg.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline truncate"
                              >
                                {msg.fileName || 'Tải file'}
                              </a>
                            </div>
                          )}

                          <p className="mt-2 text-sm text-gray-700">{msg.text}</p>
                          
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            <span className="font-medium">
                              {msg.msgByUserId._id === user._id ? "Bạn" : dataUser.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Không tìm thấy kết quả phù hợp
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
                  <HiSearch size={24} className="text-gray-400" />
                  <p>Nhập từ khóa để tìm kiếm tin nhắn</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessagePage;
