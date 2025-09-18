"use client";
import React, { useState } from "react";
import { Button } from "./Button";
import { Popup } from "./Popup";

interface MultiplayerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string, roomFee: number) => void;
  onCreateRoom: (roomFee: number) => void;
  status: string;
  availableRooms: { roomCode: string; roomFee: number; playerCount: number }[];
}

export function MultiplayerPopup({
  isOpen,
  onClose,
  onJoinRoom,
  onCreateRoom,
  status,
  availableRooms,
}: MultiplayerPopupProps) {
  const [activeTab, setActiveTab] = useState("join");
  const [roomCode, setRoomCode] = useState("");
  const [roomFee, setRoomFee] = useState(0.1);

  const handleJoin = () => {
    const room = availableRooms.find((r) => r.roomCode === roomCode);
    if (room) {
      onJoinRoom(roomCode, room.roomFee);
    }
  };

  const handleCreate = () => {
    onCreateRoom(roomFee);
  };

  return (
    <Popup isOpen={isOpen} title="Multiplayer">
      <div className="flex flex-col gap-4">
        <div className="flex border-b border-gray-500">
          <button
            className={`px-4 py-2 ${
              activeTab === "join"
                ? "border-b-2 border-green-400 text-white"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("join")}
          >
            Join
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === "create"
                ? "border-b-2 border-green-400 text-white"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("create")}
          >
            Create
          </button>
        </div>
        {activeTab === "join" ? (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="G-123456"
              className="w-full px-4 py-3 border border-gray-500 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              disabled={status === "connecting"}
            />
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <Button
                  onClick={handleJoin}
                  title="Connect"
                  disabled={status === "connecting"}
                  className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-6 py-2 transition"
                />
                <Button
                  onClick={onClose}
                  title="Cancel"
                  disabled={status === "connecting"}
                  className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold px-6 py-2 transition"
                />
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Available Rooms</h3>
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="py-2">Room Code</th>
                    <th className="py-2">Room Fee</th>
                    <th className="py-2">Players</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {availableRooms.map((room) => (
                    <tr key={room.roomCode}>
                      <td className="py-2">{room.roomCode}</td>
                      <td className="py-2">{room.roomFee}</td>
                      <td className="py-2">{room.playerCount}/4</td>
                      <td className="py-2">
                        <Button
                          onClick={() => onJoinRoom(room.roomCode, room.roomFee)}
                          title="Join"
                          disabled={status === "connecting"}
                          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-4 py-1 transition"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              type="number"
              placeholder="Room Fee"
              className="w-full px-4 py-3 border border-gray-500 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              value={roomFee}
              onChange={(e) => setRoomFee(Number(e.target.value))}
              disabled={status === "connecting"}
            />
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <Button
                  onClick={handleCreate}
                  title="Create"
                  disabled={status === "connecting"}
                  className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-6 py-2 transition"
                />
                <Button
                  onClick={onClose}
                  title="Cancel"
                  disabled={status === "connecting"}
                  className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold px-6 py-2 transition"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
}

