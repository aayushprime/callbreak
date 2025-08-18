import React from "react";
import clsx from "clsx";

type ButtonProps = {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string; // <-- added
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onClick,
  disabled = false,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "bg-green-700 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:shadow-lg transition-all duration-200",
        "active:scale-95 active:bg-green-800 disabled:bg-gray-600 disabled:cursor-not-allowed",
        className
      )}
    >
      {title}
    </button>
  );
};
