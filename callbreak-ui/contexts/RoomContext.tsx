"use client";
import { Room } from "@/lib/room";
import { createContext, useContext, useState } from "react";

type RoomContextType = {
  room: Room | undefined;
  setRoom: React.Dispatch<React.SetStateAction<Room | undefined>>;
};

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<Room | undefined>(undefined);
  return (
    <RoomContext.Provider value={{ room, setRoom }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within a RoomProvider");
  return ctx;
}
