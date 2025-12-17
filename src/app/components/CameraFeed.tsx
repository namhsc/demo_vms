import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Settings, 
  X,
  Play,
  Pause,
  Maximize,
  Minimize2
} from 'lucide-react';

interface CameraFeedProps {
  id: string;
  name: string;
  onRemove: (id: string) => void;
}

export function CameraFeed({ id, name, onRemove }: CameraFeedProps) {
  const [isLive, setIsLive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (document.fullscreenElement) {
        setShowControls(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Generate a random pattern for mock video feed
  const generatePattern = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
    <div 
      className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden shadow-xl"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      ref={containerRef}
    >
      {/* Camera Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm text-white">{name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
          <button
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            onClick={() => onRemove(id)}
            title="Remove Camera"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Video Feed Area */}
      <div className="flex-1 relative bg-slate-800" ref={videoContainerRef}>
        <div className="absolute inset-0 flex items-center justify-center">
          {isLive ? (
            <div className="w-full h-full relative">
              <img 
                src={generatePattern()} 
                alt={`Camera ${name}`}
                className="w-full h-full object-cover"
              />
              
              {/* Top Overlay Info */}
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                {isPaused ? 'PAUSED' : 'LIVE'}
              </div>

              {/* Bottom Info - Above Controls */}
              <div className={`absolute left-2 right-2 flex justify-between text-xs text-white font-mono transition-all ${
                showControls ? 'bottom-14' : 'bottom-2'
              }`}>
                <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                  {timestamp.toLocaleTimeString()}
                </div>
                <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                  1920x1080 • 30fps
                </div>
              </div>

              {/* Control Bar - Bottom Fixed */}
              <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <div className="bg-black/80 backdrop-blur-md px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    {/* Left Controls - Play/Pause */}
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                      title={isPaused ? 'Play' : 'Pause'}
                    >
                      {isPaused ? (
                        <Play className="w-4 h-4 text-white" fill="white" />
                      ) : (
                        <Pause className="w-4 h-4 text-white" fill="white" />
                      )}
                    </button>

                    {/* Right Controls - Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                      title="Fullscreen"
                    >
                      <Maximize className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Video className="w-12 h-12" />
              <span className="text-sm">No Signal</span>
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* CSS Fullscreen Modal */}
    {isFullscreen && !document.fullscreenElement && (
      <div 
        className="fixed inset-0 z-50 bg-black flex flex-col"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Fullscreen Camera Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-lg text-white">{name}</span>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="Exit Fullscreen"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Fullscreen Video Area */}
        <div className="flex-1 relative bg-slate-900">
          <div className="absolute inset-0 flex items-center justify-center">
            {isLive ? (
              <div className="w-full h-full relative">
                <img 
                  src={generatePattern()} 
                  alt={`Camera ${name}`}
                  className="w-full h-full object-contain"
                />
                
                {/* Top Overlay Info */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded text-sm text-white">
                  {isPaused ? 'PAUSED' : 'LIVE'}
                </div>

                {/* Bottom Info - Above Controls */}
                <div className={`absolute left-4 right-4 flex justify-between text-sm text-white font-mono transition-all ${
                  showControls ? 'bottom-20' : 'bottom-4'
                }`}>
                  <div className="bg-black/50 backdrop-blur-sm px-3 py-2 rounded">
                    {timestamp.toLocaleTimeString()}
                  </div>
                  <div className="bg-black/50 backdrop-blur-sm px-3 py-2 rounded">
                    1920x1080 • 30fps
                  </div>
                </div>

                {/* Control Bar - Bottom Fixed */}
                <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                  showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                  <div className="bg-black/80 backdrop-blur-md px-6 py-4">
                    <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto">
                      {/* Left Controls - Play/Pause */}
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        title={isPaused ? 'Play' : 'Pause'}
                      >
                        {isPaused ? (
                          <Play className="w-5 h-5 text-white" fill="white" />
                        ) : (
                          <Pause className="w-5 h-5 text-white" fill="white" />
                        )}
                      </button>

                      {/* Right Controls - Exit Fullscreen */}
                      <button
                        onClick={() => setIsFullscreen(false)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        title="Exit Fullscreen"
                      >
                        <Minimize2 className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-500">
                <Video className="w-24 h-24" />
                <span className="text-xl">No Signal</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
