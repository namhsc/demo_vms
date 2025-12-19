import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  X,
  Play,
  Pause,
  Maximize,
  Save,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
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
  const videoContentRef = useRef<HTMLDivElement>(null);
  const [scaleZoom, setScaleZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecord, setIsRecord] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle video pause/play
  useEffect(() => {
    const video = videoRef.current as HTMLVideoElement | null;
    if (!video) return;

    if (isPaused) {
      video.pause();
    } else if (isLive) {
      video.play().catch((err) => {
        console.warn("Play failed:", err);
      });
    }
  }, [isPaused, isLive]);

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
        return { ...item, url: rtspUrl, isRecording };
      } else {
        return { ...item };
      }
    });
    setCameras(updatedCameras);

    localStorage.setItem("cameraLayout", JSON.stringify(updatedCameras));

    const fetchStream = async () => {
      try {
        attempt++;
        const data = await createStream(rtspUrl, isRecording);

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
  }, [rtspUrl, isRecord]);

  const handleApplySettings = () => {
    setRtspUrl(rtspUrlInput);
    setIsRecord(isRecording);
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
              <TransformComponent
                wrapperClass="w-full h-full"
                contentClass="w-full h-full flex items-center justify-center"
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="absolute inset-0">
                    <img
                      src={generatePattern()}
                      alt={`Camera ${name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      zIndex: 2,
                    }}
                  />
                </div>
              </TransformComponent>

              {/* Zoom Controls */}
              {showControls && (
                <div className="absolute top-2 right-2 z-20 flex gap-2">
                  <button
                    onClick={() => zoomIn()}
                    className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg shadow-lg transition-colors backdrop-blur-sm"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg shadow-lg transition-colors backdrop-blur-sm"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg shadow-lg transition-colors backdrop-blur-sm"
                    title="Đặt lại"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Overlay Info */}
              <div className="absolute inset-0 pointer-events-none">
                {isLive ? (
                  <div className="w-full h-full relative">
                    {/* Top Overlay Info */}
                    <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white pointer-events-auto">
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
                      className={`absolute bottom-0 left-0 right-0 transition-all duration-300 pointer-events-auto ${
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
                              <Play
                                className="w-4 h-4 text-white"
                                fill="white"
                              />
                            ) : (
                              <Pause
                                className="w-4 h-4 text-white"
                                fill="white"
                              />
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
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                    <span className="text-sm">Không có tín hiệu</span>
                  </div>
                )}
              </div>
            </>
          )}
        </TransformWrapper>
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
          <div className="flex items-center justify-between px-3 py-2 bg-slate-700/40 rounded-lg border border-slate-600">
            <div className="flex flex-col">
              <span className="text-sm text-white font-medium">
                Ghi hình (Recording)
              </span>
              <span className="text-xs text-slate-400">
                Bật để lưu video playback cho camera này
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  isRecording ? "text-red-400" : "text-slate-400"
                }`}
              >
                {isRecording ? "ON" : "OFF"}
              </span>

              {/* Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecording}
                  onChange={(e) => setIsRecording(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`
          w-10 h-5 rounded-full transition-colors duration-200
          ${isRecording ? "bg-red-600" : "bg-slate-500"}
        `}
                />
                <div
                  className={`
          absolute left-1 top-1 w-3 h-3 rounded-full bg-white transition-transform duration-200
          ${isRecording ? "translate-x-5" : "translate-x-0"}
        `}
                />
              </label>
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
