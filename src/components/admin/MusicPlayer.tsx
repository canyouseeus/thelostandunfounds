import { useEffect, useRef, useState, useCallback } from 'react';
import {
    PlayIcon,
    PauseIcon,
    ForwardIcon,
    BackwardIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    MusicalNoteIcon,
    PlusIcon,
    XMarkIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';

interface Track {
    id: string;
    title: string;
    artist: string;
    file_id: string;
    duration: number | null;
    source_url: string | null;
    created_at: string;
}

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);

    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [showYtInput, setShowYtInput] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [muted, setMuted] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');
    const [downloadStatus, setDownloadStatus] = useState('');

    const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

    const loadTracks = useCallback(async () => {
        const { data } = await supabase
            .from('admin_playlist')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setTracks(data as Track[]);
    }, []);

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMetadata = () => setDuration(audio.duration);
        const onEnded = () => {
            setIsPlaying(false);
            if (currentIndex < tracks.length - 1) {
                setCurrentIndex(currentIndex + 1);
            }
        };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
        };
    }, [currentIndex, tracks.length]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;
        audio.src = `/api/music/stream?fileId=${currentTrack.file_id}`;
        audio.load();
        audio.play().catch(() => setIsPlaying(false));
    }, [currentTrack?.file_id]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = muted ? 0 : volume;
    }, [volume, muted]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (!currentTrack && tracks.length > 0) {
            setCurrentIndex(0);
            return;
        }
        if (audio.paused) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    };

    const skipNext = () => {
        if (currentIndex < tracks.length - 1) setCurrentIndex(currentIndex + 1);
    };

    const skipPrev = () => {
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
        } else if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const t = (parseFloat(e.target.value) / 100) * duration;
        audio.currentTime = t;
        setCurrentTime(t);
    };

    const handleDownload = async () => {
        if (!youtubeUrl.trim()) return;
        setIsDownloading(true);
        setDownloadError('');
        setDownloadStatus('Downloading…');

        try {
            const res = await fetch('/api/admin/youtube-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: youtubeUrl.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Download failed');
            setYoutubeUrl('');
            setShowYtInput(false);
            setDownloadStatus('');
            await loadTracks();
        } catch (err: any) {
            setDownloadError(err.message);
            setDownloadStatus('');
        } finally {
            setIsDownloading(false);
        }
    };

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <>
            <audio ref={audioRef} crossOrigin="anonymous" preload="metadata" />

            {/* Playlist panel */}
            {showPlaylist && (
                <div className="fixed bottom-16 left-0 right-0 z-50 bg-black border-t border-white/10 max-h-72 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                        <span className="text-xs uppercase tracking-widest text-white/60 font-inter">Playlist</span>
                        <button
                            onClick={() => setShowPlaylist(false)}
                            className="text-white/50 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {tracks.length === 0 ? (
                        <div className="px-4 py-6 text-center text-white/40 text-sm font-inter">
                            No tracks yet. Add one via YouTube below.
                        </div>
                    ) : (
                        tracks.map((track, i) => (
                            <button
                                key={track.id}
                                onClick={() => { setCurrentIndex(i); setShowPlaylist(false); }}
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 ${i === currentIndex ? 'bg-white/10' : ''}`}
                            >
                                {i === currentIndex && isPlaying ? (
                                    <MusicalNoteIcon className="w-4 h-4 text-white shrink-0 animate-pulse" />
                                ) : (
                                    <span className="w-4 text-center text-white/30 text-xs shrink-0">{i + 1}</span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm text-white truncate font-inter">{track.title}</div>
                                    {track.artist && (
                                        <div className="text-xs text-white/50 truncate font-inter">{track.artist}</div>
                                    )}
                                </div>
                                {track.duration && (
                                    <span className="text-xs text-white/40 shrink-0 font-inter">{formatTime(track.duration)}</span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* YouTube input panel */}
            {showYtInput && (
                <div className="fixed bottom-16 left-0 right-0 z-50 bg-black border-t border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="url"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                            placeholder="Paste YouTube URL…"
                            className="flex-1 bg-white/5 border border-white/20 text-white text-sm px-3 py-2 rounded-none outline-none focus:border-white/50 font-inter placeholder:text-white/30"
                            disabled={isDownloading}
                        />
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || !youtubeUrl.trim()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white text-black text-sm font-medium font-inter hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            {isDownloading ? downloadStatus || 'Downloading…' : 'Download'}
                        </button>
                        <button
                            onClick={() => { setShowYtInput(false); setDownloadError(''); setYoutubeUrl(''); }}
                            className="text-white/50 hover:text-white transition-colors px-1"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {downloadError && (
                        <p className="mt-2 text-xs text-red-400 font-inter">{downloadError}</p>
                    )}
                </div>
            )}

            {/* Main player bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/10 select-none">
                {/* Progress bar */}
                <div className="relative h-0.5 bg-white/10 cursor-pointer group">
                    <div
                        className="absolute top-0 left-0 h-full bg-white transition-all duration-100"
                        style={{ width: `${progressPct}%` }}
                    />
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={progressPct}
                        onChange={seek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>

                <div className="flex items-center px-4 h-14 gap-4">
                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                        {currentTrack ? (
                            <div>
                                <div className="text-sm text-white truncate font-inter leading-tight">{currentTrack.title}</div>
                                {currentTrack.artist && (
                                    <div className="text-xs text-white/50 truncate font-inter leading-tight">{currentTrack.artist}</div>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-white/30 font-inter uppercase tracking-widest">
                                {tracks.length > 0 ? 'Select a track' : 'No tracks'}
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={skipPrev}
                            disabled={currentIndex <= 0 && (!audioRef.current || audioRef.current.currentTime <= 3)}
                            className="text-white/70 hover:text-white transition-colors disabled:opacity-30"
                        >
                            <BackwardIcon className="w-5 h-5" />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-9 h-9 flex items-center justify-center bg-white text-black hover:bg-white/90 transition-colors"
                        >
                            {isPlaying
                                ? <PauseIcon className="w-5 h-5" />
                                : <PlayIcon className="w-5 h-5" />
                            }
                        </button>

                        <button
                            onClick={skipNext}
                            disabled={currentIndex >= tracks.length - 1}
                            className="text-white/70 hover:text-white transition-colors disabled:opacity-30"
                        >
                            <ForwardIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Time */}
                    <div className="text-xs text-white/40 font-inter tabular-nums w-20 text-center hidden sm:block">
                        {formatTime(currentTime)} / {formatTime(duration || currentTrack?.duration || 0)}
                    </div>

                    {/* Volume */}
                    <div className="items-center gap-1.5 hidden sm:flex">
                        <button
                            onClick={() => setMuted(!muted)}
                            className="text-white/60 hover:text-white transition-colors"
                        >
                            {muted || volume === 0
                                ? <SpeakerXMarkIcon className="w-4 h-4" />
                                : <SpeakerWaveIcon className="w-4 h-4" />
                            }
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.02}
                            value={muted ? 0 : volume}
                            onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                            className="w-20 accent-white cursor-pointer"
                        />
                    </div>

                    {/* Extra controls */}
                    <div className="flex items-center gap-2 ml-1">
                        <button
                            onClick={() => { setShowYtInput(!showYtInput); setShowPlaylist(false); }}
                            className="text-white/50 hover:text-white transition-colors"
                            title="Add from YouTube"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { setShowPlaylist(!showPlaylist); setShowYtInput(false); }}
                            className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-xs font-inter"
                            title="Toggle playlist"
                        >
                            {showPlaylist
                                ? <ChevronDownIcon className="w-4 h-4" />
                                : <ChevronUpIcon className="w-4 h-4" />
                            }
                            <span className="hidden sm:inline">{tracks.length}</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
