import React, { useEffect, useState } from "react";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import { FaUserPlus } from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import { FaUsers } from "react-icons/fa";
import Avatar from "./Avatar";
import { useDispatch, useSelector } from "react-redux";
import EditUserDetails from "./EditUserDetails";
import { logout } from "../redux/userSlice";
import { FiArrowUpLeft } from "react-icons/fi";
import { SearchUser } from "./SearchUser";
import { FaImage, FaVideo } from "react-icons/fa6";
import { GroupChat } from "./GroupChat";
import GroupAvatar from "./GroupAvatar";

export const Sidebar = () => {
  const user = useSelector((state) => state?.user);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [allUser, setAllUser] = useState([]);
  const [openSearchUser, setOpenSearchUser] = useState(false);
  const [openGroupChat, setOpenGroupChat] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [groups, setGroups] = useState([]);
  const socketConnection = useSelector(
    (state) => state?.user?.socketConnection
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (socketConnection) {
      socketConnection.emit("sidebar", user?._id);
      socketConnection.emit("get-user-groups");

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

          if (conversationUser?.sender?._id === conversationUser?.receiver?._id) {
            return {
              ...conversationUser,
              userDetails: conversationUser?.sender || {},
              isGroup: false,
              lastMessageTime: conversationUser?.lastMsg?.createdAt || new Date(0)
            };
          } else if (conversationUser?.receiver?._id !== user?._id) {
            return {
              ...conversationUser,
              userDetails: conversationUser?.receiver || {},
              isGroup: false,
              lastMessageTime: conversationUser?.lastMsg?.createdAt || new Date(0)
            };
          } else {
            return {
              ...conversationUser,
              userDetails: conversationUser?.sender || {},
              isGroup: false,
              lastMessageTime: conversationUser?.lastMsg?.createdAt || new Date(0)
            };
          }
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
      };
    }
  }, [socketConnection, user?._id, navigate]);

  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    localStorage.clear();
  };

  return (
    <div className="w-full h-full grid grid-cols-[48px,1fr] bg-white">
      <div className="bg-slate-100 w-12 h-full rounded-tr-lg rounded-br-lg py-5 text-slate-600 flex flex-col justify-between">
        <div>
          <NavLink
            className={({ isActive }) =>
              `w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 ${
                isActive && "bg-slate-200"
              }`
            }
            title="chat"
          >
            <IoChatbubbleEllipsesSharp size={20} />
          </NavLink>
          <div
            title="add friend"
            onClick={() => setOpenSearchUser(true)}
            className="w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200"
          >
            <FaUserPlus size={20} />
          </div>
          <div
            title="group chat"
            onClick={() => setOpenGroupChat(true)}
            className="w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200"
          >
            <FaUsers size={20} />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <button
            className="mx-auto"
            title={user?.name}
            onClick={() => setEditUserOpen(true)}
          >
            <Avatar
              imageUrl={user?.profile_pic}
              width={40}
              height={40}
              name={user?.name}
              userId={user?._id}
            />
            <div></div>
          </button>
          <button
            title="logout"
            className="w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200"
            onClick={handleLogout}
          >
            <span className="-ml-1">
              <BiLogOut size={20} />
            </span>
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="h-16 flex items-center">
          <h2 className="text-xl font-bold p-4 text-slate-800">message</h2>
        </div>
        <div className="bg-slate-200 p-[0.5px]"></div>
        <div className="h-[calc(100vh-65px)] overflow-x-hidden overflow-y-auto scrollbar">
          {allUser.length === 0 && (
            <div className="mt-12">
              <div className="flex justify-center items-center my-4 text-slate-500">
                <FiArrowUpLeft size={50} />
              </div>
              <p className="text-lg text-center text-slate-400">
                Explore user to start a conversation with.
              </p>
            </div>
          )}
          {allUser.filter(Boolean).map((conv, index) => {
            if (!conv?.userDetails) return null;
            
            return (
              <NavLink
                to={conv?.isGroup ? `/group/${conv?.userDetails?._id}` : `/${conv?.userDetails?._id}`}
                key={conv?._id || index}
                className="flex items-center gap-2 py-3 px-2 border border-transparent hover:border-slate-300 rounded hover:bg-slate-100"
              >
                <div>
                  {conv.isGroup ? (
                    <GroupAvatar 
                      members={conv.members || []} 
                      size={40} 
                    />
                  ) : (
                    <Avatar
                      imageUrl={conv?.userDetails?.profile_pic}
                      name={conv?.userDetails?.name}
                      width={40}
                      height={40}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-ellipsis line-clamp-1 font-semibold text-sm text-base">
                      {conv?.userDetails?.name || 'Unknown'}
                    </h3>
                  </div>
                  <div className="text-slate-500 text-xs flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {conv?.lastMsg?.imageUrl && (
                        <div className="flex items-center gap-2">
                          <span>
                            <FaImage />
                          </span>
                          {!conv?.lastMsg?.text && <span>Image</span>}
                        </div>
                      )}

                      {conv?.lastMsg?.videoUrl && (
                        <div className="flex items-center gap-2">
                          <span>
                            <FaVideo />
                          </span>
                          {!conv?.lastMsg?.text && <span>Video</span>}
                        </div>
                      )}
                    </div>
                    <p className="text-ellipsis line-clamp-1">
                      {conv?.lastMsg?.text}
                    </p>
                  </div>
                </div>
                {Boolean(conv?.unseenMsg) && (
                  <p className="text-xs w-6 h-6 flex justify-center items-center ml-auto p-1 bg-slate-400 text-white font-semibold rounded-full">
                    {conv?.unseenMsg}
                  </p>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/** edit user details */}
      {editUserOpen && (
        <EditUserDetails onClose={() => setEditUserOpen(false)} user={user} />
      )}
      {/**search user */}
      {openSearchUser && (
        <SearchUser onClose={() => setOpenSearchUser(false)} />
      )}
      {/**group chat */}
      {openGroupChat && (
        <GroupChat onClose={() => setOpenGroupChat(false)} />
      )}
    </div>
  );
};
