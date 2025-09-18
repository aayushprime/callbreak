"use client";
import React from "react";
import { Popup } from "./Popup";

interface WaitingPopupProps {
  isOpen: boolean;
  message: string;
}

export function WaitingPopup({ isOpen, message }: WaitingPopupProps) {
  return (
    <Popup isOpen={isOpen}>
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-400"></div>
        <p className="text-white">{message}</p>
      </div>
    </Popup>
  );
}
