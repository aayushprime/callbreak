"use client";
import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";
import { twMerge } from "tailwind-merge";
import { Card as CardType } from "common";
import { Card } from "../ui/Card";
import { motion } from "framer-motion";

type ProfileProps = {
  size?: number;
  className?: string;
  active?: boolean;
  picture?: string;
  name?: string;
  bid?: number | null;
  tricksWon?: number;
  points?: number;
  showStats?: boolean;
  country?: string;
  // timer props (seconds)
  totalTime?: number;
  turnTime?: number;
  // visual timer customization
  timerStrokeWidth?: number; // px
  pulseIntervalMs?: number;
  strokeColor?: string;
  pulseColor?: string;
  pillPosition?: "top" | "bottom" | "left" | "right";
};

export const Profile = forwardRef<HTMLDivElement, ProfileProps>(
  (
    {
      name = "",
      country = "",
      picture = "https://www.gravatar.com/avatar/2?d=identicon",
      size = 56,
      className = "",
      active = false,
      bid = null,
      tricksWon = 0,
      points = 0,
      showStats = false,
      totalTime = 0,
      turnTime = 0,
      timerStrokeWidth = 15,
      pulseIntervalMs = 1600,
      strokeColor = "#0e60ed",
      pulseColor = "#3b82f6",
      pillPosition = "bottom",
    }: ProfileProps,
    ref
  ) => {
    const dim = `${size}px`;
    const circleR = 45; // matches inner svg
    const circumference = Math.round(Math.PI * 2 * circleR);
    const altText = name ? `${name}'s avatar` : "Player avatar";
    const texId = `tex-${(name || "player").replace(/\s+/g, "-")}`;

    const [internalTotalTime, setInternalTotalTime] =
      useState<number>(totalTime);
    const [timeLeft, setTimeLeft] = useState<number>(turnTime);
    const proportion =
      internalTotalTime > 0 ? Math.max(0, timeLeft) / internalTotalTime : 0;

    // update local timeLeft when turnTime prop changes (backwards-compat)
    useEffect(() => {
      setTimeLeft(turnTime);
      setInternalTotalTime(totalTime);
    }, [turnTime, totalTime]);

    // countdown effect (100ms resolution)
    // Only recreate the interval when the total time changes. The interval will
    // decrement the timeLeft state until zero. This avoids restarting the
    // interval on every tick.
    useEffect(() => {
      if (!internalTotalTime || timeLeft <= 0) return;
      const tick = 100; // ms
      const id = setInterval(() => {
        setTimeLeft((t) => {
          const next = +(t - tick / 1000).toFixed(3);
          if (next <= 0) {
            return 0;
          }
          return next;
        });
      }, tick);
      return () => clearInterval(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [internalTotalTime]);

    const getPillPositionClasses = () => {
      switch (pillPosition) {
        case "top":
          return "-top-10 left-1/2 -translate-x-1/2";
        case "left":
          return "-left-24 top-1/2 -translate-y-1/2";
        case "right":
          return "-right-24 top-1/2 -translate-y-1/2";
        case "bottom":
        default:
          return "-bottom-16 left-1/2 -translate-x-1/2";
      }
    };

    return (
      <div
        ref={ref}
        className={twMerge("relative flex flex-col items-center", className)}
        style={{ width: dim }}
      >
        <div
          className={twMerge(
            "relative rounded-full overflow-hidden shadow-md transition-all duration-300",
            active ? "pulse-border-sky" : "static-border-sky"
          )}
          style={{ width: dim, height: dim }}
        >
          <img
            src={picture}
            alt={altText}
            width={size}
            height={size}
            className="w-full h-full object-cover"
            draggable={false}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://www.gravatar.com/avatar/2?d=identicon";
            }}
          />

          {internalTotalTime > 0 && timeLeft > 0 && (
            <>
              <style>{`
                    @keyframes tex-rot { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
                    .tex-rotate { animation: tex-rot 1.6s linear infinite; transform-origin: 50% 50%; }
                    @keyframes pulse-${texId} { from { transform: scale(0.9); opacity: 0.7; } to { transform: scale(1.45); opacity: 0; } }
                    @keyframes dash-${texId} { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -${circumference}; } }
                  `}</style>
              <svg
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-0 w-full h-full"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(0,0,0,0.25)"
                  strokeWidth={String(timerStrokeWidth)}
                />

                <circle
                  cx="50"
                  cy="50"
                  r={String(circleR)}
                  fill={`url(#${texId})`}
                  stroke={strokeColor}
                  strokeWidth={String(timerStrokeWidth)}
                  strokeLinecap="round"
                  strokeDasharray={String(circumference)}
                  strokeDashoffset={String(circumference * (1 - proportion))}
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "50% 50%",
                  }}
                />
              </svg>
            </>
          )}
          {/* end inner svg */}
        </div>

        {/* outer pulse ring rendered outside the avatar container so it isn't clipped */}
        {internalTotalTime > 0 && timeLeft > 0 && (
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              // same rendered size as inner svg so circles overlap exactly
              width: dim,
              height: dim,
              pointerEvents: "none",
            }}
          >
            <circle
              cx="50"
              cy="50"
              r={String(circleR)}
              fill="none"
              stroke={pulseColor}
              strokeWidth={String(
                Math.max(2, Math.round(timerStrokeWidth / 1.5))
              )}
              strokeLinecap="round"
              strokeDasharray={`15 ${circumference - 15}`}
              style={{
                transformOrigin: "50% 50%",
                animation: `dash-${texId} ${Math.max(
                  400,
                  pulseIntervalMs
                )}ms linear infinite`,
                opacity: 0.95,
              }}
            />
          </svg>
        )}

        {/* Bid / Points badges (only show when requested) */}
        {showStats && (
          <div
            className={twMerge("absolute flex gap-2", getPillPositionClasses())}
          >
            <div className="bg-white/10 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
              <span className="text-[10px] opacity-80">B/W</span>
              <strong className="text-sm">
                {bid ?? "-"}/{tricksWon ?? 0}
              </strong>
            </div>
          </div>
        )}

        {name && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
            <span className="font-medium">{name}</span>
            {country && (
              <span
                className="ml-1"
                role="img"
                aria-label={`Flag of ${country}`}
              >
                {getFlagEmoji(country)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Profile.displayName = "Profile";

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
