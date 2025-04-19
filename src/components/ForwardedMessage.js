import React from 'react';
import moment from 'moment';

const ForwardedMessage = ({ message }) => {
  return (
    <div className="bg-gray-100 p-2 rounded-lg mb-2">
      <p className="text-xs text-gray-500 mb-1">Tin nhắn được chuyển tiếp</p>
      <div className="w-full">
        {message?.imageUrl && (
          <img
            src={message?.imageUrl}
            alt="Ảnh được chuyển tiếp"
            className="w-full h-full object-scale-down max-h-40"
          />
        )}
        {message?.videoUrl && (
          <video
            src={message?.videoUrl}
            controls
            className="w-full h-full object-scale-down max-h-40"
          />
        )}
        {message.text && (
          <p className="text-sm">{message.text}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {moment(message.createdAt).format('HH:mm')}
        </p>
      </div>
    </div>
  );
};

export default ForwardedMessage; 