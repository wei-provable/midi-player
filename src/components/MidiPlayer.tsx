'use client';

import { useEffect, useRef, useState } from 'react';
import { Synthetizer, Sequencer } from 'spessasynth_lib';

export default function MidiPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const synthRef = useRef<any>(null);
  const sequencerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('Initializing audio...');
        // Initialize AudioContext
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        console.log('Loading audio worklet...');
        // Load the audio worklet from node_modules
        await audioContextRef.current.audioWorklet.addModule('/node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js');
        
        console.log('Loading soundfont...');
        // Load the SoundFont file
        const response = await fetch('/GeneralUser GS v1.471.sf2');
        const soundFontBuffer = await response.arrayBuffer();
        
        console.log('Initializing synthesizer...');
        // Initialize SpessaSynth with AudioContext and SoundFont
        synthRef.current = new Synthetizer(audioContextRef.current.destination, soundFontBuffer, true);
        
        // Connect the synthesizer to the audio context
        synthRef.current.worklet.connect(audioContextRef.current.destination);
        
        console.log('Audio initialization complete!');
      } catch (error) {
        console.error('Error initializing audio:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initAudio();

    return () => {
      if (sequencerRef.current) {
        sequencerRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.destroy();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !synthRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading MIDI file:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      
      // Create a new sequencer with the MIDI file
      if (sequencerRef.current) {
        console.log('Stopping previous sequencer...');
        sequencerRef.current.stop();
      }
      
      console.log('Creating new sequencer...');
      sequencerRef.current = new Sequencer([{ binary: arrayBuffer }], synthRef.current, {
        skipToFirstNoteOn: true,
        autoPlay: false,
        preservePlaybackState: true
      });

      // Wait for MIDI data to be loaded
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total
      const checkDuration = () => {
        if (sequencerRef.current && sequencerRef.current.duration !== 99999) {
          console.log('MIDI data loaded, duration:', sequencerRef.current.duration);
          setDuration(sequencerRef.current.duration);
          setIsPlaying(false);
          setIsLoading(false);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkDuration, 100);
        } else {
          console.error('Failed to load MIDI data');
          setError('Failed to load MIDI data');
          setIsLoading(false);
        }
      };
      checkDuration();
    } catch (error) {
      console.error('Error loading MIDI file:', error);
      setError(error instanceof Error ? error.message : 'Error loading MIDI file');
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (!sequencerRef.current || !audioContextRef.current) return;

    try {
      // Resume the AudioContext if it's suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (isPlaying) {
        console.log('Pausing playback...');
        sequencerRef.current.pause();
      } else {
        console.log('Starting playback...');
        sequencerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling playback:', error);
      setError(error instanceof Error ? error.message : 'Error controlling playback');
    }
  };

  const handleTimeUpdate = () => {
    if (!sequencerRef.current) return;
    setCurrentTime(sequencerRef.current.currentTime);
  };

  useEffect(() => {
    const interval = setInterval(handleTimeUpdate, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <input
          type="file"
          accept=".mid,.midi"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Select MIDI File'}
        </button>
        <button
          onClick={togglePlay}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={!sequencerRef.current || isLoading}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{
            width: `${(currentTime / duration) * 100}%`,
          }}
        />
      </div>
      
      <div className="text-sm text-gray-600">
        {Math.floor(currentTime)}s / {Math.floor(duration)}s
      </div>
    </div>
  );
} 