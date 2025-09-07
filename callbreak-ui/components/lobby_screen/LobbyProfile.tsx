"use client";
import React from "react";
import { twMerge } from "tailwind-merge";

import Image from "next/image";

type LobbyProfileProps = {
  size: number;
  name: string;
  picture: string;
};

export function LobbyProfile({ size, name, picture }: LobbyProfileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src={picture}
        alt={name}
        width={size}
        height={size}
        className="rounded-full"
      />
      <div className="font-bold text-lg">{name}</div>
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
