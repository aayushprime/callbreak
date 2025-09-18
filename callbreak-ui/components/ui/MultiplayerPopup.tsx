"use client";
import React, { useState } from "react";
import { Button } from "./Button";
import { Popup } from "./Popup";

interface MultiplayerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string, matchId: string, roomFee: number) => void;
  onCreateRoom: (roomFee: number) => void;
  status: string;
  availableRooms: {
    roomCode: string;
    matchId: string;
    roomFee: number;
    playerCount: number;
  }[];
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
      onJoinRoom(roomCode, room.matchId, room.roomFee);
    }
  };

  const handleCreate = () => {
    onCreateRoom(roomFee);
  };

  return (
    <Popup isOpen={isOpen} title="Online">
      <div className="flex flex-col gap-6 text-center">
        <h2 className="">Play and Win!</h2>

        <div className="">
          <p>
            Matchmaking with <span className="font-semibold">bots</span>{" "}
            available.
          </p>
          <p>
            Room fee:{" "}
            <span className="font-semibold text-purple-600">0.1 SOL</span>,
            rake: <span className="font-semibold text-red-600">10%</span> room
            fee.
          </p>
        </div>

        <div className="">More rooms and matchmaking coming soon!</div>

        <div className="flex gap-4 justify-center mt-4">
          <Button
            onClick={handleJoin}
            title={status === "connecting" ? "Connecting..." : "Join"}
            disabled={status === "connecting"}
            className="bg-green-500 hover:bg-green-600 active:bg-green-700 
                     text-white font-semibold px-6 py-2 rounded-xl shadow-md 
                     disabled:opacity-60 transition"
          />
          <Button
            onClick={onClose}
            title="Cancel"
            disabled={status === "connecting"}
            className="bg-red-500 hover:bg-red-600 active:bg-red-700 
                     text-white font-semibold px-6 py-2 rounded-xl shadow-md 
                     disabled:opacity-60 transition"
          />
        </div>
      </div>
    </Popup>
  );

  return (
    <Popup isOpen={isOpen} title="Online">
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
              <div className="max-h-72 overflow-y-auto overflow-x-hidden">
                <table className="w-full text-left table-fixed">
                  <thead>
                    <tr>
                      <th className="py-2 w-2/5">Room Code</th>
                      <th className="py-2 w-1/5">Fee</th>
                      <th className="py-2 w-1/5">Players</th>
                      <th className="py-2 w-1/5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableRooms.length > 0 ? (
                      availableRooms.map((room) => (
                        <tr key={room.roomCode}>
                          <td className="py-2 word-break: break-all">
                            {room.roomCode}
                          </td>
                          <td className="py-2">{room.roomFee}</td>
                          <td className="py-2">{room.playerCount}/4</td>
                          <td className="py-2">
                            <Button
                              onClick={() =>
                                onJoinRoom(
                                  room.roomCode,
                                  room.matchId,
                                  room.roomFee
                                )
                              }
                              title="Join"
                              disabled={status === "connecting"}
                              className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-4 py-1 transition"
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          No rooms available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
