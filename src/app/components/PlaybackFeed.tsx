import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { X } from "lucide-react";
import demoVideo from "../../assets/video.mp4";
import { generatePattern } from "./CameraFeed";
import { VideoSegment } from "../App";

interface PlaybackFeedProps {
  id: string;
  name: string;
  onRemove: (id: string) => void;
  onSelect?: (id: string) => void;
  isActive?: boolean;
  setGlobalPlaybackState: React.Dispatch<
    React.SetStateAction<{
      currentTime: number;
      speed: number;
      isPlaying: boolean;
      activeSegment: number;
    }>
  >;
  segements: VideoSegment[];
}

export interface PlaybackFeedHandle {
  play: () => void;
  pause: () => void;
  seekToGlobalTime: (globalTime: number) => void;
  setSpeed: (speed: number) => void;
}
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const PlaybackFeed = forwardRef<PlaybackFeedHandle, PlaybackFeedProps>(
  (
    {
      id,
      name,
      onRemove,
      onSelect,
      isActive = false,
      setGlobalPlaybackState,
      segements,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastPos = useRef({ x: 0, y: 0 });
    const videoContentRef = useRef<HTMLDivElement>(null);

    const [scaleZoom, setScaleZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    const [speed, setSpeed] = useState(1);
    const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
    const [segmentLocalTime, setSegmentLocalTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    /* ---------- expose API cho component cha ---------- */
    useImperativeHandle(
      ref,
      () => ({
        play() {
          if (!videoRef.current) return;
          videoRef.current.play();
          setIsPlaying(true);

          if (isActive) {
            const seg = segements[activeSegmentIndex];
            const globalTime = seg.start + segmentLocalTime;
            setGlobalPlaybackState((prev) => ({
              ...prev,
              isPlaying: true,
              currentTime: globalTime,
              activeSegment: activeSegmentIndex,
              speed,
            }));
          }
        },

        pause() {
          if (!videoRef.current) return;
          videoRef.current.pause();
          setIsPlaying(false);

          if (isActive) {
            setGlobalPlaybackState((prev) => ({
              ...prev,
              isPlaying: false,
            }));
          }
        },

        seekToGlobalTime(globalTime: number) {
          if (!videoRef.current || segements.length === 0) return;

          const segIndex = segements.findIndex(
            (s) => globalTime >= s.start && globalTime < s.end
          );
          if (segIndex === -1) return;

          const seg = segements[segIndex];
          const local = globalTime - seg.start;

          setActiveSegmentIndex(segIndex);
          setSegmentLocalTime(local);

          videoRef.current.src = seg.src ?? demoVideo; // hoặc seg.src
          videoRef.current.currentTime = local;

          if (isPlaying) {
            videoRef.current.play();
          }

          if (isActive) {
            setGlobalPlaybackState((prev) => ({
              ...prev,
              currentTime: globalTime,
              activeSegment: segIndex,
            }));
          }
        },

        setSpeed(newSpeed: number) {
          if (!videoRef.current) return;
          videoRef.current.playbackRate = newSpeed;
          setSpeed(newSpeed);

          if (isActive) {
            setGlobalPlaybackState((prev) => ({
              ...prev,
              speed: newSpeed,
            }));
          }
        },
      }),
      [
        segements,
        activeSegmentIndex,
        segmentLocalTime,
        isPlaying,
        speed,
        isActive,
      ]
    );

    // Update video playback state
    useEffect(() => {
      if (videoRef.current && isActive) {
        if (isPlaying) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    }, [isPlaying, isActive]);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      let nextScale = scaleZoom + (e.deltaY > 0 ? -0.1 : 0.1);
      nextScale = Math.min(Math.max(nextScale, 1), 5);

      if (nextScale === 1) {
        setOffset({ x: 0, y: 0 });
      }

      setScaleZoom(nextScale);
    };

    useEffect(() => {
      const div = videoContentRef.current;
      if (!div) return;

      div.addEventListener("wheel", handleWheel, { passive: false });

      return () => div.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (scaleZoom === 1) return;
      setIsPanning(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning || !videoContentRef.current) return;

      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;

      lastPos.current = { x: e.clientX, y: e.clientY };

      const container = videoContentRef.current.getBoundingClientRect();
      const videoW = container.width * scaleZoom;
      const videoH = container.height * scaleZoom;

      const maxX = (videoW - container.width) / 2;
      const maxY = (videoH - container.height) / 2;

      setOffset((prev) => ({
        x: clamp(prev.x + dx, -maxX, maxX),
        y: clamp(prev.y + dy, -maxY, maxY),
      }));
    };

    const handleMouseUp = () => setIsPanning(false);

    const handleClick = () => {
      if (onSelect) {
        onSelect(id);
        setGlobalPlaybackState({
          currentTime: segmentLocalTime,
          speed,
          activeSegment: activeSegmentIndex,
          isPlaying,
        });
      }
    };

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      video.ontimeupdate = () => {
        const localTime = video.currentTime;
        const segment = segements[activeSegmentIndex];
        if (!segment) return;
        const globalTime = segment.start + localTime;

        setSegmentLocalTime(localTime);

        // gửi lên App nếu camera đang active
        if (isActive) {
          setGlobalPlaybackState((prev) => ({
            ...prev,
            currentTime: globalTime,
            speed,
            activeSegment: activeSegmentIndex,
          }));
        }
        // nếu hết file video → chuyển sang segment tiếp theo
        if (localTime >= video.duration - 0.2) {
          goToNextSegment();
        }
      };
    }, [segements, activeSegmentIndex, isActive]);

    const goToNextSegment = () => {
      const next = activeSegmentIndex + 1;

      if (next >= segements.length) {
        console.log("Hết tất cả segment → dừng video");
        videoRef.current?.pause();
        return;
      }

      setActiveSegmentIndex(next);
      setSegmentLocalTime(0);

      // load lại video
      if (videoRef.current) {
        videoRef.current.src = segements[next].src;
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }

      // update global
      if (isActive) {
        setGlobalPlaybackState({
          currentTime: segements[next].start,
          speed,
          activeSegment: next,
          isPlaying,
        });
      }
    };

    return (
      <div
        className={`flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden relative transition-all duration-300 ${
          isActive
            ? "ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-900 shadow-2xl shadow-blue-500/50 scale-[1.02] z-10"
            : "shadow-xl"
        }`}
        ref={containerRef}
      >
        {/* Camera Header */}
        <div
          className={`camera-header z-10 flex items-center justify-between px-3 py-2 border-b transition-colors ${
            isActive
              ? "bg-blue-700/40 border-blue-400 shadow-inner"
              : "bg-slate-700 border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                isActive
                  ? "bg-blue-300 animate-pulse shadow-md shadow-blue-300/70"
                  : "bg-blue-400"
              }`}
            />
            <span
              className={`text-sm font-medium transition-colors ${
                isActive ? "text-blue-100 font-semibold" : "text-slate-100"
              }`}
            >
              {name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              onClick={() => onRemove(id)}
              title="Remove Camera"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Camera Content */}
        <div
          className="camera-content flex-1 relative bg-slate-800 cursor-pointer"
          ref={videoContentRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `
      scale(${scaleZoom})
      translate(${offset.x / scaleZoom}px, ${offset.y / scaleZoom}px)
    `,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.15s ease-out",
              cursor: scaleZoom > 1 ? "grab" : "default",
            }}
          >
            <div className="absolute inset-0">
              <img
                src={generatePattern()}
                alt={`Camera ${name}`}
                className="w-full h-full object-cover"
              />
            </div>
            <video
              ref={videoRef}
              autoPlay={false}
              src={demoVideo}
              playsInline
              muted
              controls={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "fill",
                zIndex: 2,
              }}
            />
          </div>

          {/* Active indicator */}
          {isActive && (
            <div className="absolute top-2 left-2 bg-blue-600 px-2 py-1 rounded text-xs text-white font-semibold shadow-lg z-20">
              Đang chọn
            </div>
          )}
        </div>
      </div>
    );
  }
);
