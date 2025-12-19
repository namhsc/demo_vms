import GridLayout, { Layout, LayoutItem } from 'react-grid-layout';
import { LiveviewFeed } from './CameraFeed';
import { PlaybackFeed, PlaybackFeedHandle } from './PlaybackFeed';
import 'react-grid-layout/css/styles.css';
import { Camera, VideoSegment } from '../App';
import React, { useRef, useEffect, useState } from 'react';

interface CameraGridProps {
	cameras: Camera[];
	onLayoutChange: (layout: Layout) => void;
	onRemoveCamera: (id: string) => void;
	onToggleCamera?: (id: string) => void;
	onSelectCamera?: (id: string) => void;
	activeCameraId?: string | null;

	mode?: 'liveview' | 'playback';
	cols?: number;
	rowHeight?: number;
	setCameras: React.Dispatch<React.SetStateAction<Camera[]>>;
	setGlobalPlaybackState: React.Dispatch<
		React.SetStateAction<{
			currentTime: number;
			speed: number;
			activeSegment: number;
			isPlaying: boolean;
		}>
	>;
	cameraRefs: React.MutableRefObject<Record<string, PlaybackFeedHandle | null>>;
	segmentsByCameraId: Record<
		string,
		{
			segment: VideoSegment[];
			idRecord: string;
			record: boolean;
		}
	>;
	setSegmentsByCameraId: React.Dispatch<
		React.SetStateAction<
			Record<
				string,
				{
					segment: VideoSegment[];
					idRecord: string;
					record: boolean;
				}
			>
		>
	>;
}

export function CameraGrid({
	cameras,
	onLayoutChange,
	onRemoveCamera,
	onToggleCamera,
	onSelectCamera,
	activeCameraId,
	mode = 'liveview',
	setCameras,
	setGlobalPlaybackState,
	cameraRefs,
	segmentsByCameraId,
	setSegmentsByCameraId,
}: CameraGridProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(1200);

	// Aspect ratio constant: 16:9 (standard video ratio)
	const ASPECT_RATIO = 16 / 9;
	// Header height in pixels (py-2 padding + content ≈ 40px)
	const HEADER_HEIGHT = 40;

	// Filter out hidden cameras and limit to first 3 cameras
	const allVisibleCameras = cameras.filter((camera) => !camera.hidden);
	const visibleCameras = allVisibleCameras.slice(0, 3);

	// Calculate rowHeight to maintain aspect ratio (excluding header)
	// Each camera width = containerWidth / 3
	// Content height (excluding header) = (containerWidth / 3) * 9/16
	// Total height = content height + header height
	// rowHeight = total height / number of rows
	const rowHeight = React.useMemo(() => {
		const cameraWidth = containerWidth / 3;
		const contentHeight = cameraWidth / ASPECT_RATIO;
		const totalHeight = contentHeight + HEADER_HEIGHT;
		return Math.max(100, totalHeight / 2); // Divide by 2 because h=2
	}, [containerWidth]);

	// Auto-arrange first 3 cameras in a horizontal row with equal width and correct aspect ratio
	const arrangedCameras = React.useMemo(() => {
		return visibleCameras.map((camera, index) => {
			const w = 4; // Each camera takes 4 columns (33.33% width)
			const pixelWidth = (w / 12) * containerWidth;
			// Calculate content height (excluding header) to maintain aspect ratio
			const contentHeight = pixelWidth / ASPECT_RATIO;
			// Total height includes header
			const totalHeight = contentHeight + HEADER_HEIGHT;
			const h = Math.max(1, Math.round((totalHeight / rowHeight) * 100) / 100);

			return {
				...camera,
				x: index * 4, // x: 0, 4, 8
				y: 0, // All on the same row
				w: w,
				h: h,
			};
		});
	}, [visibleCameras, containerWidth, rowHeight]);

	// Calculate container width dynamically
	useEffect(() => {
		const updateWidth = () => {
			if (containerRef.current) {
				const width = containerRef.current.offsetWidth;
				setContainerWidth(width);
			}
		};

		updateWidth();
		window.addEventListener('resize', updateWidth);
		return () => window.removeEventListener('resize', updateWidth);
	}, []);

	// Helper function to enforce aspect ratio on a layout item (excluding header)
	const enforceAspectRatio = (item: LayoutItem): LayoutItem => {
		// Calculate pixel width of the item
		const pixelWidth = (item.w / 12) * containerWidth;
		// Calculate content height (excluding header) to maintain aspect ratio
		const contentHeight = pixelWidth / ASPECT_RATIO;
		// Total height includes header
		const totalHeight = contentHeight + HEADER_HEIGHT;
		// Convert to grid units (rows)
		const newH = totalHeight / rowHeight;

		return {
			...item,
			h: Math.max(1, Math.round(newH * 100) / 100), // Round to 2 decimal places
		};
	};

	// Handle layout change with aspect ratio enforcement
	const handleLayoutChange = (layout: Layout) => {
		// Enforce aspect ratio on all items
		const correctedLayout = layout.map((item) => enforceAspectRatio(item));
		onLayoutChange(correctedLayout);
	};

	// Handle resize to maintain aspect ratio
	const handleResize = (
		layout: Layout,
		oldItem: LayoutItem | null,
		newItem: LayoutItem | null,
	) => {
		if (!newItem) {
			handleLayoutChange(layout);
			return;
		}

		// Enforce aspect ratio on the resized item
		const correctedItem = enforceAspectRatio(newItem);
		const updatedLayout = layout.map((item) =>
			item.i === correctedItem.i ? correctedItem : item,
		);

		handleLayoutChange(updatedLayout);
	};

	return (
		<div ref={containerRef} className="h-full w-full">
			<GridLayout
				className="layout h-full"
				layout={arrangedCameras}
				width={containerWidth}
				autoSize={true}
				onLayoutChange={handleLayoutChange}
				onResize={handleResize}
				resizeConfig={{
					enabled: true,
					handles: ['se', 's', 'e'], // Allow resize from southeast, south, and east
				}}
				gridConfig={{
					cols: 12,
					rowHeight: rowHeight,
				}}
				dragConfig={{
					handle: '.camera-header', // ✔ chỉ kéo khi người dùng nhấn vào header
					cancel: '.camera-content', // ✔ chặn kéo tại content (dùng để zoom/pan)
				}}
			>
				{arrangedCameras.map((camera) => (
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
								'0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
						}}
					>
						<div className="drag-handle cursor-move h-full">
							{mode === 'liveview' ? (
								<LiveviewFeed
									id={camera.i}
									name={camera.name}
									initialRecord={camera.isRecording || false}
									onRemove={onRemoveCamera}
									onHide={onToggleCamera}
									url={camera.url || ''}
									setCameras={setCameras}
									cameras={cameras}
									setSegmentsByCameraId={setSegmentsByCameraId}
								/>
							) : (
								<PlaybackFeed
									id={camera.i}
									name={camera.name}
									onRemove={onRemoveCamera}
									onSelect={onSelectCamera}
									isActive={activeCameraId === camera.i}
									setGlobalPlaybackState={setGlobalPlaybackState}
									segements={segmentsByCameraId[camera.i]?.segment || []}
									ref={(el) => {
										cameraRefs.current[camera.i] = el;
									}}
								/>
							)}
						</div>
					</div>
				))}
			</GridLayout>
		</div>
	);
}
