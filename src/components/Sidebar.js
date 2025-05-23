import React, { useEffect, useState, useCallback } from "react";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import { FaUserFriends, FaUsers, FaCloud, FaCog } from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import { FaRegCheckSquare, FaBriefcase, FaUser, FaDatabase, FaGlobe, FaQuestionCircle, FaChevronRight } from "react-icons/fa";
import Avatar from "./Avatar";
import { useDispatch, useSelector } from "react-redux";
import EditUserDetails from "./EditUserDetails";
import { logout } from "../redux/userSlice";
import { FiArrowUpLeft } from "react-icons/fi";
import { SearchUser } from "./SearchUser";
import { FaImage, FaVideo } from "react-icons/fa6";
import { GroupChat } from "./GroupChat";
import GroupAvatar from "./GroupAvatar";
import { FaSearch, FaUserPlus, FaExternalLinkAlt } from "react-icons/fa";

export const Sidebar = React.memo(({ setEditUserOpen }) => {
  const user = useSelector((state) => state?.user);
  const [allUser, setAllUser] = useState([]);
  const [openSearchUser, setOpenSearchUser] = useState(false);
  const [openGroupChat, setOpenGroupChat] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [groups, setGroups] = useState([]);
  const socketConnection = useSelector(
    (state) => state?.user?.socketConnection
  );
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [sidebarView, setSidebarView] = useState('chat'); // 'chat' or 'contacts'
  const [friendsList, setFriendsList] = useState([]); // State to store friends list

  // Calculate number of unread conversations
  const unreadConversationCount = allUser.filter(chat => 
    chat && chat.unseenMsg !== undefined && chat.unseenMsg > 0
  ).length;

  // Helper function to remove accents
  const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[^\w\s]/g, '');
  };

  // Filtered list based on sidebar view
  const filteredUsers = allUser.filter(chat => {
    if (!chat.userDetails) return null;

    // Search filtering (client-side)
    const chatName = chat.userDetails.name;
    const normalizedChatName = removeAccents(chatName?.toLowerCase() || '');
    const normalizedSearchValue = removeAccents(searchValue.toLowerCase());

    if (searchValue && !normalizedChatName.includes(normalizedSearchValue)) {
      return null;
    }

    if (sidebarView === 'chat') {
      return true; // Show all in chat view
    } else if (sidebarView === 'contacts') {
      // In contacts view, only show users who are friends and not in a group chat
      return !chat.isGroup && chat.userDetails?.isFriend;
    }
    return false;
  });

  // Memoize the onClose function for SearchUser modal
  const handleCloseSearchUser = useCallback(() => {
    setOpenSearchUser(false);
  }, [setOpenSearchUser]);

  useEffect(() => {
    if (socketConnection) {
      socketConnection.emit("sidebar", user?._id);
      socketConnection.emit("get-user-groups");
      socketConnection.emit("get-friends"); // Emit to get friends list

      socketConnection.on("conversation", (data) => {
        setConversation(data);
      });

      socketConnection.on("user-groups", (data) => {
        setGroups(data);
      });

      // Listen for group deletion
      socketConnection.on("group-deleted", (data) => {
        if (data.success) {
          // Update groups list immediately
          socketConnection.emit("get-user-groups");
          // Nếu đang ở trong group bị xóa, chuyển về trang chủ
          const currentPath = window.location.pathname;
          if (currentPath.includes(`/group/${data.groupId}`)) {
            navigate("/");
          }
        }
      });

      socketConnection.on("conversation", (data) => {
        console.log("conversation", data);

        const conversationUserData = data.map((conversationUser) => {
          if (!conversationUser) return null;

          const chatPartnerDetails = 
            conversationUser?.sender?._id === conversationUser?.receiver?._id
              ? conversationUser?.sender
              : conversationUser?.receiver?._id !== user?._id
              ? conversationUser?.receiver
              : conversationUser?.sender;

          const isFriend = friendsList.includes(chatPartnerDetails?._id); // Check if the partner is in the friends list

          return {
            ...conversationUser,
            userDetails: {
              ...chatPartnerDetails,
              isFriend: isFriend // Add isFriend property
            },
            isGroup: false,
            lastMessageTime: conversationUser?.lastMsg?.createdAt || new Date(0)
          };
        }).filter(Boolean);

        setAllUser(prev => {
          const groups = prev.filter(chat => chat?.isGroup);
          const combined = [...groups, ...conversationUserData];
          return combined.sort((a, b) => new Date(b?.lastMessageTime || 0) - new Date(a?.lastMessageTime || 0));
        });
      });

      socketConnection.on("user-groups", (groups) => {
        console.log("groups", groups);
        const groupsWithMessages = groups.filter(group => group.lastMessage);
        
        const groupData = groupsWithMessages.map(group => ({
          _id: group._id,
          userDetails: {
            _id: group._id,
            name: group.name,
            profile_pic: group.avatar || "",
          },
          lastMsg: group.lastMessage,
          unseenMsg: group.unseenMessages?.find(
            um => um.userId.toString() === user._id.toString()
          )?.count || 0,
          isGroup: true,
          members: group.members,
          lastMessageTime: group.lastMessage?.createdAt || group.createdAt || new Date(0)
        }));

        setAllUser(prev => {
          const privateChats = prev.filter(chat => !chat.isGroup);
          const combined = [...privateChats, ...groupData];
          return combined.sort((a, b) => new Date(b?.lastMessageTime || 0) - new Date(a?.lastMessageTime || 0));
        });
      });

      // Thêm listener cho sự kiện thành viên mới vào nhóm
      socketConnection.on("group-member-update", (data) => {
        console.log("Group member update received in sidebar:", data);
        
        // Cập nhật thông tin nhóm trong danh sách
        setAllUser(prev => {
          return prev.map(chat => {
            if (chat.isGroup && chat._id === data.groupId) {
              return {
                ...chat,
                members: data.members,
                lastMsg: data.lastMessage,
                lastMessageTime: data.lastMessage?.createdAt || chat.lastMessageTime
              };
            }
            return chat;
          });
        });
      });

      // Thêm listener cho sự kiện tin nhắn hệ thống khi có thành viên mới
      socketConnection.on("group-message", (data) => {
        if (data.isSystemMessage && data.text.includes("đã thêm")) {
          console.log("System message about new member:", data);
          
          // Cập nhật thông tin nhóm trong danh sách
          setAllUser(prev => {
            return prev.map(chat => {
              if (chat.isGroup && chat._id === data.groupId) {
                return {
                  ...chat,
                  lastMsg: data,
                  lastMessageTime: data.createdAt
                };
              }
              return chat;
            });
          });
        }
      });

      // Thêm listener cho sự kiện danh sách bạn bè
      socketConnection.on("friends", (data) => { // Listener for friends list
        console.log("Received friends list:", data);
        setFriendsList(data.map(friend => friend._id)); // Store only friend IDs
      });

      // Thêm event handler cho seen-group-message
      const handleGroupMessageSeen = () => {
        const currentGroupId = window.location.pathname.split('/group/')[1];
        if (currentGroupId) {
          socketConnection.emit("seen-group-message", {
            groupId: currentGroupId,
            userId: user._id
          });
        }
      };

      // Gọi handleGroupMessageSeen khi vào group chat
      const pathname = window.location.pathname;
      if (pathname.startsWith('/group/')) {
        handleGroupMessageSeen();
      }

      return () => {
        socketConnection.off("conversation");
        socketConnection.off("user-groups");
        socketConnection.off("group-deleted");
        socketConnection.off("group-member-update");
        socketConnection.off("group-message");
        socketConnection.off("friends"); // Clean up friends listener
        socketConnection.off("friend-request-accepted"); // Clean up listener
      };
    }
  }, [socketConnection, user?._id, navigate]);

  useEffect(() => {
    if (!socketConnection || !user?._id) return;

    // Khi hủy kết bạn thành công
    socketConnection.on("unfriend-success", () => {
      socketConnection.emit("get-friends");
    });

    // Khi nhận được xác nhận kết bạn
    socketConnection.on("friend-request-accepted", () => {
      socketConnection.emit("get-friends");
    });

    // Khi nhận được danh sách bạn bè mới
    socketConnection.on("friends-list", (friends) => {
      setFriendsList(friends);
    });

    // Dọn dẹp listener khi component unmount
    return () => {
      socketConnection.off("unfriend-success");
      socketConnection.off("friend-request-accepted");
      socketConnection.off("friends-list");
    };
  }, [socketConnection, user?._id]);

  // Add effect to combine conversation and groups when they change, and re-process when friends list changes
  useEffect(() => {
    console.log("Combining conversations and groups...");
    console.log("Current conversation state:", conversation);
    console.log("Current groups state:", groups);
    console.log("Current friendsList state:", friendsList);

    const conversationUserData = conversation.map((conversationUser) => {
      if (!conversationUser) return null;

      const chatPartnerDetails =
        conversationUser?.sender?._id === user?._id
          ? conversationUser?.receiver
          : conversationUser?.sender;

      // Ensure chatPartnerDetails and its _id exist before checking friendsList
      const isFriend = chatPartnerDetails?._id && friendsList.includes(chatPartnerDetails._id);

      return {
        ...conversationUser,
        userDetails: {
          ...chatPartnerDetails,
          isFriend: isFriend
        },
        isGroup: false,
        lastMessageTime: conversationUser?.lastMsg?.createdAt || new Date(0)
      };
    }).filter(Boolean);

    const groupData = groups.filter(group => group.lastMessage).map(group => ({
      _id: group._id,
      userDetails: {
        _id: group._id,
        name: group.name,
        profile_pic: group.avatar || "",
      },
      lastMsg: group.lastMessage,
      unseenMsg: group.unseenMessages?.find(
        um => um.userId.toString() === user._id.toString()
      )?.count || 0,
      isGroup: true,
      members: group.members,
      lastMessageTime: group.lastMessage?.createdAt || group.createdAt || new Date(0)
    }));

    const combined = [...groupData, ...conversationUserData];
    setAllUser(combined.sort((a, b) => new Date(b?.lastMessageTime || 0) - new Date(a?.lastMessageTime || 0)));

  }, [conversation, groups, friendsList, user?._id]); // Depend on conversation, groups, and friendsList

  // Add socket listener for friend request accepted
  useEffect(() => {
    if (!socketConnection) return;

    const handleFriendRequestAccepted = (data) => {
      console.log("Friend request accepted in sidebar:", data);
      const acceptedFriend = data.friend; // Get the full friend object

      if (acceptedFriend?._id) {
        // Update the conversation state for this specific user
        setConversation(prevConversations => {
          return prevConversations.map(conv => {
            const chatPartnerId = 
              conv.sender?._id === user?._id ? conv.receiver?._id : conv.sender?._id;

            if (!conv.isGroup && chatPartnerId === acceptedFriend._id) {
              // Found the conversation with the newly accepted friend
              return {
                ...conv,
                userDetails: {
                  ...conv.userDetails,
                  isFriend: true // Update isFriend status
                }
              };
            }
            return conv;
          });
        });

        // Also refresh the overall friends list to be accurate
        socketConnection.emit("get-friends");
      }
    };

    socketConnection.on("friend-request-accepted", handleFriendRequestAccepted);

    return () => {
      socketConnection.off("friend-request-accepted", handleFriendRequestAccepted);
    };

  }, [socketConnection, user?._id]); // Depend on socketConnection and user._id

  // Add socket listener for unfriend success and received
  useEffect(() => {
    if (!socketConnection) return;

    const handleUnfriend = (data) => {
      console.log("Unfriend event received in sidebar:", data);
      const unfriendedUserId = data.targetUserId;

      if (unfriendedUserId) {
        setConversation(prevConversations => {
          return prevConversations.map(conv => {
            const chatPartnerId = 
              conv.sender?._id === user?._id ? conv.receiver?._id : conv.sender?._id;

            if (!conv.isGroup && chatPartnerId === unfriendedUserId) {
              return {
                ...conv,
                userDetails: {
                  ...conv.userDetails,
                  isFriend: false
                }
              };
            }
            return conv;
          });
        });

        // Refresh the overall friends list
        socketConnection.emit("get-friends");
      }
    };

    socketConnection.on("unfriend-success", handleUnfriend);
    socketConnection.on("unfriend-received", handleUnfriend);

    return () => {
      socketConnection.off("unfriend-success", handleUnfriend);
      socketConnection.off("unfriend-received", handleUnfriend);
    };

  }, [socketConnection, user?._id]); // Depend on socketConnection and user._id

  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    localStorage.clear();
  };

  return (
    <div className="w-full h-full flex flex-row bg-white">
      {/* Sidebar icon dọc kiểu Zalo */}
      <div className="bg-[#0068ff] w-[72px] h-full rounded-tr-lg rounded-br-lg py-4 flex flex-col justify-between items-center">
        {/* Avatar trên cùng */}
        <button
          className="mx-auto mb-6"
          title={user?.name}
          onClick={() => { setShowAvatarMenu(!showAvatarMenu); setEditUserOpen(false); }}
        >
          <Avatar
            imageUrl={user?.profile_pic}
            width={40}
            height={40}
            name={user?.name}
            userId={user?._id}
          />
        </button>
        {/* Icon chính */}
        <div className="flex flex-col gap-3 items-center mt-4 h-full">
          <NavLink
            className={({ isActive }) =>
              `w-12 h-12 flex items-center justify-center rounded-xl hover:bg-blue-700 transition-colors relative ${sidebarView === 'chat' ? "bg-blue-700" : ""}`
            }
            title="chat"
            to="/"
            onClick={() => setSidebarView('chat')}
          >
            <IoChatbubbleEllipsesSharp size={26} color="white" />
            {/* Badge showing number of unread conversations */}            
            {unreadConversationCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white text-xs rounded-full px-1.5">
                {unreadConversationCount}
              </span>
            )}
          </NavLink>
          {/* Contacts Icon */}
          <NavLink
            className={({ isActive }) =>
              `w-12 h-12 flex items-center justify-center rounded-xl hover:bg-blue-700 transition-colors ${sidebarView === 'contacts' ? "bg-blue-700" : ""}`
            }
            title="contacts"
            to="/"
            onClick={() => setSidebarView('contacts')}
          >
            <FaUserFriends size={26} color="white" />
          </NavLink>
          {/* Icons group 1 */}
          <div className="flex flex-col gap-3 items-center">
            <NavLink
              className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-blue-700 transition-colors"
              title="Checkmark"
              to="#"
            >
              <FaRegCheckSquare size={26} color="white" />
            </NavLink>
          </div>
          {/* Icons group 2 - spaced */}
          <div className="flex flex-col gap-3 items-center mt-auto">
            <button className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-blue-700 transition-colors"
              title="Cloud của tôi"
            >
              <FaCloud size={26} color="white" />
            </button>
            <button className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-blue-700 transition-colors"
              title="Công việc"
            >
              <FaBriefcase size={26} color="white" />
            </button>
            <button
              title="settings"
              className="w-12 h-12 flex justify-center items-center cursor-pointer rounded-xl hover:bg-blue-700 transition-colors duration-150"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            >
              <FaCog size={26} color="white" />
            </button>
          </div>
        </div>
        {/* Settings Menu */}
        {showSettingsMenu && (
          <div className="absolute bottom-20 left-[80px] bg-white p-2 rounded-md shadow-lg text-slate-800 z-10 w-60">
            {/* Thông tin tài khoản */}
            <div 
              className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-slate-100 rounded-md"
              onClick={() => { setEditUserOpen(true); setShowSettingsMenu(false); }}
            >
              <FaUser size={18} />
              <span>Thông tin tài khoản</span>
            </div>
            {/* Cài đặt */}
            <div className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-slate-100 rounded-md">
              <FaCog size={18} />
              <span>Cài đặt</span>
            </div>
            <hr className="my-2 border-slate-200" />
            {/* Dữ liệu */}
            <div className="flex items-center justify-between gap-2 py-2 px-3 cursor-pointer hover:bg-slate-100 rounded-md">
              <div className="flex items-center gap-2">
                <FaDatabase size={18} />
                <span>Dữ liệu</span>
              </div>
              <FaChevronRight size={14} className="text-slate-500"/>
            </div>
            {/* Ngôn ngữ */}
            <div className="flex items-center justify-between gap-2 py-2 px-3 cursor-pointer hover:bg-slate-100 rounded-md">
              <div className="flex items-center gap-2">
                <FaGlobe size={18} />
                <span>Ngôn ngữ</span>
              </div>
              <FaChevronRight size={14} className="text-slate-500"/>
            </div>
            {/* Hỗ trợ */}
            <div className="flex items-center justify-between gap-2 py-2 px-3 cursor-pointer hover:bg-slate-100 rounded-md">
              <div className="flex items-center gap-2">
                <FaQuestionCircle size={18} />
                <span>Hỗ trợ</span>
              </div>
              <FaChevronRight size={14} className="text-slate-500"/>
            </div>
            <hr className="my-2 border-slate-200" />
            {/* Đăng xuất */}
            <div
              className="py-2 px-3 cursor-pointer hover:bg-red-100 rounded-md text-red-600"
              onClick={handleLogout}
            >
              Đăng xuất
            </div>
          </div>
        )}
        {/* Avatar Menu */}
        {showAvatarMenu && (
          <div className="absolute top-10 left-[80px] bg-white p-4 rounded-md shadow-lg text-slate-800 z-10 w-60">
            {/* User Name */}
            <div className="text-xl font-bold mb-4 border-b border-slate-200 pb-2">
              {user?.name || 'User'}
            </div>
            {/* Menu Options */}
            <div className="flex flex-col gap-3">
              {/* Nâng cấp tài khoản */}
              <div className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100 px-3 py-2 rounded-md">
                <span>Nâng cấp tài khoản</span>
                <FaExternalLinkAlt size={14} className="text-slate-500"/>
              </div>
              {/* Hồ sơ của bạn */}
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 px-3 py-2 rounded-md"
                onClick={() => { setEditUserOpen(true); setShowAvatarMenu(false); }}
              >
                <span>Hồ sơ của bạn</span>
              </div>
              <hr className="my-1 border-slate-200" />
              {/* Cài đặt */}
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 px-3 py-2 rounded-md"
                onClick={() => { setShowSettingsMenu(true); setShowAvatarMenu(false); }}
              >
                <span>Cài đặt</span>
              </div>
              <hr className="my-1 border-slate-200" />
              {/* Đăng xuất */}
              <div
                className="py-2 px-3 cursor-pointer hover:bg-red-100 rounded-md text-red-600"
                onClick={() => { handleLogout(); setShowAvatarMenu(false); }}
              >
                Đăng xuất
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Sidebar chính */}
      <div className="w-[310px]">
        {/* Header with search and buttons */}
        <div className="h-16 flex items-center px-4 gap-2">
          {/* Search bar */}
          <div className="flex-1 flex items-center bg-[#f1f3f6] rounded-xl px-2 py-1 max-w-[180px]">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              className="bg-transparent outline-none w-full text-gray-600 placeholder-gray-400 text-sm px-1"
              placeholder="Tìm kiếm"
              value={searchValue}
              onChange={e => {
                setSearchValue(e.target.value);
              }}
              style={{ maxWidth: 80 }}
            />
          </div>
          {/* Add friend & Group Chat buttons */}
          <button
            title="add friend"
            onClick={() => setOpenSearchUser(true)}
            className="text-[#22334d] hover:text-[#0068ff] text-2xl p-2 rounded-full transition-colors"
          >
            <FaUserPlus />
          </button>
          <button
            title="group chat"
            onClick={() => setOpenGroupChat(true)}
            className="text-[#22334d] hover:text-[#0068ff] text-2xl p-2 rounded-full transition-colors"
          >
            <FaUsers />
          </button>
        </div>
        <div className="bg-slate-200 p-[0.5px]"></div>
        <div className="h-[calc(100vh-65px)] overflow-x-hidden overflow-y-auto scrollbar">
          {/* Filtered User/Group List */}
          {filteredUsers.length === 0 && (
            <div className="mt-12">
              <div className="flex justify-center items-center my-4 text-slate-500">
                {sidebarView === 'chat' ? (
                  <FiArrowUpLeft size={50} />
                ) : (
                  <FaUserFriends size={50} />
                )}
              </div>
              <p className="text-lg text-center text-slate-400">
                {searchValue 
                  ? "Không tìm thấy kết quả phù hợp"
                  : sidebarView === 'chat' 
                    ? "Explore user to start a conversation with."
                    : "No contacts found. Add some friends to start chatting!"}
              </p>
            </div>
          )}
          {filteredUsers.map((chat) => {
            if (!chat.userDetails) return null;

            return (
              <NavLink
                to={
                  chat.isGroup
                    ? `/group/${chat._id}`
                    : `/${chat.userDetails._id}`
                }
                key={chat._id || chat.userDetails._id}
                className="flex items-center gap-2 py-3 px-2 border border-transparent hover:border-slate-300 rounded hover:bg-slate-100 w-full max-w-full"
                style={{width: '100%', maxWidth: '100%'}}
                onClick={() => {
                  // Switch to chat view when clicking on a contact
                  if (sidebarView === 'contacts') {
                    setSidebarView('chat');
                  }
                }}
              >
                <div>
                  {chat.isGroup ? (
                    <GroupAvatar
                      members={chat.members || []}
                      size={40}
                    />
                  ) : (
                    <Avatar
                      imageUrl={chat.userDetails.profile_pic}
                      name={chat.userDetails.name}
                      width={40}
                      height={40}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-ellipsis line-clamp-1 font-semibold text-sm text-base">
                      {chat.userDetails.name || 'Unknown'}
                    </h3>
                  </div>
                  {sidebarView === 'chat' && (
                    <div className="text-slate-500 text-xs flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {chat.lastMsg?.imageUrl && (
                          <div className="flex items-center gap-2">
                            <span>
                              <FaImage />
                            </span>
                            {!chat.lastMsg?.text && <span>Image</span>}
                          </div>
                        )}

                        {chat.lastMsg?.videoUrl && (
                          <div className="flex items-center gap-2">
                            <span>
                              <FaVideo />
                            </span>
                            {!chat.lastMsg?.text && <span>Video</span>}
                          </div>
                        )}
                      </div>
                      <p className="text-ellipsis line-clamp-1">
                        {chat.lastMsg?.text}
                      </p>
                    </div>
                  )}
                </div>
                {sidebarView === 'chat' && Boolean(chat.unseenMsg) && (
                  <p className="text-xs w-6 h-6 flex justify-center items-center ml-auto p-1 bg-slate-400 text-white font-semibold rounded-full">
                    {chat.unseenMsg}
                  </p>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/** edit user details */}
      {openSearchUser && (
        <SearchUser onClose={handleCloseSearchUser} navigate={navigate} />
      )}
      {/**group chat */}
      {openGroupChat && (
        <GroupChat onClose={() => setOpenGroupChat(false)} />
      )}
    </div>
  );
});
