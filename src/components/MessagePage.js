import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link, useParams, useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { HiDotsVertical, HiSearch, HiReply } from "react-icons/hi";
import { FaAngleLeft, FaPlus, FaImage, FaVideo, FaFile, FaForward, FaUsers } from "react-icons/fa6";
import uploadFile from "../helpers/uploadFile";
import { IoClose, IoTrashOutline } from "react-icons/io5";
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
import { MdPersonRemove, MdDelete } from "react-icons/md";
import GroupAvatar from "./GroupAvatar";

function MessagePage() {
  const params = useParams();
  const navigate = useNavigate();
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
    isGroup: false,
    members: []
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
  const [selectedContacts, setSelectedContacts] = useState(new Set());

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

  const [showForwardModal, setShowForwardModal] = useState(false);

  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);

  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const [groupInfo, setGroupInfo] = useState(null);

  // Thêm state để theo dõi pending reactions
  const [pendingReactions, setPendingReactions] = useState({});

  const scrollToBottom = (behavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Handle auto scroll when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && allMessage.length > 0) {
      scrollToBottom('smooth');
    }
  }, [allMessage, shouldAutoScroll]);

  // Handle scroll events to determine if we should auto scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 100;
      setShouldAutoScroll(isNearBottom);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Scroll to bottom when first loading messages or changing chats
  useEffect(() => {
    scrollToBottom();
  }, [params.userId, params.groupId]);

  const debouncedSearch = useCallback((value) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        if (!conversationId && !params.groupId) {
          console.log("No conversationId or groupId available, cannot search");
          toast.error("Không thể tìm kiếm trong cuộc trò chuyện này");
          return;
        }
        
        console.log("Searching for:", value);
        setIsSearching(true);
        setShowSearchResults(false);
        
        socketConnection.emit("search-messages", {
          search: value,
          conversationId: params.groupId ? undefined : conversationId,
          groupId: params.groupId,
          currentUserId: user._id,
          isGroupChat: !!params.groupId
        });
      } else {
        setShowSearchResults(false);
        setIsSearching(false);
        setSearchResults([]);
      }
    }, 300);
  }, [conversationId, socketConnection, user._id, params.groupId]);

  useEffect(() => {
    if (currentMessage.current) {
      // Chỉ cuộn khi có tin nhắn mới, không cuộn khi cập nhật reaction
      const lastMessage = allMessage[allMessage.length - 1];
      if (lastMessage && lastMessage.msgByUserId._id === user._id && !lastMessage.isReactionUpdate) {
        currentMessage.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }
  }, [allMessage, user._id]);

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
        if (params.groupId) {
          // Nếu là chat nhóm
          socketConnection.emit("group-message", {
            groupId: params.groupId,
            text: "",
            sender: user._id,
            imageUrl: uploadPhoto.url,
            videoUrl: "",
            fileUrl: "",
            fileName: "",
            replyTo: replyToMessage?._id,
            msgByUserId: {
              _id: user._id,
              name: user.name,
              profile_pic: user.profile_pic
            }
          });
        } else {
          // Nếu là chat đơn
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

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      toast.error('Vui lòng chọn file video');
      return;
    }

    // Check file size (limit to 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File video quá lớn. Kích thước tối đa là 50MB');
      return;
    }

    setLoading(true);
    try {
      const uploadResult = await uploadFile(file);
      setLoading(false);
      setOpenImageVideoUpload(false);

      // Gửi video ngay lập tức
      if (socketConnection) {
        if (params.groupId) {
          // Nếu là chat nhóm
          socketConnection.emit("group-message", {
            groupId: params.groupId,
            text: "",
            sender: user._id,
            imageUrl: "",
            videoUrl: uploadResult.url,
            fileUrl: "",
            fileName: "",
            replyTo: replyToMessage?._id,
            msgByUserId: {
              _id: user._id,
              name: user.name,
              profile_pic: user.profile_pic
            }
          });
        } else {
          // Nếu là chat đơn
        socketConnection.emit("new massage", {
          sender: user?._id,
          receiver: params.userId,
          text: "",
          imageUrl: "",
          videoUrl: uploadResult.url,
          fileUrl: "",
          fileName: "",
          msgByUserId: user._id,
          replyTo: replyToMessage?._id
        });
        }
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
      toast.error('Không thể tải video lên');
    }
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

      // Gửi file ngay lập tức
      if (socketConnection) {
        if (params.groupId) {
          // Nếu là chat nhóm
          socketConnection.emit("group-message", {
            groupId: params.groupId,
            text: "",
            sender: user._id,
            imageUrl: "",
            videoUrl: "",
            fileUrl: uploadResult.url,
            fileName: file.name,
            replyTo: replyToMessage?._id,
            msgByUserId: {
              _id: user._id,
              name: user.name,
              profile_pic: user.profile_pic
            }
          });
        } else {
          // Nếu là chat đơn
        socketConnection.emit("new massage", {
          sender: user?._id,
          receiver: params.userId,
          text: "",
          imageUrl: "",
          videoUrl: "",
          fileUrl: uploadResult.url,
          fileName: file.name,
          msgByUserId: user._id,
          replyTo: replyToMessage?._id
        });
        }
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
      toast.error('Không thể tải file lên');
    }
  };

  const handleClearUploadImage = () => {
    setMassage((prev) => ({
      ...prev,
      imageUrl: "",
    }));
  };

  const hanldeClearUploadVideo = () => {
    setMassage((prev) => ({
      ...prev,
      videoUrl: "",
    }));
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
      const isGroupChat = params.groupId;
      
      // Reset dataUser and messages when switching chats
      setDataUser({
        name: "",
        phone: "",
        profile_pic: "",
        online: false,
        _id: "",
        isGroup: isGroupChat ? true : false,
        members: []
      });
      setAllMessage([]);

      if (isGroupChat) {
        console.log("Requesting group info for:", params.groupId);
        
        // Handle group chat
        socketConnection.emit("get-group-messages", params.groupId);
        socketConnection.emit("get-group-info", params.groupId);
        
        // Mark messages as seen when entering group chat
        socketConnection.emit("seen-group-message", {
          groupId: params.groupId,
          userId: user._id
        });
        
        // Listen for group messages
        const handleGroupMessages = (data) => {
          console.log("Received group messages:", {
            count: data?.length,
            messages: data?.map(msg => ({
              id: msg._id,
              text: msg.text,
              sender: msg.msgByUserId?.name
            }))
          });
          
        if (!Array.isArray(data)) {
            console.error("Invalid group messages data received:", data);
          return;
        }

          // Sort messages by createdAt
          const sortedMessages = [...data].sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );

          setAllMessage(sortedMessages);
        };

        // Listen for new group messages
        const handleNewGroupMessage = (data) => {
          try {
            // Debug log
            console.log("Group message received:", {
              data,
              currentGroupId: params.groupId,
              isSystemMessage: data?.isSystemMessage
            });

            // Validate data
            if (!data) {
              console.warn("Received empty group message data");
              return;
            }

            // Special handling for system messages (member join/leave)
            if (data.isSystemMessage) {
              console.log("Processing system message:", data);
              
              // Update messages first
              if (params.groupId) {
                setAllMessage(prevMessages => {
                  if (!Array.isArray(prevMessages)) return [data];
                  if (prevMessages.some(msg => msg._id === data._id)) return prevMessages;
                  return [...prevMessages, data].sort((a, b) => 
                    new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
                  );
                });

                // Then update group info
                setTimeout(() => {
                  socketConnection.emit("get-group-info", params.groupId);
                }, 100);

                // Scroll to bottom for new messages
                setTimeout(() => {
                  scrollToBottom('smooth');
                }, 200);
              }
              return;
            }

            // Handle regular messages
            if (!data.groupId && !params.groupId) {
              console.warn("Missing group ID for regular message");
              return;
            }

            const messageGroupId = String(data.groupId || '');
            const currentGroupId = String(params.groupId || '');

            if (!messageGroupId || !currentGroupId) {
              console.warn("Invalid group IDs:", { messageGroupId, currentGroupId });
              return;
            }

            // Only process if message is for current group
            if (messageGroupId === currentGroupId) {
              setAllMessage(prevMessages => {
                // Ensure we have valid messages array
                if (!Array.isArray(prevMessages)) {
                  return [data];
                }

                // Check for duplicates
                if (prevMessages.some(msg => msg._id === data._id)) {
                  return prevMessages;
                }

                const newMessages = [...prevMessages, data];
                
                // Sort messages safely
                return newMessages.sort((a, b) => {
                  const timeA = new Date(a.createdAt || 0).getTime();
                  const timeB = new Date(b.createdAt || 0).getTime();
                  return timeA - timeB;
                });
              });

              // Scroll to bottom for new messages
              setTimeout(() => {
                scrollToBottom('smooth');
              }, 100);
            }
          } catch (error) {
            console.error("Error handling group message:", error, {
              messageData: data,
              currentParams: params
            });
          }
        };

        // Listen for group info
        const handleGroupInfo = (data) => {
          console.log("Received group info:", data);
          if (data) {
            setDataUser({
              name: data.name,
              profile_pic: data.avatar,
              online: true,
              _id: data._id,
              isGroup: true,
              members: data.members || [],
              creator: data.creator
            });
          }
        };

        // Set up listeners
        socketConnection.on("group-messages", handleGroupMessages);
        socketConnection.on("group-message", handleNewGroupMessage);
        socketConnection.on("group-info", handleGroupInfo);

        // Cleanup listeners
        return () => {
          socketConnection.off("group-messages", handleGroupMessages);
          socketConnection.off("group-message", handleNewGroupMessage);
          socketConnection.off("group-info", handleGroupInfo);
        };
      } else {
        // Handle private chat
        socketConnection.emit("message-page", params.userId);
        socketConnection.emit("seen", params.userId);

        const handlePrivateMessage = (data) => {
          if (!Array.isArray(data)) {
            console.error("Invalid message data received:", data);
            return;
          }
          setAllMessage(data);
        };

        const handleUserInfo = (data) => {
          setDataUser({
            ...data,
            isGroup: false,
            members: []
          });
        };

        socketConnection.on("message", handlePrivateMessage);
        socketConnection.on("message-user", handleUserInfo);
        socketConnection.on("conversation-id", (data) => {
          console.log("Received conversation ID:", data);
          setConversationId(data.conversationId);
        });

        // Cleanup listeners
        return () => {
          socketConnection.off("message", handlePrivateMessage);
          socketConnection.off("message-user", handleUserInfo);
          socketConnection.off("conversation-id");
        };
      }

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
        // Cập nhật lại danh sách tin nhắn
        setAllMessage(prevMessages => 
          prevMessages.filter(msg => msg._id !== data.messageId)
        );
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
        console.log("Received search results:", data);
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

      // Handle new friend request
      socketConnection.on("new-friend-request", (data) => {
        console.log("New friend request received:", data);
        if (data.sender._id === params.userId) {
        setFriendRequestStatus(prev => ({
          ...prev,
          hasPendingRequest: true,
          requestId: data.requestId,
            isReceiver: true,
            sender: data.sender
        }));
          toast.success(`Bạn có lời mời kết bạn từ ${data.sender.name}`);
        }
      });

      // Handle friend request accepted
      socketConnection.on("friend-request-accepted", (data) => {
        console.log("Friend request accepted:", data);
        if (data.friend._id === params.userId) {
        setFriendRequestStatus(prev => ({
          ...prev,
          isFriend: true,
          hasPendingRequest: false,
          requestId: null
        }));
          setDataUser(prev => ({
            ...prev,
            isFriend: true
          }));
          toast.success(`Đã trở thành bạn bè với ${data.friend.name}`);
        }
      });

      // Handle friend request rejected
      socketConnection.on("friend-request-rejected", (data) => {
        console.log("Friend request rejected:", data);
        if (data.sender._id === params.userId) {
        setFriendRequestStatus(prev => ({
          ...prev,
          hasPendingRequest: false,
          requestId: null
        }));
          toast.info(`${data.sender.name} đã từ chối lời mời kết bạn`);
        }
      });

      // Handle unfriend
      socketConnection.on("unfriend-success", (data) => {
        console.log("Unfriend success:", data);
        if (data.targetUserId === params.userId) {
        setFriendRequestStatus(prev => ({
          ...prev,
          isFriend: false,
          hasPendingRequest: false,
          requestId: null
        }));
          setDataUser(prev => ({
            ...prev,
            isFriend: false
        }));
        toast.success("Đã hủy kết bạn");
        }
      });

      socketConnection.on("unfriend-received", (data) => {
        console.log("Unfriend received:", data);
        if (data.targetUserId === params.userId) {
        setFriendRequestStatus(prev => ({
          ...prev,
          isFriend: false,
          hasPendingRequest: false,
          requestId: null
        }));
          setDataUser(prev => ({
            ...prev,
            isFriend: false
          }));
          toast.info("Đã bị hủy kết bạn");
        }
      });

      // Thêm socket listener cho reaction
      socketConnection.on("reaction-updated", (data) => {
        setAllMessage(prevMessages => 
          prevMessages.map(msg => {
            if (msg._id === data.messageId) {
              return {
                ...msg,
                reactions: data.reactions,
                isReactionUpdate: true
              };
            }
            return msg;
          })
        );
      });

      // Thêm socket listener cho recall message
      socketConnection.on("recall-message-success", (data) => {
        // Cập nhật lại danh sách tin nhắn
        setAllMessage(prevMessages => 
          prevMessages.map(msg => {
            if (msg._id === data.messageId) {
              return {
                ...msg,
                isRecalled: true
              };
            }
            return msg;
          })
        );
        toast.success("Đã thu hồi tin nhắn");
        setShowMessageMenu(null); // Đóng menu sau khi thu hồi
      });

      socketConnection.on("recall-message-error", (data) => {
        toast.error(data.error);
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
        socketConnection.off("unfriend-success");
        socketConnection.off("unfriend-received");
        socketConnection.off("reaction-updated");
        socketConnection.off("recall-message-success");
        socketConnection.off("recall-message-error");
        socketConnection.off("react_to_message");
        socketConnection.off("react_to_group_message");
      };
    }
  }, [socketConnection, params.userId, params.groupId, user._id]);

  // Add effect to request messages when component mounts
  useEffect(() => {
    if (socketConnection && params.groupId) {
      console.log("Component mounted, requesting group messages...");
      socketConnection.emit("get-group-messages", params.groupId);
    }
  }, [socketConnection, params.groupId]);

  // Add debug log for allMessage changes
  useEffect(() => {
    console.log("allMessage updated:", allMessage);
  }, [allMessage]);

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
        const isGroupChat = params.groupId;
        
        if (isGroupChat) {
          const messageData = {
            groupId: params.groupId,
            text: message.text,
            sender: user._id,
            imageUrl: message.imageUrl,
            videoUrl: message.videoUrl,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            replyTo: replyToMessage?._id,
            msgByUserId: {
              _id: user._id,
              name: user.name,
              profile_pic: user.profile_pic
            }
          };

          // Emit the message
          socketConnection.emit("group-message", messageData);
        } else {
          // Send private message
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
        }

        // Clear the message input
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

  const handleForwardMessage = async (messageId, receiverIds) => {
    try {
      if (!messageId || !receiverIds || receiverIds.length === 0) {
        toast.error("Vui lòng chọn tin nhắn và người nhận");
        return;
      }

      const message = allMessage.find(msg => msg._id === messageId);
      if (!message) {
        toast.error("Không tìm thấy tin nhắn");
        return;
      }

      // Emit socket event for each receiver
      for (const receiverId of receiverIds) {
        socketConnection.emit("forward message", {
          messageId: messageId,
          sender: user._id,
          receiver: receiverId,
          currentChatUserId: params.userId
        });
      }

      toast.success("Đã chuyển tiếp tin nhắn");
      setShowForwardModal(false); // Close the modal after successful forwarding
      setSelectedContacts(new Set()); // Reset selected contacts
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast.error("Có lỗi xảy ra khi chuyển tiếp tin nhắn");
    }
  };

  // Thêm hàm để lấy danh sách bạn bè
  const [friendsList, setFriendsList] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [hasFetchedFriends, setHasFetchedFriends] = useState(false);

  const fetchFriendsList = async () => {
    if (hasFetchedFriends) return; // Prevent multiple fetches
    
    try {
      setIsLoadingFriends(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND}/api/get-friends`);
      if (response.data.success) {
        // Lọc bỏ người dùng hiện tại và người đang chat
        const filteredFriends = response.data.friends.filter(
          friend => friend._id !== user._id && 
          (!params.userId || friend._id !== params.userId) &&
          (!params.groupId || !friend.groups?.includes(params.groupId))
        );
        setFriendsList(filteredFriends);
        setHasFetchedFriends(true);
      }
    } catch (error) {
      console.error("Error fetching friends list:", error);
      // Không hiển thị toast error để tránh spam
    } finally {
      setIsLoadingFriends(false);
    }
  };

  // Thêm useEffect để lấy danh sách bạn bè khi component mount
  useEffect(() => {
    fetchFriendsList();
  }, [user._id, params.userId, params.groupId]);

  // Thêm modal chuyển tiếp tin nhắn
  const ForwardMessageModal = ({ messageId, onClose }) => {
    const [selectedFriends, setSelectedFriends] = useState([]);

    const handleFriendSelect = (friendId) => {
      setSelectedFriends(prev => {
        if (prev.includes(friendId)) {
          return prev.filter(id => id !== friendId);
        } else {
          return [...prev, friendId];
        }
      });
    };

    const handleForward = () => {
      if (selectedFriends.length === 0) {
        toast.error("Vui lòng chọn ít nhất một người nhận");
        return;
      }
      handleForwardMessage(messageId, selectedFriends);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4 w-96">
          <h2 className="text-xl font-semibold mb-4">Chuyển tiếp tin nhắn</h2>
          
          <div className="max-h-60 overflow-y-auto mb-4">
            {isLoadingFriends ? (
              <div className="text-center">Đang tải danh sách bạn bè...</div>
            ) : friendsList.length === 0 ? (
              <div className="text-center">Không có bạn bè nào để chuyển tiếp</div>
            ) : (
              friendsList.map(friend => (
                <div
                  key={friend._id}
                  className={`flex items-center p-2 cursor-pointer hover:bg-gray-100 rounded ${
                    selectedFriends.includes(friend._id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleFriendSelect(friend._id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFriends.includes(friend._id)}
                    onChange={() => handleFriendSelect(friend._id)}
                    className="mr-2"
                  />
                  <Avatar src={friend.profile_pic} />
                  <span className="ml-2">{friend.name}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Hủy
            </button>
            <button
              onClick={handleForward}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Chuyển tiếp
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Thêm useEffect để xử lý reaction
  useEffect(() => {
    if (!socketConnection) return;

    const handleReactionUpdate = (data) => {
      console.log("Received reaction update:", data);
      if (!data || !data.messageId) return;

      setAllMessage(prevMessages => 
        prevMessages.map(msg => {
          if (msg._id === data.messageId) {
            return {
              ...msg,
              reactions: data.reactions || []
            };
          }
          return msg;
        })
      );
    };

    // Lắng nghe các sự kiện reaction cho cả chat đơn và nhóm
    socketConnection.on("reaction-updated", handleReactionUpdate);
    socketConnection.on("group-reaction-updated", handleReactionUpdate);
    socketConnection.on("update-group-message", (data) => {
      console.log("Received updated group message:", data);
      setAllMessage(prevMessages => 
        prevMessages.map(msg => {
          if (msg._id === data._id) {
            return data;
          }
          return msg;
        })
      );
    });

    return () => {
      socketConnection.off("reaction-updated", handleReactionUpdate);
      socketConnection.off("group-reaction-updated", handleReactionUpdate);
      socketConnection.off("update-group-message");
    };
  }, [socketConnection]);

  const handleReaction = useCallback((messageId, emoji) => {
    if (!socketConnection || !user?._id) return;
    
    const isGroupChat = !!params.groupId;
    
    // Gửi reaction event
    socketConnection.emit("react_to_message", {
      messageId,
      emoji,
      userId: user._id,
      isGroupChat,
      groupId: params.groupId,
      conversationId: conversationId
    });

    // Cập nhật UI ngay lập tức cho người thực hiện
    setAllMessage(prevMessages => 
      prevMessages.map(msg => {
        if (msg._id === messageId) {
          const existingReactionIndex = msg.reactions?.findIndex(
            r => r.userId === user._id
          );

          let newReactions = [...(msg.reactions || [])];

          if (existingReactionIndex !== -1) {
            if (newReactions[existingReactionIndex].emoji === emoji) {
              // Xóa reaction nếu emoji giống nhau
              newReactions.splice(existingReactionIndex, 1);
            } else {
              // Cập nhật emoji mới
              newReactions[existingReactionIndex].emoji = emoji;
            }
          } else {
            // Thêm reaction mới
            newReactions.push({
              userId: user._id,
              emoji: emoji
            });
          }

          return {
            ...msg,
            reactions: newReactions
          };
        }
        return msg;
      })
    );
  }, [socketConnection, user?._id, params.groupId, conversationId]);

  // Xử lý reaction update từ server
  useEffect(() => {
    if (!socketConnection) return;

    const handleReactionUpdate = (data) => {
      if (!data || !data.messageId) return;

      setAllMessage(prevMessages => 
        prevMessages.map(msg => {
          if (msg._id === data.messageId) {
            return {
              ...msg,
              reactions: data.reactions || []
            };
          }
          return msg;
        })
      );
    };

    // Lắng nghe các sự kiện reaction cho cả chat đơn và nhóm
    socketConnection.on("reaction-updated", handleReactionUpdate);
    socketConnection.on("group-reaction-updated", handleReactionUpdate);
    socketConnection.on("update-group-message", (data) => {
      console.log("Received updated group message:", data);
      setAllMessage(prevMessages => 
        prevMessages.map(msg => {
          if (msg._id === data._id) {
            return data;
          }
          return msg;
        })
      );
    });

    return () => {
      socketConnection.off("reaction-updated", handleReactionUpdate);
      socketConnection.off("group-reaction-updated", handleReactionUpdate);
      socketConnection.off("update-group-message");
    };
  }, [socketConnection]);

  // Thêm useEffect để theo dõi thay đổi tin nhắn
  useEffect(() => {
    console.log("[Messages] Messages updated:", {
      count: allMessage.length,
      hasGroupId: !!params.groupId,
      groupId: params.groupId
    });
  }, [allMessage, params.groupId]);

  // Hàm hiển thị reaction cho tin nhắn
  const renderMessageReactions = (message) => {
    if (!message?.reactions || message.reactions.length === 0) return null;

    // Nhóm các reaction theo emoji
    const reactionGroups = message.reactions.reduce((groups, reaction) => {
      const emoji = reaction.emoji;
      if (!groups[emoji]) {
        groups[emoji] = [];
      }
      groups[emoji].push(reaction);
      return groups;
    }, {});
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(reactionGroups).map(([emoji, reactions]) => (
          <div 
            key={emoji} 
            className="bg-gray-100 px-2 py-1 rounded-full text-xs flex items-center gap-1 cursor-pointer hover:bg-gray-200"
            title={reactions.map(r => {
              const isCurrentUser = r.userId === user._id;
              return isCurrentUser ? "Bạn" : dataUser.members?.find(m => m._id === r.userId)?.name || "Người dùng";
            }).join(", ")}
          >
            <span>{emoji}</span>
            <span>{reactions.length}</span>
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

  useEffect(() => {
    if (!socketConnection) {
      return;
    }

    const handleSearchResult = (data) => {
      console.log('Received search results:', data);
      setIsSearching(false);
      
      if (!data) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      // Check if data is an array directly
      if (Array.isArray(data)) {
        console.log('Setting search results from array:', data);
        setSearchResults(data);
        setShowSearchResults(true);
        return;
      }

      // If data is an object with messages array
      if (data.success && Array.isArray(data.messages)) {
        console.log('Setting search results from data.messages:', data.messages);
        setSearchResults(data.messages);
        setShowSearchResults(true);
      } else if (data.data && Array.isArray(data.data)) {
        console.log('Setting search results from data.data:', data.data);
        setSearchResults(data.data);
        setShowSearchResults(true);
      } else {
        console.log('No valid search results found in data:', data);
        setSearchResults([]);
        setShowSearchResults(false);
        toast.error(data.message || 'Không tìm thấy kết quả phù hợp');
      }
    };

    const handleSearchError = (error) => {
      console.error('Search error:', error);
      setSearchResults([]);
      setIsSearching(false);
      setShowSearchResults(false);
      toast.error(error?.message || 'Có lỗi xảy ra khi tìm kiếm');
    };

    console.log('Setting up search listeners');
    socketConnection.on('search-messages-result', handleSearchResult);
    socketConnection.on('search-messages-error', handleSearchError);

    return () => {
      console.log('Cleaning up search listeners');
      if (socketConnection) {
        socketConnection.off('search-messages-result', handleSearchResult);
        socketConnection.off('search-messages-error', handleSearchError);
      }
    };
  }, [socketConnection]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (!socketConnection) {
      console.error('No socket connection available');
      toast.error('Không thể kết nối đến máy chủ');
      return;
    }
    
    if (value && value.trim()) {
      console.log('Initiating search with:', value);
    debouncedSearch(value);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
      setIsSearching(false);
    }
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
      // Update friend request status immediately
      setFriendRequestStatus(prev => ({
        ...prev,
        isFriend: false,
        hasPendingRequest: false,
        requestId: null
      }));
      // Update dataUser to reflect the change
      setDataUser(prev => ({
        ...prev,
        isFriend: false
      }));
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

  const handleDeleteMessage = (messageId, isOwnMessage) => {
    const confirmMessage = "Bạn có chắc chắn muốn xóa tin nhắn này chỉ ở phía bạn không?";
    
    if (window.confirm(confirmMessage)) {
      if (socketConnection) {
        socketConnection.emit("delete-message", {
          messageId,
          userId: user._id,
          conversationId: conversationId,
          isGroup: !!params.groupId,
          groupId: params.groupId,
          deleteForEveryone: false // Luôn xóa chỉ ở phía người dùng
        });

        // Xóa tin nhắn ngay lập tức ở phía người dùng
        setAllMessage(prevMessages => 
          prevMessages.filter(msg => msg._id !== messageId)
        );
        toast.success('Đã xóa tin nhắn');
      }
    }
  };

  const handleRecallMessage = (messageId) => {
    if (window.confirm("Bạn có chắc chắn muốn thu hồi tin nhắn này không?")) {
      if (socketConnection) {
        socketConnection.emit("recall-message", {
          messageId,
          userId: user._id,
          conversationId: conversationId,
          isGroup: !!params.groupId,
          groupId: params.groupId
        });
      }
    }
  };

  // Debug log for dataUser changes
  useEffect(() => {
    console.log("dataUser updated:", dataUser);
  }, [dataUser]);

  // Get friends list when component mounts
  useEffect(() => {
    if (socketConnection) {
      socketConnection.emit("get-friends");
      socketConnection.on("friends", (data) => {
        console.log("Received friends data:", data);
        setContacts(data);
      });

      return () => {
        socketConnection.off("friends");
      };
    }
  }, [socketConnection]);

  // Sửa lại hàm lấy danh sách thành viên
  const handleViewMembers = () => {
    setShowMembersModal(true);
    setShowOptions(false); // Close the options menu
  };

  const handleAddMembers = async (selectedMembers) => {
    if (!selectedMembers || selectedMembers.length === 0) {
      toast.error("Vui lòng chọn thành viên để thêm vào nhóm");
      return;
    }

    socketConnection.emit("add-members-to-group", {
      groupId: dataUser._id,
      newMembers: selectedMembers.map(member => member._id),
      addedBy: user._id,
      groupName: dataUser.name,
      currentMembers: dataUser.members.map(member => member._id)
    });

    // Đóng modal sau khi gửi yêu cầu
    setShowMembersModal(false);
  };

  // Lắng nghe kết quả thêm thành viên
  useEffect(() => {
    if (!socketConnection) return;

    socketConnection.on("add-members-success", (data) => {
      toast.success("Đã thêm thành viên vào nhóm thành công");
      setShowMembersModal(false);
    });

    socketConnection.on("add-members-error", (data) => {
      toast.error(data.message);
    });

    return () => {
      socketConnection.off("add-members-success");
      socketConnection.off("add-members-error");
    };
  }, [socketConnection]);

  // Sửa lại Modal hiển thị thành viên
  const MembersModal = () => {
    const [friends, setFriends] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Add kick member handler
    const handleKickMember = (memberId) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?")) {
        socketConnection.emit("kick-member", {
          groupId: dataUser._id,
          memberId: memberId,
          adminId: user._id
        });
      }
    };

    useEffect(() => {
      if (!socketConnection) return;

      socketConnection.on("kick-member-success", (data) => {
        toast.success("Đã xóa thành viên khỏi nhóm");
        // Update group info to reflect changes
        socketConnection.emit("get-group-info", params.groupId);
      });

      socketConnection.on("kick-member-error", (error) => {
        toast.error(error.message || "Không thể xóa thành viên khỏi nhóm");
      });

      return () => {
        socketConnection.off("kick-member-success");
        socketConnection.off("kick-member-error");
      };
    }, [socketConnection, params.groupId]);

    useEffect(() => {
      if (!socketConnection) return;

      socketConnection.emit("get-friends");

      socketConnection.on("friends", (data) => {
        // Lọc ra những người chưa là thành viên của nhóm
        const nonMembers = data.filter(friend => 
          !dataUser.members.some(member => member._id === friend._id)
        );
        setFriends(nonMembers);
      });

      return () => {
        socketConnection.off("friends");
      };
    }, [socketConnection]);

    const handleSelectMember = (friend) => {
      if (selectedMembers.some(member => member._id === friend._id)) {
        setSelectedMembers(selectedMembers.filter(member => member._id !== friend._id));
      } else {
        setSelectedMembers([...selectedMembers, friend]);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto relative">
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b">
            <h2 className="text-xl font-semibold">Thành viên nhóm</h2>
            <button
              onClick={() => setShowMembersModal(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              title="Đóng"
            >
              <span className="text-xl font-medium text-gray-500">&times;</span>
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-medium mb-2">Thành viên hiện tại:</h3>
            <div className="space-y-2">
              {dataUser.members.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <img
                      src={member.profile_pic}
                      alt={member.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name}</span>
                      {member._id === dataUser.creator._id && (
                        <span className="text-xs text-blue-600">(Người tạo nhóm)</span>
                      )}
                    </div>
                  </div>
                  {/* Show kick button only if current user is admin and target is not admin or self */}
                  {dataUser.creator._id === user._id && 
                   member._id !== user._id && 
                   member._id !== dataUser.creator._id && (
                    <button
                      onClick={() => handleKickMember(member._id)}
                      className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="Xóa khỏi nhóm"
                    >
                      <MdPersonRemove size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {dataUser.creator._id === user._id && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Thêm thành viên:</h3>
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend._id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                      onClick={() => handleSelectMember(friend)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.some(member => member._id === friend._id)}
                        onChange={() => {}}
                        className="w-4 h-4"
                      />
                      <img
                        src={friend.profile_pic}
                        alt={friend.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <span className="font-medium">{friend.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-end sticky bottom-0 bg-white pt-2 border-t">
                <button
                  onClick={() => handleAddMembers(selectedMembers)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  disabled={selectedMembers.length === 0}
                >
                  Thêm thành viên
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (socketConnection) {
      socketConnection.on("onlineUser", (users) => {
        setOnlineUsers(new Set(users));
      });

      return () => {
        socketConnection.off("onlineUser");
      };
    }
  }, [socketConnection]);

  // Thêm hàm xử lý xóa nhóm
  const handleDeleteGroup = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa nhóm này không?")) {
      socketConnection.emit("delete-group", {
        groupId: params.groupId,
        userId: user._id
      });
    }
    setShowOptions(false);
  };

  // Thêm socket listener cho delete group
  useEffect(() => {
    if (socketConnection) {
      // ... existing socket listeners ...

      socketConnection.on("group-deleted", (data) => {
        if (data.success) {
          toast.success("Nhóm đã được xóa thành công");
          // Emit event để cập nhật lại danh sách nhóm
          socketConnection.emit("get-user-groups");
          // Chuyển về trang chủ ngay lập tức
          setTimeout(() => {
            navigate("/");
          }, 0);
        } else {
          toast.error(data.message || "Có lỗi xảy ra khi xóa nhóm");
        }
      });

      return () => {
        // ... existing cleanup ...
        socketConnection.off("group-deleted");
      };
    }
  }, [socketConnection, navigate]);

  // Add new useEffect for handling scroll and marking messages as seen
  useEffect(() => {
    const handleScroll = () => {
      if (params.groupId) {
        socketConnection?.emit("seen-group-message", {
          groupId: params.groupId,
          userId: user._id
        });
      }
    };

    const messageContainer = document.querySelector('.scrollbar');
    if (messageContainer) {
      messageContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (messageContainer) {
        messageContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [params.groupId, socketConnection, user._id]);

  // Add new useEffect to handle auto-marking messages as seen
  useEffect(() => {
    if (!socketConnection || !params.groupId) return;

    const handleNewGroupMessage = (data) => {
      // Automatically mark messages as seen if the user is in the group chat
      if (data.groupId.toString() === params.groupId.toString()) {
        socketConnection.emit("seen-group-message", {
          groupId: params.groupId,
          userId: user._id
        });
      }
    };

    socketConnection.on("group-message", handleNewGroupMessage);

    return () => {
      socketConnection.off("group-message", handleNewGroupMessage);
    };
  }, [socketConnection, params.groupId, user._id]);

  // Add new useEffect for private chat seen status
  useEffect(() => {
    if (!socketConnection || !params.userId) return;

    const handleNewPrivateMessage = (data) => {
      // If the message is from the current chat partner and we're viewing the chat
      const messages = Array.isArray(data) ? data : [data];
      const hasNewMessage = messages.some(msg => 
        msg.msgByUserId?._id === params.userId && !msg.seen
      );

      if (hasNewMessage) {
        socketConnection.emit("seen", params.userId);
      }
    };

    socketConnection.on("message", handleNewPrivateMessage);

    return () => {
      socketConnection.off("message", handleNewPrivateMessage);
    };
  }, [socketConnection, params.userId, user._id]);

  // Update the leave group handler
  const handleLeaveGroup = () => {
    if (!socketConnection) return;
    
    if (window.confirm("Bạn có chắc chắn muốn rời nhóm này không?")) {
      socketConnection.emit("leave-group", {
        groupId: params.groupId,
        userId: user._id
      });
    }
  };

  // Thêm useEffect để xử lý các sự kiện socket
  useEffect(() => {
    if (!socketConnection) return;

    // Xử lý sự kiện rời nhóm thành công
    const handleLeaveGroupSuccess = (data) => {
      // Hiển thị tin nhắn hệ thống
      if (data.systemMessage) {
        setAllMessage(prev => {
          const isDuplicate = prev.some(msg => msg._id === data.systemMessage._id);
          if (isDuplicate) return prev;
          
          const newMessages = [...prev, data.systemMessage];
          return newMessages.sort((a, b) => 
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          );
        });
      }

      // Nếu là người rời nhóm, chuyển hướng về trang chủ
      if (data.userId === user._id) {
        // Đảm bảo chuyển hướng ngay lập tức
        setTimeout(() => {
          navigate("/");
        }, 0);
      }
    };

    // Xử lý sự kiện rời nhóm thất bại
    const handleLeaveGroupError = (data) => {
      alert(data.message);
    };

    // Xử lý sự kiện khi có thành viên rời nhóm
    const handleGroupMessage = (data) => {
      console.log("Received group message:", data);
      
      if (data.isSystemMessage && data.text.includes("đã rời khỏi nhóm")) {
        console.log("Processing system message about member leaving");
        
        // Cập nhật tin nhắn
        setAllMessage(prev => {
          const isDuplicate = prev.some(msg => msg._id === data._id);
          if (isDuplicate) return prev;
          
          const newMessages = [...prev, data];
          return newMessages.sort((a, b) => 
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          );
        });

        // Cập nhật thông tin nhóm
        socketConnection.emit("get-group-info", params.groupId);

        // Cuộn xuống tin nhắn mới nhất
        setTimeout(() => {
          scrollToBottom('smooth');
        }, 100);
      }
    };

    // Xử lý cập nhật thông tin nhóm
    const handleGroupInfo = (data) => {
      console.log("Received group info update:", data);
      if (data && data.members) {
        setGroupInfo(data);
      }
    };

    // Xử lý cập nhật danh sách nhóm
    const handleUserGroups = (groups) => {
      // Cập nhật danh sách nhóm trong sidebar
      socketConnection.emit("get-user-groups");
    };

    // Thêm các event listener
    socketConnection.on("leave-group-success", handleLeaveGroupSuccess);
    socketConnection.on("leave-group-error", handleLeaveGroupError);
    socketConnection.on("group-message", handleGroupMessage);
    socketConnection.on("group-info", handleGroupInfo);
    socketConnection.on("user-groups", handleUserGroups);

    // Cleanup function
    return () => {
      socketConnection.off("leave-group-success", handleLeaveGroupSuccess);
      socketConnection.off("leave-group-error", handleLeaveGroupError);
      socketConnection.off("group-message", handleGroupMessage);
      socketConnection.off("group-info", handleGroupInfo);
      socketConnection.off("user-groups", handleUserGroups);
    };
  }, [socketConnection, params.groupId, user._id, navigate]);

  // Thêm useEffect để xử lý cập nhật thông tin nhóm
  useEffect(() => {
    if (!socketConnection) return;

    const handleGroupInfo = (data) => {
      if (data && data.members) {
        setGroupInfo(data);
      }
    };

    socketConnection.on("group-info", handleGroupInfo);

    return () => {
      socketConnection.off("group-info", handleGroupInfo);
    };
  }, [socketConnection]);

  const handleNewGroupMessage = (data) => {
    console.log("Received new group message:", data);
    
    if (!data || !data.groupId) {
      console.error("Invalid message data received");
      return;
    }

    // Kiểm tra nếu là tin nhắn hệ thống về việc thêm thành viên
    if (data.isSystemMessage && data.text.includes("đã thêm")) {
      console.log("Processing system message about new members");
      
      // Cập nhật thông tin nhóm
      socketConnection.emit("get-group-info", data.groupId);
      
      // Cập nhật danh sách tin nhắn
      setAllMessage(prev => {
        // Kiểm tra xem tin nhắn đã tồn tại chưa
        const isDuplicate = prev.some(msg => msg._id === data._id);
        if (isDuplicate) return prev;
        
        // Thêm tin nhắn mới vào đầu danh sách
        const newMessages = [data, ...prev];
        
        // Sắp xếp lại theo thời gian
        return newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });

      // Cuộn xuống tin nhắn mới nhất
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 100);
    } else if (data.groupId === params.groupId) {
      // Xử lý tin nhắn thông thường
      setAllMessage(prev => {
        const isDuplicate = prev.some(msg => msg._id === data._id);
        if (isDuplicate) return prev;
        
        const newMessages = [data, ...prev];
        return newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });

      setTimeout(() => {
        scrollToBottom('smooth');
      }, 100);
    }
  };

  // Thêm useEffect để xử lý cập nhật thông tin nhóm
  useEffect(() => {
    if (socketConnection) {
      socketConnection.on("group-info", (data) => {
        console.log("Received updated group info:", data);
        if (data._id === currentMessage.current?.msgByUserId?._id) {
          setDataUser(prev => ({
            ...prev,
            members: data.members
          }));
        }
      });
    }

    return () => {
      if (socketConnection) {
        socketConnection.off("group-info");
      }
    };
  }, [socketConnection, currentMessage.current?.msgByUserId?._id]);

  // Add new useEffect for handling group member updates
  useEffect(() => {
    if (!socketConnection) return;

    const handleGroupMemberUpdate = (data) => {
      console.log("Group member update received:", data);
      
      if (data.groupId === params.groupId) {
        // Update group info
        socketConnection.emit("get-group-info", params.groupId);
        
        // If it's a system message about new members
        if (data.systemMessage) {
          setAllMessage(prevMessages => {
            const newMessages = Array.isArray(prevMessages) ? [...prevMessages] : [];
            if (!newMessages.some(msg => msg._id === data.systemMessage._id)) {
              newMessages.push(data.systemMessage);
              newMessages.sort((a, b) => 
                new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
              );
            }
            return newMessages;
          });

          // Scroll to bottom for new messages
          setTimeout(() => {
            scrollToBottom('smooth');
          }, 200);
        }
      }
    };

    socketConnection.on("group-member-update", handleGroupMemberUpdate);

    return () => {
      socketConnection.off("group-member-update", handleGroupMemberUpdate);
    };
  }, [socketConnection, params.groupId, scrollToBottom]);

  // Set up message listener
  useEffect(() => {
    if (!socketConnection) return;

    console.log("Setting up group message listener", {
      groupId: params.groupId,
      hasSocket: !!socketConnection
    });

    socketConnection.on("group-message", handleNewGroupMessage);
    
    return () => {
      socketConnection.off("group-message", handleNewGroupMessage);
    };
  }, [socketConnection, params.groupId]);

  // Add this new function to handle group updates
  const handleGroupMemberLeft = useCallback((data) => {
    console.log("Member left group:", data);
    
    // Update messages immediately with the system message
    if (data.systemMessage) {
      setAllMessage(prevMessages => {
        const newMessages = Array.isArray(prevMessages) ? [...prevMessages] : [];
        if (!newMessages.some(msg => msg._id === data.systemMessage._id)) {
          newMessages.push(data.systemMessage);
          newMessages.sort((a, b) => 
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          );
        }
        return newMessages;
      });
    }

    // Update group info
    if (data.groupId === params.groupId) {
      socketConnection.emit("get-group-info", params.groupId);
    }
  }, [params.groupId, socketConnection]);

  // Update the useEffect for socket listeners
  useEffect(() => {
    if (!socketConnection) return;

    // Handle group member left event
    socketConnection.on("group-member-left", handleGroupMemberLeft);

    // Handle group messages
    socketConnection.on("group-message", (data) => {
      try {
        console.log("Group message received:", {
          messageData: data,
          currentGroup: params.groupId
        });

        if (!data) return;

        // For system messages about member leaving
        if (data.isSystemMessage && data.type === 'member-left') {
          handleGroupMemberLeft({
            groupId: data.groupId,
            systemMessage: data
          });
          return;
        }

        // For other messages
        const messageGroupId = data.groupId?.toString() || '';
        const currentGroupId = params.groupId?.toString() || '';

        if (messageGroupId && currentGroupId && messageGroupId === currentGroupId) {
          setAllMessage(prevMessages => {
            const messages = Array.isArray(prevMessages) ? prevMessages : [];
            if (messages.some(msg => msg._id === data._id)) return messages;

            const newMessages = [...messages, data];
            return newMessages.sort((a, b) => 
              new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
          });

          // Scroll to bottom for new messages
          setTimeout(() => scrollToBottom('smooth'), 100);
        }
      } catch (error) {
        console.error("Error handling group message:", error);
      }
    });

    // Clean up listeners
    return () => {
      socketConnection.off("group-member-left", handleGroupMemberLeft);
      socketConnection.off("group-message");
    };
  }, [socketConnection, params.groupId, handleGroupMemberLeft, scrollToBottom]);

  const renderMessage = (message, index) => {
    // Check if it's a system message about member changes
    const isMemberChangeMessage = message.isSystemMessage && 
      (message.text?.includes("đã rời khỏi nhóm") || 
       message.text?.includes("đã thêm") || 
       message.text?.includes("vào nhóm"));

    // Nếu là tin nhắn thường
    return (
      <div
        key={message._id}
        ref={index === allMessage.length - 1 ? currentMessage : null}
        className={`flex ${
          message.msgByUserId?._id === user._id ? "justify-end" : "justify-start"
        } mb-4 relative group`}
        >
        {isMemberChangeMessage ? (
          <div className="flex justify-center w-full">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-600">
            {message.text}
            </div>
          </div>
        ) : message.isRecalled ? (
          <div className="italic text-gray-500 px-2">
            {message.msgByUserId?._id === user._id ? "Bạn đã thu hồi một tin nhắn" : "Tin nhắn đã được thu hồi"}
          </div>
        ) : (
          <>
            {message.msgByUserId?._id !== user._id && (
              <div className="flex-shrink-0 mr-2">
                <img
                  src={message.msgByUserId?.profile_pic}
                  alt={message.msgByUserId?.name}
                  className="w-8 h-8 rounded-full"
                />
              </div>
            )}
            <div className={`flex flex-col ${
              message.msgByUserId?._id === user._id ? "items-end" : "items-start"
            }`}>
              {/* Existing message content rendering */}
              <div className="relative group">
                {/* Message content */}
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.msgByUserId?._id === user._id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  } ${message.replyTo ? "mt-2" : ""}`}
                >
                  {message.replyTo && (
                    <ReplyPreview message={message.replyTo} />
                  )}
                  {/* Rest of your message content rendering */}
                  {message.text && <p>{message.text}</p>}
                  {message.imageUrl && (
                    <img
                      src={message.imageUrl}
                      alt="Sent"
                      className="max-w-xs rounded-lg mt-2"
                    />
                  )}
                  {message.videoUrl && (
                    <video
                      controls
                      className="max-w-xs rounded-lg mt-2"
                    >
                      <source src={message.videoUrl} type="video/mp4" />
                    </video>
                  )}
                  {message.fileUrl && (
                    <div className="flex items-center mt-2">
                      <i className="fas fa-file mr-2"></i>
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {message.fileName || "Tải xuống"}
                      </a>
                    </div>
                  )}
                </div>

                {/* Only show actions for non-system messages */}
                {!isMemberChangeMessage && !message.isRecalled && (
                  <div className="absolute right-0 top-0 hidden group-hover:flex items-center space-x-2 px-2">
                    <button
                      onClick={() => handleReplyMessage(message)}
                      className="text-gray-500 hover:text-blue-500"
                    >
                      <i className="fas fa-reply"></i>
                    </button>
                    {message.msgByUserId?._id === user._id && (
                      <>
                        <button
                          onClick={() => handleRecallMessage(message._id)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <i className="fas fa-undo"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message._id, true)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </>
                    )}
                    {message.msgByUserId?._id !== user._id && (
                      <button
                        onClick={() => handleDeleteMessage(message._id, false)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Message info (time, reactions, etc.) */}
              <div className={`flex items-center mt-1 text-xs text-gray-500 ${
                message.msgByUserId?._id === user._id ? "justify-end" : "justify-start"
              }`}>
                <span>{formatMessageTime(message.createdAt)}</span>
                {message.seen && message.msgByUserId?._id === user._id && (
                  <span className="ml-1 text-blue-500">
                    <i className="fas fa-check-double"></i>
          </span>
                )}
              </div>
            </div>
          </>
        )}
        </div>
      );
  };

  useEffect(() => {
    if (!socketConnection) {
      console.log("Socket connection not available");
      return;
    }

    console.log("Setting up socket listeners for friend requests");

    // Friend request related socket listeners
    const handleFriendRequestAccepted = (data) => {
      console.log("Friend request accepted event received:", data);
      if (data.friend._id === params.userId) {
        console.log("Updating friend request status for accepted request");
        setFriendRequestStatus(prev => ({
          ...prev,
          isFriend: true,
          hasPendingRequest: false,
          requestId: null
        }));
        setDataUser(prev => ({
          ...prev,
          isFriend: true
        }));
        toast.success(`Đã trở thành bạn bè với ${data.friend.name}`);
      }
    };

    const handleFriendRequestRejected = (data) => {
      console.log("Friend request rejected event received:", data);
      if (data.sender._id === params.userId) {
        console.log("Updating friend request status for rejected request");
        setFriendRequestStatus(prev => ({
          ...prev,
          hasPendingRequest: false,
          requestId: null
        }));
        toast.info(`${data.sender.name} đã từ chối lời mời kết bạn`);
      }
    };

    const handleUnfriendSuccess = (data) => {
      console.log("Unfriend success event received:", data);
      if (data.targetUserId === params.userId) {
        console.log("Updating friend request status for unfriend");
        setFriendRequestStatus(prev => ({
          ...prev,
          isFriend: false,
          hasPendingRequest: false,
          requestId: null
        }));
        setDataUser(prev => ({
          ...prev,
          isFriend: false
        }));
        toast.success("Đã hủy kết bạn");
      }
    };

    // Add socket listeners
    socketConnection.on("friend-request-accepted", handleFriendRequestAccepted);
    socketConnection.on("friend-request-rejected", handleFriendRequestRejected);
    socketConnection.on("unfriend-success", handleUnfriendSuccess);

    // Cleanup function
    return () => {
      console.log("Cleaning up socket listeners");
      socketConnection.off("friend-request-accepted", handleFriendRequestAccepted);
      socketConnection.off("friend-request-rejected", handleFriendRequestRejected);
      socketConnection.off("unfriend-success", handleUnfriendSuccess);
    };
  }, [socketConnection, params.userId]);

  useEffect(() => {
    if (socketConnection) {
      // Thêm socket listener cho sự kiện thêm thành viên thành công
      socketConnection.on("add-members-success", (data) => {
        console.log("Add members success:", data);
        
        // Cập nhật tin nhắn hệ thống
        if (data.systemMessage) {
          setAllMessage(prev => {
            const isDuplicate = prev.some(msg => msg._id === data.systemMessage._id);
            if (isDuplicate) return prev;
            
            const newMessages = [data.systemMessage, ...prev];
            return newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });

          // Cuộn xuống tin nhắn mới nhất
          setTimeout(() => {
            scrollToBottom('smooth');
          }, 100);
        }

        // Cập nhật thông tin nhóm
        if (data.groupId === params.groupId) {
          socketConnection.emit("get-group-info", params.groupId);
        }
      });

      // Thêm socket listener cho sự kiện cập nhật thông tin nhóm
      socketConnection.on("group-info", (data) => {
        console.log("Received updated group info:", data);
        if (data._id === params.groupId) {
          setDataUser(prev => ({
            ...prev,
            members: data.members
          }));
        }
      });

      // Thêm socket listener cho sự kiện tin nhắn nhóm
      socketConnection.on("group-message", (data) => {
        console.log("Received group message:", data);
        
        if (data.isSystemMessage && data.text.includes("đã thêm")) {
          console.log("Processing system message about new members");
          
          setAllMessage(prev => {
            const isDuplicate = prev.some(msg => msg._id === data._id);
            if (isDuplicate) return prev;
            
            const newMessages = [data, ...prev];
            return newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });

          // Cuộn xuống tin nhắn mới nhất
          setTimeout(() => {
            scrollToBottom('smooth');
          }, 100);
        }
      });

      return () => {
        socketConnection.off("add-members-success");
        socketConnection.off("group-info");
        socketConnection.off("group-message");
      };
    }
  }, [socketConnection, params.groupId]);

  return (
    <div className="flex flex-col h-full">
      <ToastContainer />
      <header className="sticky top-0 h-16 bg-white flex justify-between items-center px-4 z-50">
        <div className="flex items-center gap-4">
          <Link to={"/"} className="lg:hidden">
            <FaAngleLeft size={25} />
          </Link>
          <div>
            {dataUser?.isGroup ? (
              <GroupAvatar
                members={dataUser?.members || []}
                size={50}
              />
            ) : (
            <Avatar
              width={50}
              height={50}
              imageUrl={dataUser?.profile_pic}
              name={dataUser?.name}
              userId={dataUser?._id}
            />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg my-0">{dataUser?.name}</h3>
            <p className="-my-2 text-sm">
              {dataUser?.isGroup ? (
                <span className="text-gray-500">{dataUser?.members?.length || 0} thành viên</span>
              ) : dataUser?.online ? (
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

          {!params.groupId && !friendRequestStatus.isFriend && !friendRequestStatus.hasPendingRequest && (
            <button
              onClick={handleSendFriendRequest}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Kết bạn
            </button>
          )}

          {!params.groupId && friendRequestStatus.hasPendingRequest && friendRequestStatus.isReceiver && (
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

          {!params.groupId && friendRequestStatus.hasPendingRequest && !friendRequestStatus.isReceiver && (
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded-lg cursor-not-allowed"
              disabled
            >
              Đã gửi yêu cầu
            </button>
          )}

          <div className="relative z-[9999]" ref={optionsRef}>
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-full"
            >
              <HiDotsVertical size={20} />
            </button>
            
            {showOptions && (
              <div className="fixed right-4 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px] z-[9999]">
                {params.groupId && (
                  <>
                    <button
                      onClick={handleViewMembers}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors duration-200"
                    >
                      <FaUsers size={20} />
                      <span>Xem thành viên</span>
                    </button>
                    {/* Chỉ hiển thị nút xóa nhóm cho quản trị viên */}
                    {dataUser?.creator?._id === user._id ? (
                      <button
                        onClick={handleDeleteGroup}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-100 flex items-center gap-2 transition-colors duration-200"
                      >
                        <MdDelete size={20} />
                        <span>Xóa nhóm</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleLeaveGroup}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-100 flex items-center gap-2 transition-colors duration-200"
                      >
                        <MdPersonRemove size={20} />
                        <span>Rời nhóm</span>
                      </button>
                    )}
                  </>
                )}
                {!params.groupId && friendRequestStatus.isFriend && (
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

      <div className="flex flex-1">
        {/* Main chat area */}
        <div className={`flex-1 ${isSearchExpanded ? 'w-2/3' : 'w-full'} relative z-0`}>
          {/** show all message */}
          <section 
            ref={scrollContainerRef}
            className="h-[calc(100vh-128px)] overflow-y-scroll scrollbar"
          >
            {(params.groupId || friendRequestStatus.isFriend) ? (
              <div className="flex flex-col gap-2 py-2 mx-2">
                {allMessage.map((msg) => {
                  if (!msg || !msg.msgByUserId) {
                    console.warn("Invalid message object:", msg);
                    return null;
                  }

                  const isCurrentUser = msg.msgByUserId._id === user._id;
                  const isSystemMessage = msg.isSystemMessage && 
                    (msg.text?.includes("đã rời khỏi nhóm") || 
                     msg.text?.includes("đã thêm") || 
                     msg.text?.includes("vào nhóm"));

                  return (
                    <div
                      key={msg._id}
                      ref={el => messageRefs.current[msg._id] = el}
                      className={`p-1 py-2 rounded-lg w-fit max-w-[280px] md:max-w-sm lg:max-w-md relative ${
                        isCurrentUser ? "ml-auto bg-[#E5EFFF] text-[#1B1B1B]" : "bg-white"
                      } ${highlightedMessageId === msg._id ? 'bg-yellow-100' : ''}`}
                    >
                      {isSystemMessage ? (
                        <div className="italic text-gray-500 px-2 text-center w-full">
                          {msg.text}
                        </div>
                      ) : msg.isRecalled ? (
                        <div className="italic text-gray-500 px-2">
                          {isCurrentUser ? "Bạn đã thu hồi một tin nhắn" : "Tin nhắn đã được thu hồi"}
                        </div>
                      ) : (
                        <>
                          {/* Hiển thị tên người gửi trong nhóm */}
                          {params.groupId && !isCurrentUser && (
                            <div className="text-xs font-medium text-gray-600 mb-1 px-2">
                              {msg.msgByUserId.name}
                            </div>
                          )}

                          {/* Reply message display */}
                          {msg.replyTo && (
                            <div 
                              className="bg-gray-100 rounded p-2 mb-2 text-sm cursor-pointer hover:bg-gray-200"
                              onClick={() => {
                                if (messageRefs.current[msg.replyTo._id]) {
                                  messageRefs.current[msg.replyTo._id].scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center'
                                  });
                                  setHighlightedMessageId(msg.replyTo._id);
                                  setTimeout(() => setHighlightedMessageId(null), 1000);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <HiReply className="text-gray-500" size={16} />
                                <p className="font-medium text-gray-700">
                                  {msg.replyTo.msgByUserId._id === user._id ? "Bạn" : msg.replyTo.msgByUserId.name}
                                </p>
                              </div>
                              <div className="pl-6">
                                {msg.replyTo.text && (
                                  <p className="text-gray-600 line-clamp-2">{msg.replyTo.text}</p>
                                )}
                                {msg.replyTo.imageUrl && (
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <FaImage size={12} />
                                    <span>Hình ảnh</span>
                                  </div>
                                )}
                                {msg.replyTo.videoUrl && (
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <FaVideo size={12} />
                                    <span>Video</span>
                                  </div>
                                )}
                                {msg.replyTo.fileUrl && (
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <FaFile size={12} />
                                    <span>{msg.replyTo.fileName || 'File'}</span>
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
                                    {isCurrentUser && !msg.isRecalled && (
                                      <button
                                        onClick={() => handleRecallMessage(msg._id)}
                                        className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <IoTrashOutline size={16} />
                                        Thu hồi
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteMessage(msg._id, msg?.msgByUserId?._id === user._id)}
                                      className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <IoTrashOutline size={16} />
                                      Xóa tin nhắn
                                    </button>
                                    <button
                                      onClick={() => handleReplyMessage(msg)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <HiReply />
                                      Trả lời
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedMessage(msg);
                                        setShowForwardModal(true);
                                        setShowMessageMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <FaForward />
                                      Chuyển tiếp
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-center space-y-4">
                  {!params.groupId && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {/**send message */}
          <section className="h-16 bg-white flex items-center px-4">
            {(params.groupId || friendRequestStatus.isFriend) && (
              <div className="h-full w-full flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setOpenImageVideoUpload(!openImageVideoUpload)}
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
          <div className="w-1/3 border-l-2 border-gray-300 flex flex-col h-[calc(100vh-64px)] bg-gray-50 z-10">
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

      {/* Forward Message Modal */}
      {showForwardModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-lg w-96 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Chuyển tiếp tin nhắn</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <div
                    key={contact._id}
                    className={`flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer ${
                      selectedContacts.has(contact._id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedContacts(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(contact._id)) {
                          newSet.delete(contact._id);
                        } else {
                          newSet.add(contact._id);
                        }
                        return newSet;
                      });
                    }}
                  >
                    <Avatar
                      width={40}
                      height={40}
                      imageUrl={contact.profile_pic}
                      name={contact.name}
                      userId={contact._id}
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-gray-500">
                        {contact.online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    {selectedContacts.has(contact._id) && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                        ✓
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Không có người nhận khả dụng
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Đã chọn: {selectedContacts.size} người
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowForwardModal(false);
                    setSelectedContacts(new Set());
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleForwardMessage(selectedMessage._id, selectedContacts)}
                  disabled={selectedContacts.size === 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Chuyển tiếp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMembersModal && <MembersModal />}
    </div>
  );
}

export default MessagePage;