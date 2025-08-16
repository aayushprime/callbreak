import React, { ReactNode, useEffect, useState } from "react";
import clsx from "clsx";

type PopupProps = {
  isOpen: boolean;
  title?: string;
  children?: ReactNode;
};

export const Popup: React.FC<PopupProps> = ({ isOpen, title, children }) => {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div
        className={clsx(
          "bg-white rounded-2xl shadow-2xl p-6 w-96 flex flex-col gap-4 transform transition-all duration-300",
          {
            "animate-slide-in": isOpen && !isClosing,
            "animate-slide-out": isClosing,
          }
        )}
      >
        {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
        <div className="text-gray-700">{children}</div>
      </div>
    </div>
  );
};
