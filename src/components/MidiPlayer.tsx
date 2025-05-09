'use client';

import { useEffect, useRef, useState } from 'react';
import { Synthetizer, Sequencer } from 'spessasynth_lib';

interface Track {
  id: number;
  name: string;
  isMuted: boolean;
  priority: number;
}

export default function MidiPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
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

          // Initialize tracks
          const midiData = sequencerRef.current.midiData;
          console.log('MIDI Data:', midiData);
          console.log('Track Names:', midiData.trackNames);
          console.log('Tracks:', midiData.tracks);
          
          const newTracks: Track[] = [];
          let firstUnmutedTrack = -1; // Track which track should be unmuted first

          // First pass: create all tracks and find the highest priority track
          for (let i = 0; i < midiData.tracksAmount; i++) {
            // Get track name from metadata if available
            let trackName = `Track ${i}`;
            
            // Check for track name in different possible locations
            if (midiData.trackNames && midiData.trackNames[i + 1]) {
              trackName = midiData.trackNames[i + 1];
            } else if (midiData.tracks && midiData.tracks[i + 1]) {
              const track = midiData.tracks[i + 1];
              if (track.name) {
                trackName = track.name;
              }
            }

            // If the track name is empty or just whitespace, use a default name
            if (!trackName || trackName.trim() === '') {
              trackName = `Track ${i}`;
            }

            // Determine track priority for unmuting
            let priority = 2; // Default priority (other instruments)
            const lowerName = trackName.toLowerCase();
            if (lowerName.includes('percussion')) {
              priority = 0; // Highest priority - percussion first
            } else if (lowerName.includes('bass')) {
              priority = 1; // Second priority - bass
            } else if (lowerName.includes('lead')) {
              priority = 3; // Fourth priority - lead
            } else if (lowerName.includes('voice')) {
              priority = 4; // Fifth priority - voice
            } else if (lowerName.includes('melody')) {
              priority = 5; // Lowest priority - melody
            }
            // Other instruments remain at priority 2

            // Find the first track to unmute (highest priority)
            if (firstUnmutedTrack === -1 || priority < newTracks[firstUnmutedTrack].priority) {
              firstUnmutedTrack = i;
            }

            // Create track and set initial mute state (all muted initially)
            const track = {
              id: i,
              name: trackName,
              isMuted: true, // All tracks start muted
              priority
            };
            newTracks.push(track);
          }

          // Second pass: set mute states in synthesizer
          console.log('Setting initial mute states. First unmuted track:', firstUnmutedTrack);
          for (let i = 0; i < newTracks.length; i++) {
            const shouldMute = i !== firstUnmutedTrack;
            console.log(`Track ${i} (${newTracks[i].name}): shouldMute = ${shouldMute}`);
            newTracks[i].isMuted = shouldMute;
            synthRef.current.muteChannel(i, shouldMute);
          }

          console.log('Initialized Tracks:', newTracks);
          setTracks(newTracks);
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

  const toggleMute = (trackId: number) => {
    if (!synthRef.current) return;

    console.log('Toggling mute for track:', trackId);
    setTracks(prevTracks => {
      const newTracks = prevTracks.map(track => {
        if (track.id === trackId) {
          const newMutedState = !track.isMuted;
          console.log(`Setting channel ${trackId} mute state to:`, newMutedState);
          // Mute/unmute the channel
          synthRef.current.muteChannel(trackId, newMutedState);
          return { ...track, isMuted: newMutedState };
        }
        return track;
      });
      return newTracks;
    });
  };

  const handleRestart = () => {
    if (!sequencerRef.current || !synthRef.current) return;

    try {
      // Stop current playback
      sequencerRef.current.stop();
      // Reset to beginning
      sequencerRef.current.currentTime = 0;

      // Reset tracks to initial state (only highest priority track unmuted)
      setTracks(prevTracks => {
        const newTracks = [...prevTracks];
        
        // Find the highest priority track
        const highestPriorityTrack = newTracks.reduce((highest, track, index) => {
          if (highest === -1 || track.priority < newTracks[highest].priority) {
            return index;
          }
          return highest;
        }, -1);

        // Reset all tracks to muted except the highest priority one
        newTracks.forEach((track, index) => {
          const shouldMute = index !== highestPriorityTrack;
          track.isMuted = shouldMute;
          synthRef.current.muteChannel(track.id, shouldMute);
        });

        return newTracks;
      });

      // Start playing
      sequencerRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error restarting playback:', error);
      setError(error instanceof Error ? error.message : 'Error restarting playback');
    }
  };

  const handleMoreInstruments = () => {
    if (!synthRef.current) return;

    console.log('Handling More Instruments click');
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      
      // Sort tracks by priority and current mute state
      const sortedTracks = newTracks
        .map((track, index) => ({ ...track, originalIndex: index }))
        .sort((a, b) => {
          if (a.isMuted !== b.isMuted) return a.isMuted ? -1 : 1;
          return a.priority - b.priority;
        });

      // Find the next track to unmute
      const nextTrackToUnmute = sortedTracks.find(track => track.isMuted);
      
      if (nextTrackToUnmute) {
        console.log('Unmuting track:', nextTrackToUnmute.id);
        // Unmute only one track
        newTracks[nextTrackToUnmute.originalIndex].isMuted = false;
        synthRef.current.muteChannel(nextTrackToUnmute.id, false);
      }

      return newTracks;
    });
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
        <button
          onClick={handleRestart}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          disabled={!sequencerRef.current || isLoading}
        >
          Restart
        </button>
        <button
          onClick={handleMoreInstruments}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          disabled={!sequencerRef.current || isLoading}
        >
          More Instruments
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

      {/* Track Controls */}
      {tracks.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-semibold">Tracks</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {tracks.map((track) => (
              <div 
                key={track.id} 
                className="flex items-center space-x-4 p-3 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                <div className="flex-1 flex items-center space-x-2">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium ${
                    track.priority === 0 ? 'bg-yellow-500 text-white' :
                    track.priority === 1 ? 'bg-green-500 text-white' :
                    track.priority === 2 ? 'bg-blue-500 text-white' :
                    track.priority === 3 ? 'bg-purple-500 text-white' :
                    track.priority === 4 ? 'bg-pink-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {track.priority + 1}
                  </span>
                  <span className="font-medium text-gray-800">{track.name}</span>
                </div>
                <button
                  onClick={() => toggleMute(track.id)}
                  className={`px-4 py-2 rounded transition-colors ${
                    track.isMuted 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                  }`}
                >
                  {track.isMuted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Unmuting Order:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-yellow-500 rounded-full"></span>
                <span>Percussion</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                <span>Bass</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                <span>Other Instruments</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-purple-500 rounded-full"></span>
                <span>Lead</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-pink-500 rounded-full"></span>
                <span>Voice</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-gray-500 rounded-full"></span>
                <span>Melody</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
} 