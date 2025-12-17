import React, { useState } from 'react';
import { CameraGrid } from './components/CameraGrid';
import { CameraList } from './components/CameraList';
import { Grid3x3, RotateCcw, Settings, Video } from 'lucide-react';

interface Camera {
	i: string;
	x: number;
	y: number;
	w: number;
	h: number;
	name: string;
	hidden?: boolean;
}

function App() {
	const [cameras, setCameras] = useState<Camera[]>([
		{
			i: 'cam-1',
			x: 0,
			y: 0,
			w: 4,
			h: 2,
			name: 'Camera 1 - Entrance',
			hidden: false,
		},
		{
			i: 'cam-2',
			x: 4,
			y: 0,
			w: 4,
			h: 2,
			name: 'Camera 2 - Parking Lot',
			hidden: false,
		},
		{
			i: 'cam-3',
			x: 8,
			y: 0,
			w: 4,
			h: 2,
			name: 'Camera 3 - Lobby',
			hidden: false,
		},
		{
			i: 'cam-4',
			x: 0,
			y: 2,
			w: 6,
			h: 2,
			name: 'Camera 4 - Office Area',
			hidden: false,
		},
		{
			i: 'cam-5',
			x: 6,
			y: 2,
			w: 6,
			h: 2,
			name: 'Camera 5 - Warehouse',
			hidden: false,
		},
	]);

	const [nextCameraId, setNextCameraId] = useState(6);

	const handleLayoutChange = (layout: any[]) => {
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
	};

	const handleRemoveCamera = (id: string) => {
		setCameras(cameras.filter((camera) => camera.i !== id));
	};

	const handleToggleCamera = (id: string) => {
		setCameras(
			cameras.map((camera) =>
				camera.i === id ? { ...camera, hidden: !camera.hidden } : camera,
			),
		);
	};

	const handleResetLayout = () => {
		setCameras([
			{
				i: 'cam-1',
				x: 0,
				y: 0,
				w: 4,
				h: 2,
				name: 'Camera 1 - Entrance',
				hidden: false,
			},
			{
				i: 'cam-2',
				x: 4,
				y: 0,
				w: 4,
				h: 2,
				name: 'Camera 2 - Parking Lot',
				hidden: false,
			},
			{
				i: 'cam-3',
				x: 8,
				y: 0,
				w: 4,
				h: 2,
				name: 'Camera 3 - Lobby',
				hidden: false,
			},
			{
				i: 'cam-4',
				x: 0,
				y: 2,
				w: 6,
				h: 2,
				name: 'Camera 4 - Office Area',
				hidden: false,
			},
			{
				i: 'cam-5',
				x: 6,
				y: 2,
				w: 6,
				h: 2,
				name: 'Camera 5 - Warehouse',
				hidden: false,
			},
		]);
		setNextCameraId(6);
	};

	const handleLoadLayout = () => {
		const savedLayout = localStorage.getItem('cameraLayout');
		if (savedLayout) {
			const parsedLayout = JSON.parse(savedLayout);
			setCameras(parsedLayout);
			const maxId = Math.max(
				...parsedLayout.map((cam: Camera) => parseInt(cam.i.split('-')[1])),
			);
			setNextCameraId(maxId + 1);
		}
	};

	React.useEffect(() => {
		handleLoadLayout();
	}, []);

	return (
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
								<h1 className="text-xl text-white">Camera Management System</h1>
								<p className="text-sm text-slate-400">
									Monitor and manage multiple camera feeds
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								onClick={handleResetLayout}
								className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors shadow-lg"
							>
								<RotateCcw className="w-4 h-4" />
								Reset
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Stats Bar */}
			<div className="bg-slate-900/50 border-b border-slate-800">
				<div className="max-w-[1600px] mx-auto px-6 py-3">
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<Grid3x3 className="w-4 h-4 text-slate-400" />
							<span className="text-sm text-slate-400">
								Active Cameras:{' '}
								<span className="text-white">{cameras.length}</span>
							</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
							<span className="text-sm text-slate-400">
								Status:{' '}
								<span className="text-green-400">All Systems Online</span>
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<main className="flex-1 max-w-[1600px] mx-auto px-6 py-6 w-full">
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
						<div className="col-span-9 bg-slate-900/30 rounded-xl p-4">
							<CameraGrid
								cameras={cameras}
								onLayoutChange={handleLayoutChange}
								onRemoveCamera={handleRemoveCamera}
							/>
						</div>
					</div>
				)}
			</main>

			{/* Footer */}
			<footer className="bg-slate-900 border-t border-slate-800 mt-auto">
				<div className="max-w-[1600px] mx-auto px-6 py-4">
					<div className="flex items-center justify-between text-sm text-slate-500">
						<div>© 2025 Camera Management System</div>
						<div className="flex items-center gap-4">
							<span>Drag to move • Resize from corners</span>
							<span>•</span>
							<span>{cameras.length} camera(s) configured</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}

export default App;
