import React from 'react';
import Avatar from './Avatar';

const GroupAvatar = ({ members, size = 40 }) => {
  // Lấy tối đa 4 thành viên để hiển thị avatar
  const displayMembers = members?.slice(0, 4) || [];
  const smallSize = size * 0.48; // Kích thước nhỏ hơn để vừa với container

  if (!displayMembers.length) {
    return (
      <div 
        className="bg-gray-200 rounded-full flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <span className="text-gray-500">?</span>
      </div>
    );
  }

  if (displayMembers.length === 1) {
    return (
      <Avatar
        imageUrl={displayMembers[0].profile_pic}
        name={displayMembers[0].name}
        width={size}
        height={size}
      />
    );
  }

  return (
    <div 
      className="relative rounded-full bg-white"
      style={{ width: size, height: size }}
    >
      {displayMembers.length === 2 && (
        <div className="w-full h-full grid grid-cols-2 gap-[2px]">
          <div className="overflow-hidden">
            <Avatar
              imageUrl={displayMembers[0].profile_pic}
              name={displayMembers[0].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
          <div className="overflow-hidden">
            <Avatar
              imageUrl={displayMembers[1].profile_pic}
              name={displayMembers[1].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
        </div>
      )}

      {displayMembers.length === 3 && (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px]">
          <div className="col-span-2 flex justify-center overflow-hidden">
            <Avatar
              imageUrl={displayMembers[0].profile_pic}
              name={displayMembers[0].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
          <div className="overflow-hidden">
            <Avatar
              imageUrl={displayMembers[1].profile_pic}
              name={displayMembers[1].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
          <div className="overflow-hidden">
            <Avatar
              imageUrl={displayMembers[2].profile_pic}
              name={displayMembers[2].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
        </div>
      )}

      {displayMembers.length >= 4 && (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px]">
          <div className="overflow-hidden">
            <Avatar
              imageUrl={displayMembers[0].profile_pic}
              name={displayMembers[0].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
          <div className="overflow-hidden">
            <Avatar
              imageUrl={displayMembers[1].profile_pic}
              name={displayMembers[1].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
          <div className="overflow-hidden">
            <Avatar
              imageUrl={displayMembers[2].profile_pic}
              name={displayMembers[2].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
          <div className="overflow-hidden">
            <Avatar
              imageUrl={displayMembers[3].profile_pic}
              name={displayMembers[3].name}
              width={smallSize}
              height={smallSize}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupAvatar; 