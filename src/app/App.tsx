import React, { useState, useEffect, useRef } from "react";
import { CameraGrid } from "./components/CameraGrid";
import { CameraList } from "./components/CameraList";
import { DAY_SECONDS, PlaybackControls } from "./components/PlaybackControls";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Grid3x3, RotateCcw, Video, Radio, History } from "lucide-react";
import { Layout } from "react-grid-layout";
// import demoVideo from "../assets/video.mp4";
import { Toaster } from "sonner";
import { PlaybackFeedHandle } from "./components/PlaybackFeed";
import {
  createSegmentsFromRecordList,
  getListStream,
} from "../services/streamService";

export interface Camera {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  hidden?: boolean;
  url?: string;
  // segments?: VideoSegment[];
}

export interface VideoSegment {
  index: number;
  start: number; // seconds
  end: number; // seconds
  src: string; // video source URL
  fileName?: string;
  createdAt?: string;
}

const SEGMENT_GAP_SECONDS = 30 * 60; // 30 phút

const createSegmentsForCamera = (
  durationSeconds: number,
  startOffsetSeconds?: number
): VideoSegment[] => {
  const segments: VideoSegment[] = [];

  let index = 0;
  let start = startOffsetSeconds || 0;

  while (start < DAY_SECONDS) {
    const end = start + durationSeconds;

    if (end > DAY_SECONDS) break;

    segments.push({
      index,
      start,
      end,
      src: "demoVideo",
    });

    start = end + SEGMENT_GAP_SECONDS;
    index++;
  }

  return segments;
};

const layoutDefault: Camera[] = [
  {
    i: "cam-1",
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    name: "Camera 1 - Entrance",
    hidden: false,
    // url: "rtsp://admin:AdminCam@192.168.16.239:554/Streaming/Channels/101?transportmode=unicast&profile=Profile_1",
  },
  {
    i: "cam-2",
    x: 4,
    y: 0,
    w: 4,
    h: 2,
    name: "Camera 2 - Parking Lot",
    hidden: false,
    //url: "rtsp://admin:AdminCam@192.168.16.239:554/Streaming/Channels/101?transportmode=unicast&profile=Profile_1",
  },
  {
    i: "cam-3",
    x: 0,
    y: 2,
    w: 4,
    h: 2,
    name: "Camera 2 - Parking Lot",
    hidden: false,
  },
];

