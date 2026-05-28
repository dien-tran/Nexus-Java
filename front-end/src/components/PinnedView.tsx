import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Palette } from 'lucide-react';

export default function PinnedView() {
  // Audio ambient controls states
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(40);
  const [frequency, setFrequency] = useState<'Warm Sine' | 'Soft White Noise' | 'Brown Orbit'>('Warm Sine');
  const [waveSpeed, setWaveSpeed] = useState('Slow Rise');

  // Web Audio Context reference to support true ambient sound playing
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Calming sound generation using native AudioContext
  const startCalmingPitch = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (frequency === 'Warm Sine') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, ctx.currentTime); // Standard low A hum
      } else if (frequency === 'Brown Orbit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, ctx.currentTime); // Lower triangle drone
      } else {
        osc.type = 'sawtooth'; // Soft filters
        osc.frequency.setValueAtTime(90, ctx.currentTime);
      }

      // Gain controls
      gain.gain.setValueAtTime((volume / 100) * 0.1, ctx.currentTime);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();

      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
    } catch (err) {
      console.warn("AudioContext block occurred.", err);
    }
  };

  const stopCalmingPitch = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    } catch (e) {}

    oscillatorRef.current = null;
    audioContextRef.current = null;
    gainNodeRef.current = null;
  };

  const handleSoundToggle = () => {
    if (isPlaying) {
      stopCalmingPitch();
      setIsPlaying(false);
    } else {
      startCalmingPitch();
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime((newVal / 100) * 0.1, audioContextRef.current.currentTime);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 animate-fade-in">
      <section className="bg-[#efe9de] border border-[#e6dfd8] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm relative overflow-hidden">
        {/* Aesthetic design element */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ad5f45]"></div>

        <header className="space-y-1 pb-4 border-b border-[#e1d5c5]">
          <div className="flex items-center gap-2 text-primary">
            <Palette size={20} className="text-[#8f482f]" />
            <h3 className="font-serif text-xl md:text-2xl font-bold uppercase tracking-wider text-[#8f482f]">The Breathing Canvas</h3>
          </div>
          <p className="text-xs font-mono text-ink-muted uppercase block pt-0.5">Focus Sound & Atmosphere Ambient Station</p>
        </header>

        {/* Abstract sine wave illustration */}
        <div className="h-40 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl relative overflow-hidden flex items-center justify-center transition-all duration-300">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#8f482f_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          {/* Wave line pulses */}
          <div className={`flex items-center gap-2 ${isPlaying ? 'animate-pulse' : ''}`}>
            <span className={`w-1.5 bg-[#cc785c] rounded-full transition-all duration-300 ${isPlaying ? 'h-20' : 'h-4'}`}></span>
            <span className={`w-1.5 bg-[#8f482f] rounded-full transition-all duration-300 ${isPlaying ? 'h-32' : 'h-4'}`}></span>
            <span className={`w-1.5 bg-[#e8a55a] rounded-full transition-all duration-300 ${isPlaying ? 'h-16' : 'h-4'}`}></span>
            <span className={`w-1.5 bg-[#8f482f] rounded-full transition-all duration-300 ${isPlaying ? 'h-36' : 'h-4'}`}></span>
            <span className={`w-1.5 bg-[#cc785c] rounded-full transition-all duration-300 ${isPlaying ? 'h-24' : 'h-4'}`}></span>
          </div>

          <span className="absolute bottom-3 right-4 text-[10px] font-mono uppercase tracking-wider text-ink-muted">
            {isPlaying ? 'ACTIVE DRONE LOOP' : 'SOUND IS SILENT'}
          </span>
        </div>

        <p className="text-sm text-ink-muted leading-relaxed font-sans text-center max-w-lg mx-auto">
          A modular, calming backdrop that transforms sound waves into soft color fields. Perfect to maintain deep concentration while reading or writing.
        </p>

        {/* Ambient Synthesizer Parameters */}
        <div className="space-y-6 pt-2">
          {/* Play humid sound toggle */}
          <button
            onClick={handleSoundToggle}
            className={`w-full py-3 rounded-xl text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${isPlaying ? 'bg-[#8f482f] text-white hover:bg-[#a25135]' : 'bg-canvas hover:bg-surface-emphasis border border-border-hairline text-ink'}`}
          >
            {isPlaying ? (
              <>
                <VolumeX size={15} /> Stop Ambient Sound
              </>
            ) : (
              <>
                <Volume2 size={15} /> Play Ambient Hum (Web Audio)
              </>
            )}
          </button>

          <div className="space-y-4 font-mono text-xs pt-4 border-t border-[#e1d5c5]">
            {/* Volume control */}
            <div className="space-y-2">
              <div className="flex justify-between text-ink-muted font-bold tracking-wider uppercase">
                <span>Ambient Volume</span>
                <span>{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-[#8f482f] bg-canvas h-1.5 rounded-lg outline-none cursor-pointer"
              />
            </div>

            {/* Frequencies tuning values */}
            <div className="space-y-2 pt-2">
              <span className="text-ink-muted font-bold tracking-wider uppercase block">Frequency Type</span>
              <div className="grid grid-cols-3 gap-3">
                {(['Warm Sine', 'Soft White Noise', 'Brown Orbit'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setFrequency(type);
                      if (isPlaying) {
                        stopCalmingPitch();
                        setTimeout(() => startCalmingPitch(), 100);
                      }
                    }}
                    className={`p-2.5 rounded-lg text-xs text-center border font-bold transition-all cursor-pointer ${frequency === type ? 'bg-[#8f482f] border-[#8f482f] text-white' : 'bg-canvas hover:bg-surface-card text-ink border-border-hairline'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed selection */}
            <div className="space-y-2 pt-3">
              <span className="text-ink-muted font-bold tracking-wider uppercase block">Wave Ripple Speed</span>
              <div className="flex justify-between items-center bg-canvas border border-border-hairline rounded-xl p-3 text-ink">
                {(['Slow Rise', 'Moderate Wave', 'Fast Ripple'] as const).map((speed) => (
                  <label key={speed} className="flex items-center gap-2 cursor-pointer select-none font-semibold">
                    <input
                      type="radio"
                      name="speed"
                      checked={waveSpeed === speed}
                      onChange={() => setWaveSpeed(speed)}
                      className="accent-[#8f482f] h-3.5 w-3.5"
                    />
                    <span>{speed}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
