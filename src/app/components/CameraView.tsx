import React, { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface CameraViewProps {
	className?: string;
}

const CameraView: React.FC<CameraViewProps> = ({ className = '' }) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Khởi tạo webcam stream
	useEffect(() => {
		const initCamera = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Yêu cầu quyền truy cập webcam
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: {
						width: { ideal: 1280 },
						height: { ideal: 720 },
					},
					audio: false,
				});

				setStream(mediaStream);

				// Gán stream vào video element
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
					videoRef.current.onloadedmetadata = () => {
						setIsLoading(false);
					};
				}
			} catch (err) {
				console.error('Lỗi khi truy cập webcam:', err);
				setError(
					err instanceof Error
						? err.message
						: 'Không thể truy cập webcam. Vui lòng kiểm tra quyền truy cập.',
				);
				setIsLoading(false);
			}
		};

		initCamera();

		// Cleanup: dừng stream khi component unmount
		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				const mediaStream = videoRef.current.srcObject as MediaStream;
				mediaStream.getTracks().forEach((track) => track.stop());
				videoRef.current.srcObject = null;
			}
		};
	}, []);

	return (
		<div
			className={`relative w-full h-full bg-slate-900 rounded-lg overflow-hidden ${className}`}
		>
			{error ? (
				<div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
					<div className="text-center">
						<p className="text-lg font-semibold mb-2 text-red-400">Lỗi</p>
						<p className="text-sm">{error}</p>
					</div>
				</div>
			) : (
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
					}}
					doubleClick={{
						disabled: false,
						mode: 'zoomIn',
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
									{isLoading && (
										<div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
											<div className="text-slate-400">Đang tải camera...</div>
										</div>
									)}
									<video
										ref={videoRef}
										autoPlay
										playsInline
										muted
										className="w-full h-full object-contain"
										style={{
											objectFit: 'contain',
										}}
									/>
								</div>
							</TransformComponent>
							{/* UI Controls */}
							<div className="absolute top-4 right-4 z-10 flex gap-2">
								<button
									onClick={() => zoomIn()}
									className="p-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg shadow-lg transition-colors"
									title="Phóng to"
								>
									<ZoomIn className="w-5 h-5" />
								</button>
								<button
									onClick={() => zoomOut()}
									className="p-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg shadow-lg transition-colors"
									title="Thu nhỏ"
								>
									<ZoomOut className="w-5 h-5" />
								</button>
								<button
									onClick={() => resetTransform()}
									className="p-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg shadow-lg transition-colors"
									title="Đặt lại"
								>
									<RotateCcw className="w-5 h-5" />
								</button>
							</div>
						</>
					)}
				</TransformWrapper>
			)}
		</div>
	);
};

export default CameraView;

