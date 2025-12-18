import React from 'react';
import { Video, Eye, EyeOff, Trash2, GripVertical } from 'lucide-react';

interface Camera {
	i: string;
	x: number;
	y: number;
	w: number;
	h: number;
	name: string;
	hidden?: boolean;
}

interface CameraListProps {
	cameras: Camera[];
	onRemoveCamera: (id: string) => void;
	onToggleCamera?: (id: string) => void;
	onCameraClick?: (id: string) => void;
}

export function CameraList({
	cameras,
	onRemoveCamera,
	onToggleCamera,
	onCameraClick,
}: CameraListProps) {
	return (
		<div className="bg-slate-900 rounded-xl p-4 h-full">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg text-white flex items-center gap-2">
					<Video className="w-5 h-5" />
					Danh sách Camera
				</h2>
				<span className="text-sm text-slate-400">
					{cameras.length} camera(s)
				</span>
			</div>

			<div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
				{cameras.length === 0 ? (
					<div className="text-center py-8 text-slate-500">
						<Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
						<p className="text-sm">No cameras added</p>
					</div>
				) : (
					cameras.map((camera, index) => (
						<div
							key={camera.i}
							className={`bg-slate-800 hover:bg-slate-750 rounded-lg p-3 transition-colors border group ${
								camera.hidden
									? 'border-slate-700/50 opacity-60'
									: 'border-slate-700 hover:border-slate-600'
							}`}
						>
							<div className="flex items-center gap-3">
								<div className="flex items-center justify-center w-8 h-8 bg-slate-700 rounded-lg">
									<GripVertical className="w-4 h-4 text-slate-400" />
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<div
											className={`w-2 h-2 rounded-full ${
												camera.hidden
													? 'bg-gray-500'
													: 'bg-green-500 animate-pulse'
											}`}
										/>
										<h3
											className={`text-sm truncate ${
												camera.hidden
													? 'text-slate-400 line-through'
													: 'text-white'
											}`}
										>
											{camera.name}
										</h3>
									</div>
								</div>

								<div className="flex items-center gap-1">
									<button
										onClick={() => onToggleCamera?.(camera.i)}
										className={`p-1.5 hover:bg-slate-700 rounded transition-colors ${
											camera.hidden
												? 'opacity-100'
												: 'opacity-0 group-hover:opacity-100'
										}`}
										title={camera.hidden ? 'Show Camera' : 'Hide Camera'}
									>
										{camera.hidden ? (
											<EyeOff className="w-4 h-4 text-orange-400" />
										) : (
											<Eye className="w-4 h-4 text-slate-400" />
										)}
									</button>
									<button
										onClick={() => onRemoveCamera(camera.i)}
										className="p-1.5 hover:bg-red-900/50 rounded transition-colors opacity-0 group-hover:opacity-100"
										title="Remove Camera"
									>
										<Trash2 className="w-4 h-4 text-red-400" />
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* CSS for custom scrollbar */}
			<style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
		</div>
	);
}
