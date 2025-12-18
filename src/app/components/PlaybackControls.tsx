import React, { useState, useRef, useEffect } from 'react';
import {
	Play,
	Pause,
	SkipForward,
	SkipBack,
	ZoomIn,
	ZoomOut,
} from 'lucide-react';

interface PlaybackControlsProps {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	playbackSpeed: number;
	selectedDate: Date;
	selectedTime: string;
	onPlayPause: () => void;
	onSeek: (time: number) => void;
	onSkip: (seconds: number) => void;
	onSpeedChange: (speed: number) => void;
	onDateChange: (date: Date) => void;
	onTimeChange: (time: string) => void;
	activeCameraName?: string;
	zoomLevel?: number;
	onZoomChange?: (zoom: number) => void;
	viewStart?: number;
	viewEnd?: number;
	onViewChange?: (start: number, end: number) => void;
}

// Format time for display
const formatTime = (seconds: number) => {
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	if (hrs > 0) {
		return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
			.toString()
			.padStart(2, '0')}`;
	}
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function PlaybackControls({
	isPlaying,
	currentTime,
	duration,
	playbackSpeed,
	selectedDate,
	selectedTime,
	onPlayPause,
	onSeek,
	onSkip,
	onSpeedChange,
	onDateChange,
	onTimeChange,
	activeCameraName,
	zoomLevel: externalZoomLevel,
	onZoomChange,
	viewStart: externalViewStart,
	viewEnd: externalViewEnd,
	onViewChange,
}: PlaybackControlsProps) {
	// Internal zoom state if not controlled externally
	const [internalZoomLevel, setInternalZoomLevel] = useState(1);
	const [internalViewStart, setInternalViewStart] = useState(0);
	const [internalViewEnd, setInternalViewEnd] = useState(duration);

	const zoomLevel = externalZoomLevel ?? internalZoomLevel;
	const viewStart = externalViewStart ?? internalViewStart;
	const viewEnd = externalViewEnd ?? internalViewEnd;

	const timelineRef = useRef<HTMLDivElement>(null);

	// Calculate visible duration based on zoom
	const visibleDuration = viewEnd - viewStart;
	const zoomStep = 0.1;
	const minZoom = 0.5; // Show 2x duration
	const maxZoom = 10; // Show 1/10 duration

	const handleZoomIn = () => {
		const newZoom = Math.min(zoomLevel + zoomStep, maxZoom);
		updateZoom(newZoom);
	};

	const handleZoomOut = () => {
		const newZoom = Math.max(zoomLevel - zoomStep, minZoom);
		updateZoom(newZoom);
	};

	const updateZoom = (newZoom: number) => {
		// Calculate new view range centered on current time
		const center = currentTime;
		const newVisibleDuration = duration / newZoom;
		const halfDuration = newVisibleDuration / 2;
		let newStart = Math.max(0, center - halfDuration);
		let newEnd = Math.min(duration, center + halfDuration);

		// Adjust if we hit boundaries
		if (newEnd >= duration) {
			newEnd = duration;
			newStart = Math.max(0, duration - newVisibleDuration);
		}
		if (newStart <= 0) {
			newStart = 0;
			newEnd = Math.min(duration, newVisibleDuration);
		}

		if (onZoomChange) {
			onZoomChange(newZoom);
		} else {
			setInternalZoomLevel(newZoom);
		}

		if (onViewChange) {
			onViewChange(newStart, newEnd);
		} else {
			setInternalViewStart(newStart);
			setInternalViewEnd(newEnd);
		}
	};

	// Update view when currentTime changes to keep it in view (only if seeking)
	useEffect(() => {
		const margin = visibleDuration * 0.1; // 10% margin
		if (currentTime < viewStart + margin || currentTime > viewEnd - margin) {
			const center = currentTime;
			const currentVisibleDuration = viewEnd - viewStart;
			const halfDuration = currentVisibleDuration / 2;
			let newStart = Math.max(0, center - halfDuration);
			let newEnd = Math.min(duration, center + halfDuration);

			if (newEnd >= duration) {
				newEnd = duration;
				newStart = Math.max(0, duration - currentVisibleDuration);
			}
			if (newStart <= 0) {
				newStart = 0;
				newEnd = Math.min(duration, currentVisibleDuration);
			}

			// Only update if there's a significant change to avoid loops
			if (Math.abs(newStart - viewStart) > 1 || Math.abs(newEnd - viewEnd) > 1) {
				if (onViewChange) {
					onViewChange(newStart, newEnd);
				} else {
					setInternalViewStart(newStart);
					setInternalViewEnd(newEnd);
				}
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentTime]);

	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		if (e.deltaY < 0) {
			handleZoomIn();
		} else {
			handleZoomOut();
		}
	};

	// Generate time markers
	const generateTimeMarkers = () => {
		const markers: { time: number; label: string }[] = [];
		const step = Math.max(1, Math.floor(visibleDuration / 20)); // Max 20 markers

		for (let time = viewStart; time <= viewEnd; time += step) {
			markers.push({
				time,
				label: formatTime(time),
			});
		}

		return markers;
	};

	const timeMarkers = generateTimeMarkers();

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTime = parseFloat(e.target.value);
		onSeek(newTime);
	};

	// Calculate position percentage for current time in visible range
	const getTimePosition = (time: number) => {
		if (visibleDuration === 0) return 0;
		return ((time - viewStart) / visibleDuration) * 100;
	};

	return (
		<div className="bg-slate-800 border-t border-slate-700 rounded-b-xl">
			{/* Control Bar */}
			<div className="px-4 py-3 border-b border-slate-700">
				<div className="flex items-center justify-between gap-4">
					{/* Left - Camera Name */}
					{activeCameraName && (
						<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg">
							<span className="text-xs text-slate-400">Camera:</span>
							<span className="text-sm text-white font-medium">
								{activeCameraName}
							</span>
						</div>
					)}

					{/* Center - Playback Controls */}
					<div className="flex items-center gap-2 flex-1 justify-center">
						<button
							onClick={() => onSkip(-10)}
							className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
							title="Rewind 10s"
						>
							<SkipBack className="w-5 h-5 text-white" />
						</button>
						<button
							onClick={onPlayPause}
							className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
							title={isPlaying ? 'Pause' : 'Play'}
						>
							{isPlaying ? (
								<Pause className="w-5 h-5 text-white" fill="white" />
							) : (
								<Play className="w-5 h-5 text-white" fill="white" />
							)}
						</button>
						<button
							onClick={() => onSkip(10)}
							className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
							title="Forward 10s"
						>
							<SkipForward className="w-5 h-5 text-white" />
						</button>
					</div>

					{/* Right - Zoom Controls */}
					<div className="flex items-center gap-1">
						<button
							onClick={handleZoomOut}
							className="p-1 hover:bg-slate-700 rounded transition-colors"
							title="Zoom Out"
						>
							<ZoomOut className="w-4 h-4 text-slate-300" />
						</button>
						<span className="text-xs text-slate-400 min-w-[50px] text-center">
							{zoomLevel.toFixed(1)}x
						</span>
						<button
							onClick={handleZoomIn}
							className="p-1 hover:bg-slate-700 rounded transition-colors"
							title="Zoom In"
						>
							<ZoomIn className="w-4 h-4 text-slate-300" />
						</button>
					</div>
				</div>
			</div>

			{/* Timeline */}
			<div className="px-4 py-3 border-b border-slate-700">

				{/* Timeline with markers */}
				<div
					ref={timelineRef}
					className="relative mb-2"
					onWheel={handleWheel}
					style={{ cursor: 'grab' }}
				>
					{/* Time markers */}
					<div className="relative h-8 mb-1">
						{timeMarkers.map((marker, index) => (
							<div
								key={index}
								className="absolute flex flex-col items-center"
								style={{ left: `${getTimePosition(marker.time)}%` }}
							>
								<div className="w-px h-3 bg-slate-500" />
								<span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
									{marker.label}
								</span>
							</div>
						))}
					</div>

					{/* Slider */}
					<div className="relative">
						<input
							type="range"
							min={viewStart}
							max={viewEnd}
							step={Math.max(0.1, visibleDuration / 1000)}
							value={currentTime}
							onChange={handleSeek}
							className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer playback-slider"
						/>
					</div>
				</div>

				{/* Time Display - Below Timeline */}
				<div className="flex justify-center mt-2">
					<div className="text-xs text-slate-400 font-mono">
						{formatTime(currentTime)} / {formatTime(duration)}
					</div>
				</div>
			</div>

			{/* Custom slider styles */}
			<style>{`
        .playback-slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
        }
        .playback-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
        }
      `}</style>
		</div>
	);
}

