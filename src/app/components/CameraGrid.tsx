import GridLayout, { Layout } from "react-grid-layout";
import { LiveviewFeed } from "./CameraFeed";
import { PlaybackFeed } from "./PlaybackFeed";
import "react-grid-layout/css/styles.css";
import { Camera } from "../App";

interface CameraGridProps {
  cameras: Camera[];
  onLayoutChange: (layout: Layout) => void;
  onRemoveCamera: (id: string) => void;
  onToggleCamera?: (id: string) => void;
  onSelectCamera?: (id: string) => void;
  activeCameraId?: string | null;
  playbackState?: {
    isPlaying: boolean;
    currentTime: number;
  };
  mode?: "liveview" | "playback";
  cols?: number;
  rowHeight?: number;
}

export function CameraGrid({
  cameras,
  onLayoutChange,
  onRemoveCamera,
  onToggleCamera,
  onSelectCamera,
  activeCameraId,
  playbackState,
  mode = "liveview",
}: CameraGridProps) {
  // Filter out hidden cameras
  const visibleCameras = cameras.filter((camera) => !camera.hidden);

  return (
    <GridLayout
      className="layout"
      layout={visibleCameras}
      width={1200}
      autoSize={true}
      onLayoutChange={onLayoutChange}
      gridConfig={{
        cols: 12,
        rowHeight: 150,
      }}
      dragConfig={{
        handle: ".camera-header", // ✔ chỉ kéo khi người dùng nhấn vào header
        cancel: ".camera-content", // ✔ chặn kéo tại content (dùng để zoom/pan)
      }}
    >
      {visibleCameras.map((camera) => (
        <div
          key={camera.i}
          data-grid={{
            x: camera.x,
            y: camera.y,
            w: camera.w,
            h: camera.h,
          }}
          className="bg-slate-800 rounded-lg overflow-hidden"
          style={{
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div className="drag-handle cursor-move h-full">
            {mode === "liveview" ? (
              <LiveviewFeed
                id={camera.i}
                name={camera.name}
                onRemove={onRemoveCamera}
                onHide={onToggleCamera}
                url={camera.url}
              />
            ) : (
              <PlaybackFeed
                id={camera.i}
                name={camera.name}
                onRemove={onRemoveCamera}
                onSelect={onSelectCamera}
                isActive={activeCameraId === camera.i}
                currentTime={playbackState?.currentTime}
                isPlaying={playbackState?.isPlaying}
                url={"http://192.168.17.43:8889/cam1/whep"}
              />
            )}
          </div>
        </div>
      ))}
    </GridLayout>
  );
}
