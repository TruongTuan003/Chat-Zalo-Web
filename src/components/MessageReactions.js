import React, { useState } from 'react';
import { AiOutlineHeart, AiFillHeart } from 'react-icons/ai';

const EMOJI_LIST = ['👍', '❤️', '😆', '😮', '😢', '😡'];

const MessageReactions = ({ message, onReact, currentUserId }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleReactionClick = (emoji) => {
    onReact(message._id, emoji);
    setShowReactionPicker(false);
  };

  // Nhóm reactions theo emoji
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.userId);
    return acc;
  }, {}) || {};

  // Kiểm tra xem người dùng hiện tại đã thả tim chưa
  const hasUserHeart = groupedReactions['❤️']?.includes(currentUserId);

  return (
    <div className="relative flex flex-col items-start gap-1">
      {/* Nút hiện emoji picker */}
      <button
        className={`group transition-all duration-200 p-1.5 rounded-full border 
          ${hasUserHeart 
            ? 'bg-red-100 border-red-300 hover:bg-red-200' 
            : 'bg-gray-100 border-gray-300 hover:bg-gray-200'}`}
        onClick={() => setShowReactionPicker(!showReactionPicker)}
      >
        {hasUserHeart ? (
          <AiFillHeart className="text-red-500 group-hover:scale-110 transition-transform" size={18} />
        ) : (
          <AiOutlineHeart className="text-gray-500 group-hover:text-red-500 group-hover:scale-110 transition-all" size={18} />
        )}
      </button>

      {/* Hiển thị reactions hiện tại */}
      {Object.keys(groupedReactions).length > 0 && (
        <div className="bg-white rounded-full shadow-md px-2 py-1 flex gap-1 ml-1">
          {Object.entries(groupedReactions).map(([emoji, users]) => (
            <div 
              key={emoji} 
              className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-1"
              title={`${users.length} người đã bày tỏ cảm xúc này`}
            >
              <span>{emoji}</span>
              <span className="ml-1 text-xs text-gray-500">{users.length}</span>
            </div>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showReactionPicker && (
        <>
          <div className="absolute top-8 left-0 bg-white rounded-lg shadow-lg p-2 z-50">
            <div className="flex gap-2">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${
                    groupedReactions[emoji]?.includes(currentUserId) ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handleReactionClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowReactionPicker(false)}
          />
        </>
      )}
    </div>
  );
};

export default MessageReactions; 