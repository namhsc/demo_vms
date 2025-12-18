import GridLayout, { Layout } from "react-grid-layout";
import { CameraFeed } from "./CameraFeed";
import "react-grid-layout/css/styles.css";

interface Camera {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  hidden?: boolean;
}

interface CameraGridProps {
  cameras: Camera[];
  onLayoutChange: (layout: Layout) => void;
  onRemoveCamera: (id: string) => void;
  cols?: number;
  rowHeight?: number;
}

export function CameraGrid({
  cameras,
  onLayoutChange,
  onRemoveCamera,
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
      gridConfig={{ cols: 12, rowHeight: 150 }}
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
            <CameraFeed
              id={camera.i}
              name={camera.name}
              onRemove={onRemoveCamera}
              url={"http://192.168.17.43:8889/cam1/whep"}
            />
          </div>
        </div>
      ))}
    </GridLayout>
  );
}
