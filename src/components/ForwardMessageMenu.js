import React, { useState, useMemo } from 'react';
import { HiDotsVertical } from "react-icons/hi";
import { FaForward } from "react-icons/fa6";
import { MdDelete } from "react-icons/md";
import Avatar from './Avatar';
import { useSelector } from 'react-redux';

const ForwardMessageMenu = ({ 
  onForward, 
  contacts,
  selectedMessage,
  currentChatUserId 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showContactList, setShowContactList] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const socketConnection = useSelector((state) => state?.user?.socketConnection);
  const currentUserId = useSelector((state) => state?.user?._id);

  // Lọc danh sách contacts, loại bỏ người đang chat
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => contact._id !== currentChatUserId);
  }, [contacts, currentChatUserId]);

  const handleContactSelect = (contactId) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleForwardToMultiple = () => {
    if (selectedMessage && selectedContacts.size > 0) {
      selectedContacts.forEach(contactId => {
        onForward(selectedMessage._id, contactId);
      });
      setShowMenu(false);
      setShowContactList(false);
      setSelectedContacts(new Set());
    }
  };

  const handleDeleteMessage = () => {
    if (socketConnection && selectedMessage.msgByUserId === currentUserId) {
      socketConnection.emit("delete-message", {
        messageId: selectedMessage._id,
        senderId: currentUserId,
        receiverId: currentChatUserId
      });
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      <button 
        className="cursor-pointer p-1 hover:bg-gray-100 rounded-full"
        onClick={() => setShowMenu(!showMenu)}
      >
        <HiDotsVertical />
      </button>

      {showMenu && (
        <>
          <div 
            style={{ right: '-10px' }}
            className="absolute mt-2 w-48 bg-white rounded-md shadow-lg z-[999]"
          >
            <div className="py-1">
              <button
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                onClick={() => {
                  setShowMenu(false);
                  setShowContactList(true);
                }}
              >
                <FaForward className="mr-2" />
                Chuyển tiếp tin nhắn
              </button>
              {selectedMessage.msgByUserId === currentUserId && (
                <button
                  className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full"
                  onClick={handleDeleteMessage}
                >
                  <MdDelete className="mr-2" />
                  Xóa tin nhắn
                </button>
              )}
            </div>
          </div>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[998]" 
            onClick={() => setShowMenu(false)} 
          />
        </>
      )}

      {showContactList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[999] flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 w-96 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Chuyển tiếp đến</h3>
                <p className="text-sm text-gray-500">
                  Đã chọn: {selectedContacts.size} người nhận
                </p>
              </div>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowContactList(false);
                  setSelectedContacts(new Set());
                }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  className={`flex items-center p-2 hover:bg-gray-100 cursor-pointer ${
                    selectedContacts.has(contact._id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleContactSelect(contact._id)}
                >
                  <div className="flex-1 flex items-center">
                    <Avatar
                      width={40}
                      height={40}
                      imageUrl={contact.profile_pic}
                      name={contact.name}
                      userId={contact._id}
                    />
                    <div className="ml-3">
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-gray-500">
                        {contact.online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  {selectedContacts.has(contact._id) && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      ✓
                    </div>
                  )}
                </div>
              ))}
              {filteredContacts.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  Không có người nhận khả dụng
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end pt-3 border-t">
              <button
                className={`px-4 py-2 rounded-md ${
                  selectedContacts.size > 0
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleForwardToMultiple}
                disabled={selectedContacts.size === 0}
              >
                Chuyển tiếp ({selectedContacts.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForwardMessageMenu; 