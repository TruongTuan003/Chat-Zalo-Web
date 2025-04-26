import React, { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import Avatar from "./Avatar";
import { FaSearch } from "react-icons/fa";
import toast from "react-hot-toast";
import { SearchUser } from "./SearchUser";
import GroupAvatar from "./GroupAvatar";

export const GroupChat = ({ onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUser, setAllUser] = useState([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'list'

  const user = useSelector((state) => state?.user);
  const socketConnection = useSelector((state) => state?.user?.socketConnection);

  useEffect(() => {
    if (!socketConnection || !user?._id) return;

    // Add connection error handler
    socketConnection.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      toast.error("Kết nối bị gián đoạn. Đang thử kết nối lại...");
    });

    // Add reconnection handler
    socketConnection.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
      toast.success("Đã kết nối lại thành công");
      // Fetch groups again after reconnection
      socketConnection.emit("get-user-groups");
    });

    // Hàm để lấy danh sách nhóm
    const fetchGroups = () => {
      console.log("Fetching groups...");
      socketConnection.emit("get-user-groups");
    };

    socketConnection.emit("get-friends");
    fetchGroups(); // Lấy danh sách nhóm khi component mount

    socketConnection.on("friends", (data) => {
      const filteredUsers = data.filter(friend => friend._id !== user._id);
      setAllUser(filteredUsers);
    });

    socketConnection.on("user-groups", (data) => {
      console.log("Received user groups:", data);
      if (Array.isArray(data)) {
        setGroups(data);
      } else {
        console.error("Invalid groups data received:", data);
        setGroups([]);
      }
    });

    socketConnection.on("new-group", (groupData) => {
      console.log("Received new group:", groupData);
      setGroups(prevGroups => {
        // Kiểm tra xem nhóm đã tồn tại chưa
        const existingGroup = prevGroups.find(g => g._id === groupData._id);
        if (existingGroup) {
          // Nếu nhóm đã tồn tại, cập nhật thông tin
          return prevGroups.map(g => 
            g._id === groupData._id ? groupData : g
          );
        }
        // Nếu là nhóm mới, thêm vào danh sách
        return [...prevGroups, groupData];
      });

      // Hiển thị thông báo cho người dùng
      toast.success(`Bạn đã được thêm vào nhóm ${groupData.name}`);
    });

    socketConnection.on("group-created", (response) => {
      if (response.success) {
        console.log("Tạo nhóm thành công:", {
          tênNhóm: response.group.name,
          ngườiTạo: response.group.creator.name,
          thànhViên: response.group.members.map(member => ({
            tên: member.name,
            trạngThái: member.online ? "Online" : "Offline"
          }))
        });

        // Cập nhật danh sách nhóm
        setGroups(prevGroups => {
          const newGroups = [...prevGroups];
          const existingGroupIndex = newGroups.findIndex(g => g._id === response.group._id);
          if (existingGroupIndex !== -1) {
            newGroups[existingGroupIndex] = response.group;
          } else {
            newGroups.push(response.group);
          }
          return newGroups;
        });

        // Reset form và chuyển tab
        setGroupName("");
        setSelectedUsers([]);
        setSelectedUserDetails([]);
        setActiveTab('list');
        toast.success("Tạo nhóm thành công");
      } else {
        toast.error(response.message || "Có lỗi xảy ra khi tạo nhóm");
      }
    });

    socketConnection.on("group-member-update", (data) => {
      console.log("Group member update received:", data);
      
      // Cập nhật thông tin nhóm trong danh sách
      setGroups(prevGroups => {
        return prevGroups.map(group => {
          if (group._id === data.groupId) {
            return {
              ...group,
              members: data.members,
              lastMessage: data.lastMessage
            };
          }
          return group;
        });
      });
    });

    socketConnection.on("error", (error) => {
      console.error("Socket error:", error);
      toast.error(error);
    });

    // Cleanup function
    return () => {
      socketConnection.off("connect_error");
      socketConnection.off("reconnect");
      socketConnection.off("friends");
      socketConnection.off("user-groups");
      socketConnection.off("new-group");
      socketConnection.off("group-created");
      socketConnection.off("group-member-update");
      socketConnection.off("error");
    };
  }, [socketConnection, user]);

  // Thêm useEffect để theo dõi thay đổi của groups
  useEffect(() => {
    console.log("Groups updated:", groups);
  }, [groups]);

  // Render phần danh sách nhóm
  const renderGroupList = () => {
    if (groups.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Bạn chưa tham gia nhóm nào
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {groups.map((group) => (
          <NavLink
            key={group._id}
            to={`/group/${group._id}`}
            className="block"
            onClick={onClose}
          >
            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border">
              <GroupAvatar
                members={group.members || []}
                size={40}
              />
              <div className="flex-1">
                <h3 className="font-medium">{group.name}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">
                    {group.members?.length || 0} thành viên
                  </p>
                  {group.creator?._id === user._id && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                      Người tạo
                    </span>
                  )}
                </div>
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    );
  };

  const handleCreateGroup = () => {
    if (!socketConnection) {
      toast.error("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }
    if (selectedUsers.length < 2) {
      toast.error("Vui lòng chọn ít nhất 2 thành viên");
      return;
    }

    // Validate that all selected users exist in allUser list
    const invalidUsers = selectedUsers.filter(userId => 
      !allUser.some(user => user._id === userId)
    );

    if (invalidUsers.length > 0) {
      toast.error("Có thành viên không hợp lệ. Vui lòng chọn lại.");
      return;
    }

    try {
      // Ensure we're sending valid user IDs
      const validMemberIds = selectedUsers.filter(userId => 
        typeof userId === 'string' && userId.length > 0
      );

      if (validMemberIds.length !== selectedUsers.length) {
        toast.error("Có lỗi với danh sách thành viên. Vui lòng thử lại.");
        return;
      }

      socketConnection.emit("create-group", {
        name: groupName,
        members: validMemberIds,
        creator: user._id
      });

      // Add timeout to handle potential connection issues
      const timeout = setTimeout(() => {
        toast.error("Không nhận được phản hồi từ máy chủ. Vui lòng thử lại.");
      }, 10000);

      // Clear timeout when we get a response
      socketConnection.once("group-created", () => {
        clearTimeout(timeout);
      });

      socketConnection.once("error", (error) => {
        clearTimeout(timeout);
        console.error("Error creating group:", error);
        if (error.includes("thành viên không tồn tại")) {
          toast.error("Có thành viên không tồn tại. Vui lòng chọn lại.");
        } else {
          toast.error("Có lỗi xảy ra khi tạo nhóm. Vui lòng thử lại.");
        }
      });
    } catch (error) {
      console.error("Error in handleCreateGroup:", error);
      toast.error("Có lỗi xảy ra khi tạo nhóm. Vui lòng thử lại.");
    }
  };

  const handleSelectUser = (selectedUser) => {
    if (selectedUsers.includes(selectedUser._id)) {
      setSelectedUsers(selectedUsers.filter(id => id !== selectedUser._id));
      setSelectedUserDetails(selectedUserDetails.filter(user => user._id !== selectedUser._id));
    } else {
      setSelectedUsers([...selectedUsers, selectedUser._id]);
      setSelectedUserDetails([...selectedUserDetails, selectedUser]);
    }
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
    setSelectedUserDetails(selectedUserDetails.filter(user => user._id !== userId));
  };

  const filteredUsers = allUser.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Nhóm chat</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <IoClose size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'create'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Tạo nhóm mới
          </button>
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'list'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('list')}
          >
            Danh sách nhóm
          </button>
        </div>

        {activeTab === 'create' ? (
          <div className="p-4">
            <div className="mb-4">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên nhóm..."
              />
            </div>

            {selectedUserDetails.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 border rounded-md p-2">
                {selectedUserDetails.map((user) => (
                  <div 
                    key={user._id}
                    className="flex items-center gap-1 bg-blue-100 rounded-full px-3 py-1"
                  >
                    <span className="text-sm">{user.name}</span>
                    <button
                      onClick={() => handleRemoveUser(user._id)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <IoClose size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tìm bạn bè..."
              />
            </div>

            <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className={`flex items-center justify-between p-2 hover:bg-gray-100 rounded-md cursor-pointer ${
                    selectedUsers.includes(user._id) ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      imageUrl={user.profile_pic}
                      name={user.name}
                      width={32}
                      height={32}
                    />
                    <span className="text-sm">{user.name}</span>
                  </div>
                  {selectedUsers.includes(user._id) && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Xem trước avatar nhóm
              </label>
              <div className="flex justify-center">
                <GroupAvatar members={selectedUsers} size={80} />
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-500">
                Đã chọn: {selectedUsers.length} thành viên
              </span>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length < 2}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {renderGroupList()}
          </div>
        )}
      </div>
    </div>
  );
};
