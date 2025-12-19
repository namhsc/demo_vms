import React, { useState, useEffect, useRef } from "react";
import { Settings, X, Play, Pause, Maximize, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  createStream,
  MTX_HOST,
  MTX_PORT,
  VIEWER_PASS,
  VIEWER_USER,
} from "../../services/streamService";
import { Camera } from "../App";
import { toast } from "sonner";

interface CameraFeedProps {
  id: string;
  name: string;
  onRemove: (id: string) => void;
  onHide?: (id: string) => void;
  url?: string;
  setCameras: React.Dispatch<React.SetStateAction<Camera[]>>;
  cameras: Camera[];
}

// Generate a random pattern for mock video feed
export const generatePattern = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Create gradient background
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#1e293b");
    gradient.addColorStop(1, "#334155");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add grid pattern
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    return canvas.toDataURL();
  }
  return "";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function LiveviewFeed({
  id,
  name,
  onRemove,
  onHide,
  url: initialUrl,
  setCameras,
  cameras,
}: CameraFeedProps) {
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [rtspUrl, setRtspUrl] = useState(initialUrl || "");
  const [rtspUrlInput, setRtspUrlInput] = useState(initialUrl || "");
  const [currentUrl, setCurrentUrl] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const videoContentRef = useRef<HTMLDivElement>(null);
  const [scaleZoom, setScaleZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (document.fullscreenElement) {
        setShowControls(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, []);

  const toggleFullscreen = () => {
    const element = containerRef.current;

    if (!element) return;

    // Nếu chưa fullscreen → mở
    if (!document.fullscreenElement) {
      element.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      // Nếu đang fullscreen → thoát
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const videoRef = useRef(null);

  // Update URL when initialUrl changes
  useEffect(() => {
    if (initialUrl) {
      setRtspUrl(initialUrl);
    }
  }, [initialUrl]);

  useEffect(() => {
    if (!rtspUrl || rtspUrl.trim() === "") {
      return;
    }
    let retryTimer: number | null = null;

    const MAX_RETRY = 3;
    let attempt = 0;

    const rtspMatch = rtspUrl.match(/rtsp:\/\/([^\/]+)(\/.*)?/);

    if (!rtspMatch) {
      toast.warning("Invalid RTSP URL format");
      return;
    }
    setIsSettingsOpen(false);

    const updatedCameras = cameras.map((item) => {
      if (item.i === id) {
        return { ...item, url: rtspUrl };
      } else {
        return { ...item };
      }
    });
    setCameras(updatedCameras);

    localStorage.setItem("cameraLayout", JSON.stringify(updatedCameras));

    const fetchStream = async () => {
      try {
        attempt++;
        const data = await createStream(rtspUrl);

        if (data?.whepUrl) {
          setCurrentUrl(data.whepUrl);
          return;
        }

        throw new Error("Server returned no WHEP URL");
      } catch (err) {
        console.error(`CreateStream failed (attempt ${attempt}):`, err);
        if (attempt < MAX_RETRY) {
          retryTimer = window.setTimeout(fetchStream, 5000);
        } else {
          toast.error("Max retry exceeded");

          setCurrentUrl("");
        }
      }
    };

    fetchStream();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [rtspUrl]);

  const handleApplySettings = () => {
    setRtspUrl(rtspUrlInput);
  };

  useEffect(() => {
    if (!currentUrl) return;
    const video = videoRef.current as any;
    let pc: RTCPeerConnection | null = null;
    let retryTimer: number | null = null;

    if (!video) {
      console.error("Video element not found");
      return;
    }
    const createPeer = () => {
      pc = new RTCPeerConnection({ iceServers: [] });

      pc.ontrack = (event) => {
        console.log("✔ Track received");
        video.srcObject = event.streams[0];
        setIsLive(true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) console.log("ICE:", event.candidate);
      };

      return pc;
    };

    const startWebRTC = async () => {
      if (!pc) pc = createPeer(); // luôn luôn tạo pc mới

      try {
        const offer = await pc.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        });

        await pc.setLocalDescription(offer);

        const authHeader = "Basic " + btoa(`${VIEWER_USER}:${VIEWER_PASS}`);
        const urlgetWhep = `http://${MTX_HOST}:${MTX_PORT}${currentUrl}`;

        const response = await fetch(urlgetWhep, {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            Authorization: authHeader,
          },
          body: offer.sdp || "",
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`WHEP failed (${response.status}): ${text}`);
        }

        const answerSDP = await response.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

        console.log("WebRTC connected:");
      } catch (err) {
        console.error("WebRTC error:", err);
        throw err;
      }
    };

    const connect = async () => {
      try {
        await startWebRTC();
      } catch (err) {
        console.warn("Retry WebRTC in 3s...");

        // Destroy PC cũ trước khi retry
        if (pc) {
          pc.getSenders().forEach((s) => s.track?.stop());
          pc.close();
          pc = null;
        }

        retryTimer = window.setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);

      if (pc) {
        pc.getSenders().forEach((s) => s.track?.stop());
        pc.close();
        pc = null;
      }
    };
  }, [currentUrl]);

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    let nextScale = scaleZoom + (e.deltaY > 0 ? -0.1 : 0.1);
    nextScale = Math.min(Math.max(nextScale, 1), 5); // min 1 - max 5

    if (nextScale === 1) {
      // Reset pan khi về mức zoom 1
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
    if (scaleZoom === 1) return; // không pan khi chưa zoom
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

  return (
    <div
      className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden shadow-xl relative"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      ref={containerRef}
    >
      {/* Camera Header */}
      <div
        className={`camera-header z-10 flex items-center justify-between ${
          isFullscreen ? "px-6 py-4" : "px-3 py-2"
        } bg-slate-800 border-b border-slate-700`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-green-500 animate-pulse" : "bg-gray-500"
            } ${isFullscreen ? "w-3 h-3" : "w-2 h-2"}`}
          />
          <span className="text-sm text-white">{name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
          <button
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            onClick={() => {
              if (onHide) {
                onHide(id);
              } else {
                onRemove(id);
              }
            }}
            title={onHide ? "Ẩn Camera" : "Remove Camera"}
          >
            <X
              className={`${
                isFullscreen ? "w-6 h-6" : "w-4 h-4"
              }  text-slate-300`}
            />
          </button>
        </div>
      </div>
      {/* Camera Content */}
      <div
        className="camera-content flex-1 relative bg-slate-800"
        ref={videoContentRef}
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
          {/* <div className="absolute inset-0"> */}
          <video
            ref={videoRef}
            autoPlay
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
          {/* </div> */}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          {isLive ? (
            <div className="w-full h-full relative">
              {/* Top Overlay Info */}
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                {isPaused ? "PAUSED" : "LIVE"}
              </div>

              {/* Bottom Info - Above Controls */}
              <div
                className={`absolute left-2 right-2 flex justify-between text-xs text-white font-mono transition-all ${
                  showControls ? "bottom-14" : "bottom-2"
                }`}
              >
                <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                  {timestamp.toLocaleTimeString()}
                </div>
              </div>

              {/* Control Bar - Bottom Fixed */}
              <div
                className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                  showControls
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                <div className="bg-black/80 backdrop-blur-md px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    {/* Left Controls - Play/Pause */}
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                      title={isPaused ? "Play" : "Pause"}
                    >
                      {isPaused ? (
                        <Play className="w-4 h-4 text-white" fill="white" />
                      ) : (
                        <Pause className="w-4 h-4 text-white" fill="white" />
                      )}
                    </button>

                    {/* Right Controls - Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                      title="Fullscreen"
                    >
                      <Maximize className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <span className="text-sm">Không có tín hiệu</span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700 [&>button]:text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Cài đặt Camera</DialogTitle>
            <DialogDescription className="text-slate-400">
              Cấu hình đường dẫn RTSP cho camera này
            </DialogDescription>
            <div className="mt-2 px-3 py-2 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">{name}</span>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rtsp-url" className="text-slate-300">
                Đường dẫn RTSP
              </Label>
              <Input
                id="rtsp-url"
                type="text"
                placeholder="Nhập đường dẫn RTSP"
                value={rtspUrlInput}
                onChange={(e) => setRtspUrlInput(e.target.value)}
                className="bg-slate-700 text-white border-slate-600 focus:border-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(false)}
              className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
            >
              Hủy
            </Button>
            <Button
              onClick={handleApplySettings}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Áp dụng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export alias for backward compatibility
export const CameraFeed = LiveviewFeed;
