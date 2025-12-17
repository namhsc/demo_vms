import React from 'react';
import GridLayout from 'react-grid-layout';
import { CameraFeed } from './CameraFeed';
import 'react-grid-layout/css/styles.css';

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
  onLayoutChange: (layout: any[]) => void;
  onRemoveCamera: (id: string) => void;
  cols?: number;
  rowHeight?: number;
}

export function CameraGrid({ 
  cameras, 
  onLayoutChange, 
  onRemoveCamera,
  cols = 12,
  rowHeight = 150 
}: CameraGridProps) {
  
  // Filter out hidden cameras
  const visibleCameras = cameras.filter(camera => !camera.hidden);
  
  return (
    <GridLayout
      className="layout"
      layout={visibleCameras}
      cols={cols}
      rowHeight={rowHeight}
      width={1200}
      onLayoutChange={onLayoutChange}
      draggableHandle=".drag-handle"
      isDraggable={true}
      isResizable={true}
      compactType={null}
      preventCollision={false}
    >
      {visibleCameras.map((camera) => (
        <div 
          key={camera.i} 
          className="bg-slate-800 rounded-lg overflow-hidden"
          style={{ 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
          }}
        >
          <div className="drag-handle cursor-move h-full">
            <CameraFeed
              id={camera.i}
              name={camera.name}
              onRemove={onRemoveCamera}
            />
          </div>
        </div>
      ))}
    </GridLayout>
  );
}