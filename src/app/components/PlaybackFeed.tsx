import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { generatePattern } from "./CameraFeed";
import { VideoSegment } from "../App";
import { MTX_HOST, MTX_PORT } from "../../services/streamService";

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

type ChangeSegmentInput =
  | number
  | {
      index: number;
    };

export interface PlaybackFeedHandle {
  play: () => void;
  pause: () => void;
  seekToGlobalTime: (globalTime: number) => void;
  setSpeed: (speed: number) => void;
  nextSegment: () => void;
  prevSegment: () => void;
}

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
    const videoContentRef = useRef<HTMLDivElement>(null);
    const [showZoomControls, setShowZoomControls] = useState(false);

    const [speed, setSpeed] = useState(1);
    const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
    const [segmentLocalTime, setSegmentLocalTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const findBestSegmentIndex = (timing: number) => {
      // 1. Ưu tiên segment chứa timing
      const exactIndex = segements.findIndex(
        (s) => timing >= s.start && timing <= s.end
      );

      if (exactIndex !== -1) return exactIndex;

      // 2. Nếu không có → tìm segment gần nhất
      let closestIndex = 0;
      let minDistance = Infinity;

      segements.forEach((s, i) => {
        const dist = Math.min(
          Math.abs(timing - s.start),
          Math.abs(timing - s.end)
        );

        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = i;
        }
      });

      return closestIndex;
    };

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
        seekToGlobalTime(timing: number) {
          const video = videoRef.current;
          if (!video || segements.length === 0) return;
          // 1️⃣ tìm segment phù hợp
          const targetIndex = findBestSegmentIndex(timing);
          const segment = segements[targetIndex];
          if (!segment) return;
          // 2️⃣ tính localTime trong video
          const localTime = Math.max(0, timing - segment.start);
          // 3️⃣ đổi segment nếu cần
          if (targetIndex !== activeSegmentIndex) {
            setActiveSegmentIndex(targetIndex);
            setSegmentLocalTime(localTime);
            // load video mới
            video.pause();
            video.src = segment.src;
            video.load();
            const onLoaded = () => {
              video.currentTime = localTime;
              if (isPlaying) {
                video.play().catch(() => {});
              }
              video.removeEventListener("loadedmetadata", onLoaded);
            };
            video.addEventListener("loadedmetadata", onLoaded);
          } else {
            // cùng segment → chỉ seek
            video.currentTime = localTime;
            setSegmentLocalTime(localTime);
          }
          // 4️⃣ update global nếu camera active
          if (isActive) {
            setIsPlaying(true);
            setGlobalPlaybackState((prev) => ({
              ...prev,
              currentTime: timing,
              activeSegment: targetIndex,
              speed,
              isPlaying: true,
            }));
          }
        },
        setSpeed() {},
        nextSegment() {
          if (isActive) changeSegment(1);
        },
        prevSegment() {
          if (isActive) changeSegment(-1);
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
        if (localTime >= video.duration - 0.5) {
          changeSegment(1);
        }
      };
    }, [segements, activeSegmentIndex, isActive]);

    const urlPlayback = useMemo(() => {
      if (segements.length === 0) return "";
      // return (
      //   `http://${MTX_HOST}:${MTX_PORT}` + segements[activeSegmentIndex]?.src ||
      //   ""
      // );
      return segements[activeSegmentIndex]?.src || "";
    }, [segements, activeSegmentIndex]);

    const changeSegment = (input: ChangeSegmentInput) => {
      const video = videoRef.current;
      if (!video) return;

      let targetIndex: number;

      if (typeof input === "number") {
        targetIndex = activeSegmentIndex + input;
      } else {
        targetIndex = input.index;
      }

      // ❌ boundary check
      if (targetIndex < 0) {
        video.currentTime = 0;
        return;
      }

      if (targetIndex >= segements.length) {
        video.pause();
        return;
      }

      const targetSegment = segements[targetIndex];

      // 1️⃣ pause video hiện tại
      video.pause();

      // 2️⃣ update local state
      setActiveSegmentIndex(targetIndex);
      setSegmentLocalTime(0);

      // 3️⃣ load video mới
      video.src = targetSegment.src;
      video.load();

      // 4️⃣ đợi metadata rồi play
      const onLoaded = () => {
        video.currentTime = 0;

        if (isPlaying) {
          video
            .play()
            .catch((err) => console.warn("Play interrupted (safe):", err));
        }

        video.removeEventListener("loadedmetadata", onLoaded);
      };

      video.addEventListener("loadedmetadata", onLoaded);

      // 5️⃣ update global state
      if (isActive) {
        setGlobalPlaybackState((prev) => ({
          ...prev,
          currentTime: targetSegment.start,
          activeSegment: targetIndex,
          isPlaying,
        }));
      }
    };

    const containerDivRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({
      width: 0,
      height: 0,
    });

    useEffect(() => {
      if (!containerDivRef.current) return;

      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      });

      observer.observe(containerDivRef.current);

      return () => observer.disconnect();
    }, []);

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
          className="camera-content flex-1 relative bg-slate-800"
          ref={videoContentRef}
          onMouseEnter={() => setShowZoomControls(true)}
          onMouseLeave={() => setShowZoomControls(false)}
        >
          <TransformWrapper
            initialScale={1}
            minScale={1}
            maxScale={5}
            limitToBounds={true}
            centerOnInit={true}
            wheel={{
              step: 0.1,
              wheelDisabled: false,
              touchPadDisabled: false,
              activationKeys: [],
            }}
            doubleClick={{
              disabled: false,
              mode: "zoomIn",
            }}
            panning={{
              disabled: false,
              velocityDisabled: false,
            }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="h-full absolute inset-0" ref={containerDivRef}>
                  <TransformComponent
                    wrapperClass="w-full h-full"
                    contentClass="w-full h-full flex items-center justify-center"
                  >
                    <div
                      className="relative w-full h-full flex items-center justify-center cursor-pointer"
                      onClick={handleClick}
                      style={{
                        width: containerSize.width,
                        height: containerSize.height,
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
                        src={urlPlayback}
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
                  </TransformComponent>
                </div>

                {/* Zoom Controls */}
                {showZoomControls && (
                  <div className="absolute top-2 right-2 z-20 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomIn();
                      }}
                      className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg shadow-lg transition-colors backdrop-blur-sm"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomOut();
                      }}
                      className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg shadow-lg transition-colors backdrop-blur-sm"
                      title="Thu nhỏ"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetTransform();
                      }}
                      className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg shadow-lg transition-colors backdrop-blur-sm"
                      title="Đặt lại"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-2 left-2 bg-blue-600 px-2 py-1 rounded text-xs text-white font-semibold shadow-lg z-20 pointer-events-none">
                    Đang chọn
                  </div>
                )}
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
    );
  }
);