function App() {
  const [viewMode, setViewMode] = useState<"liveview" | "playback">("liveview");
  const [activePlaybackCamera, setActivePlaybackCamera] = useState<
    string | null
  >(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("00:00");

  // Timeline zoom state
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(3600);
  const [cameras, setCameras] = useState<Camera[]>(() => {
    const savedLayout = localStorage.getItem("cameraLayout");
    if (savedLayout) {
      const parsedLayout = JSON.parse(savedLayout);
      return parsedLayout;
    } else {
      return layoutDefault;
    }
  });

  const handleLayoutChange = (layout: Layout) => {
    const updatedCameras = cameras.map((camera) => {
      const layoutItem = layout.find((item) => item.i === camera.i);
      if (layoutItem) {
        return {
          ...camera,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        };
      }
      return camera;
    });
    setCameras(updatedCameras);
    localStorage.setItem("cameraLayout", JSON.stringify(updatedCameras));
  };

  const handleRemoveCamera = (id: string) => {
    setCameras(cameras.filter((camera) => camera.i !== id));
  };

  const handleToggleCamera = (id: string) => {
    setCameras(
      cameras.map((camera) =>
        camera.i === id ? { ...camera, hidden: !camera.hidden } : camera
      )
    );
  };

  const handleResetLayout = () => {
    setCameras(layoutDefault);
  };

  const handlePlaybackCameraSelect = (id: string) => {
    setActivePlaybackCamera(id);
  };

  // const videoRef = useRef<HTMLVideoElement>(null);

  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [globalPlaybackState, setGlobalPlaybackState] = useState({
    currentTime: 0,
    speed: 1.0,
    activeSegment: 0,
    isPlaying: false,
  });

  const [segmentsByCameraId, setSegmentsByCameraId] = useState<
    Record<string, VideoSegment[]>
  >({});

  useEffect(() => {
    // const video = videoRef.current;
    // if (!video) return;
    // video.onloadedmetadata = () => {
    //   const durationSeconds = video.duration;
    //   const camerasNeedLoad = cameras.filter(
    //     (cam) => !segmentsByCameraId[cam.i]
    //   );

    //   if (camerasNeedLoad.length === 0) return;
    //   const abc = camerasNeedLoad.map((cam) => {
    //     return {
    //       cameraId: cam.i,
    //       segments: createSegmentsForCamera(durationSeconds),
    //     };
    //   });
    //   setSegmentsByCameraId((prev) => {
    //     const next = { ...prev };
    //     abc.forEach((r) => {
    //       next[r.cameraId] = r.segments;
    //     });
    //     return next;
    //   });
    // };

    // return;
    const loadSegments = async () => {
      const camerasNeedLoad = cameras.filter(
        (cam) => !segmentsByCameraId[cam.i]
      );

      if (camerasNeedLoad.length === 0) return;

      const results = await Promise.all(
        camerasNeedLoad.map(async (cam) => {
          const data = await getListStream(cam.i);
          return {
            cameraId: cam.i,
            segments: createSegmentsFromRecordList(data.videos),
          };
        })
      );

      setSegmentsByCameraId((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.cameraId] = r.segments;
        });
        return next;
      });
    };

    loadSegments();
  }, [cameras]); // ✅ CHỈ phụ thuộc cameras

  // Simulate playback time (in real app, this would come from video element)
  useEffect(() => {
    if (viewMode !== "playback") return;
    setCurrentTime((prev) => {
      return globalPlaybackState.currentTime;
    });
  }, [globalPlaybackState, viewMode]);

  const cameraRefs = useRef<Record<string, PlaybackFeedHandle | null>>({});

  const handlePlayPause = () => {
    if (!activePlaybackCamera) return;
    const ref = cameraRefs.current[activePlaybackCamera];
    if (!ref) return;

    if (globalPlaybackState.isPlaying) {
      ref.pause();
    } else {
      ref.play();
    }
  };

  const handleSeek = () => {
    if (!activePlaybackCamera) return;
    const ref = cameraRefs.current[activePlaybackCamera];
    if (!ref) return;
    ref.prevSegment();
  };

  const handleSkip = () => {
    if (!activePlaybackCamera) return;
    const ref = cameraRefs.current[activePlaybackCamera];
    if (!ref) return;
    ref.nextSegment();
  };

  useEffect(() => {
    if (!activePlaybackCamera) {
      setSegments([]);
      return;
    }
    const findSegment = segmentsByCameraId[activePlaybackCamera];
    setSegments(findSegment || []);
  }, [activePlaybackCamera]);

  return (
    <>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Header / Toolbar */}
        <header className="bg-slate-900 border-b border-slate-800 shadow-lg">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl text-white">
                    Hệ thống quản lý camera
                  </h1>
                  <p className="text-sm text-slate-400">
                    Hệ thống quản lý camera thông minh
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetLayout}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors shadow-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  Quay lại mặc định
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-[1600px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              {/* View Mode Tabs */}
              <Tabs
                value={viewMode}
                onValueChange={(value) =>
                  setViewMode(value as "liveview" | "playback")
                }
                className="w-auto"
              >
                <TabsList className="bg-slate-700/80 border border-slate-600/50 shadow-lg">
                  <TabsTrigger
                    value="liveview"
                    className="text-slate-300 hover:text-white hover:bg-slate-600/50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-200"
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Xem trực tiếp
                  </TabsTrigger>
                  <TabsTrigger
                    value="playback"
                    className="text-slate-300 hover:text-white hover:bg-slate-600/50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-200"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Xem lại
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">
                    Active Cameras:{" "}
                    <span className="text-white">{cameras.length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-slate-400">
                    Status:{" "}
                    <span className="text-green-400">All Systems Online</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-[1600px] mx-auto  py-6 w-full">
          {cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
              <Video className="w-24 h-24 mb-4" />
              <h2 className="text-xl mb-2">No Cameras Added</h2>
              <p className="text-sm">No cameras available</p>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Camera List Sidebar */}
              <div className="col-span-3">
                <CameraList
                  cameras={cameras}
                  onRemoveCamera={handleRemoveCamera}
                  onToggleCamera={handleToggleCamera}
                />
              </div>

              {/* Camera Grid */}
              <div className="col-span-9 bg-slate-900/30 rounded-xl p-4 flex flex-col">
                <div className="flex-1">
                  <CameraGrid
                    cameras={cameras}
                    onLayoutChange={handleLayoutChange}
                    onRemoveCamera={handleRemoveCamera}
                    onToggleCamera={handleToggleCamera}
                    onSelectCamera={
                      viewMode === "playback"
                        ? handlePlaybackCameraSelect
                        : undefined
                    }
                    activeCameraId={
                      viewMode === "playback" ? activePlaybackCamera : undefined
                    }
                    mode={viewMode}
                    setCameras={setCameras}
                    setGlobalPlaybackState={setGlobalPlaybackState}
                    cameraRefs={cameraRefs}
                    segmentsByCameraId={segmentsByCameraId}
                  />
                </div>
                {viewMode === "playback" && (
                  <PlaybackControls
                    segments={segments}
                    isPlaying={globalPlaybackState.isPlaying}
                    currentTime={currentTime}
                    playbackSpeed={playbackSpeed}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onPlayPause={handlePlayPause}
                    onSeek={handleSeek}
                    onSkip={handleSkip}
                    onSpeedChange={setPlaybackSpeed}
                    onDateChange={setSelectedDate}
                    onTimeChange={setSelectedTime}
                    activeCameraName={
                      activePlaybackCamera
                        ? cameras.find((c) => c.i === activePlaybackCamera)
                            ?.name
                        : undefined
                    }
                    zoomLevel={timelineZoom}
                    onZoomChange={setTimelineZoom}
                    viewStart={viewStart}
                    viewEnd={viewEnd}
                    onViewChange={(start, end) => {
                      setViewStart(start);
                      setViewEnd(end);
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div>© 2025 Camera Management System</div>
            </div>
          </div>
        </footer>
        {/* <video
          ref={videoRef}
          src={demoVideo}
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ display: "none" }}
        /> */}
      </div>
      <Toaster position="top-right" richColors closeButton duration={3000} />
    </>
  );
}

export default App;
