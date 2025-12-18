import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface PlaybackFeedProps {
	id: string;
	name: string;
	onRemove: (id: string) => void;
	onSelect?: (id: string) => void;
	isActive?: boolean;
	currentTime?: number;
	isPlaying?: boolean;
	url?: string;
}

// Generate a random pattern for mock video feed
const generatePattern = () => {
	const canvas = document.createElement('canvas');
	canvas.width = 640;
	canvas.height = 480;
	const ctx = canvas.getContext('2d');

	if (ctx) {
		// Create gradient background
		const gradient = ctx.createLinearGradient(
			0,
			0,
			canvas.width,
			canvas.height,
		);
		gradient.addColorStop(0, '#1e293b');
		gradient.addColorStop(1, '#334155');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Add grid pattern
		ctx.strokeStyle = '#475569';
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
	return '';
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export function PlaybackFeed({
	id,
	name,
	onRemove,
	onSelect,
	isActive = false,
	currentTime = 0,
	isPlaying = false,
	url,
}: PlaybackFeedProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const lastPos = useRef({ x: 0, y: 0 });
	const videoContentRef = useRef<HTMLDivElement>(null);
	const [scaleZoom, setScaleZoom] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);

	// Update video currentTime when prop changes
	useEffect(() => {
		if (videoRef.current && isActive) {
			videoRef.current.currentTime = currentTime;
		}
	}, [currentTime, isActive]);

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

		div.addEventListener('wheel', handleWheel, { passive: false });

		return () => div.removeEventListener('wheel', handleWheel);
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
	const handleMouseLeave = () => setIsPanning(false);

	const handleClick = () => {
		if (onSelect) {
			onSelect(id);
		}
	};

	return (
		<div
			className={`flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden shadow-xl relative ${
				isActive ? 'ring-2 ring-blue-500' : ''
			}`}
			ref={containerRef}
		>
			{/* Camera Header */}
			<div className="camera-header z-10 flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-blue-500" />
					<span className="text-sm text-white">{name}</span>
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
						transformOrigin: 'center center',
						transition: isPanning ? 'none' : 'transform 0.15s ease-out',
						cursor: scaleZoom > 1 ? 'grab' : 'default',
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
						playsInline
						muted
						controls={false}
						style={{
							width: '100%',
							height: '100%',
							objectFit: 'fill',
							zIndex: 2,
						}}
					/>
				</div>

				{/* Active indicator */}
				{isActive && (
					<div className="absolute top-2 left-2 bg-blue-600 px-2 py-1 rounded text-xs text-white font-semibold">
						Đang chọn
					</div>
				)}
			</div>
		</div>
	);
}
