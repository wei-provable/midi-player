'use client';

import { useEffect, useRef, useState } from 'react';
import { Synthetizer, Sequencer } from 'spessasynth_lib';
import Fuse from 'fuse.js';

interface Track {
  id: number;
  name: string;
  isMuted: boolean;
  priority: number;
}

// Common game name variations
const gameNameVariations: { [key: string]: string[] } = {
  'mario': ['super mario', 'super mario bros', 'mario bros', 'mario brothers'],
  'zelda': ['legend of zelda', 'zelda', 'the legend of zelda'],
  'metroid': ['metroid', 'metroid prime'],
  'pokemon': ['pokemon', 'pokémon', 'pocket monsters'],
  'sonic': ['sonic the hedgehog', 'sonic', 'sonic hedgehog'],
  'final fantasy': ['final fantasy', 'ff'],
  'street fighter': ['street fighter', 'sf'],
  'mortal kombat': ['mortal kombat', 'mk'],
  'donkey kong': ['donkey kong', 'dk'],
  'castlevania': ['castlevania', 'vampire killer'],
  'megaman': ['megaman', 'mega man', 'rockman'],
  'contra': ['contra', 'probotector'],
  'tetris': ['tetris', 'tetris classic'],
  'pacman': ['pacman', 'pac-man', 'pac man'],
  'space invaders': ['space invaders', 'spaceinvaders'],
  'galaga': ['galaga', 'galaxian'],
  'frogger': ['frogger', 'frog'],
  'dig dug': ['dig dug', 'digdug'],
  'qbert': ['qbert', 'q-bert', 'q bert'],
  'bubble bobble': ['bubble bobble', 'bubblebobble'],
};

// Function to get all variations of a game name
const getGameVariations = (gameName: string): string[] => {
  const lowerName = gameName.toLowerCase();
  const variations = new Set<string>([lowerName]);
  
  // Add known variations
  Object.entries(gameNameVariations).forEach(([key, variants]) => {
    if (lowerName.includes(key)) {
      variants.forEach(variant => variations.add(variant));
    }
  });
  
  // Add common transformations
  variations.add(lowerName.replace(/[^a-z0-9]/g, '')); // Remove special characters
  variations.add(lowerName.replace(/\s+/g, '')); // Remove spaces
  variations.add(lowerName.replace(/\s+/g, '-')); // Replace spaces with hyphens
  
  // Add more variations
  const words = lowerName.split(/\s+/);
  if (words.length > 1) {
    // Add variations with different word orders
    variations.add(words.reverse().join(' '));
    variations.add(words.join(''));
    variations.add(words.join('-'));
  }
  
  // Add common abbreviations
  if (lowerName.includes('super')) variations.add(lowerName.replace('super', 's'));
  if (lowerName.includes('mario')) variations.add('mario');
  if (lowerName.includes('bros')) variations.add(lowerName.replace('bros', 'brothers'));
  if (lowerName.includes('brothers')) variations.add(lowerName.replace('brothers', 'bros'));
  
  // Add partial matches
  words.forEach(word => {
    if (word.length > 3) {
      variations.add(word);
    }
  });
  
  return Array.from(variations);
};

// Add styles for the disco background
const discoStyles = {
  container: {
    position: 'relative' as const,
    minHeight: '100vh',
    overflow: 'hidden',
  },
  background: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    transition: 'background-color 0.1s ease',
  },
  content: {
    position: 'relative' as const,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '1rem',
    padding: '2rem',
    margin: '2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  }
};

export default function MidiPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(5);
  const [prize, setPrize] = useState(10);
  const [gameName, setGameName] = useState('');
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [showTracks, setShowTracks] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const synthRef = useRef<any>(null);
  const sequencerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('Initializing audio...');
        // Initialize AudioContext
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        console.log('Loading audio worklet...');
        // Load the audio worklet from public directory
        const workletPath = '/audio/worklet_processor.min.js';
        console.log('Loading worklet from:', workletPath);
        await audioContextRef.current.audioWorklet.addModule(workletPath);
        
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

  // Function to load a random MIDI file
  const loadRandomMidiFile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowTracks(false); // Ensure tracks are hidden when loading new MIDI

      // Fetch the list of MIDI files
      const response = await fetch('/api/midi-files');
      const files = await response.json();
      
      if (!files.length) {
        throw new Error('No MIDI files found in the MIDIs folder');
      }

      // Select a random file
      const randomFile = files[Math.floor(Math.random() * files.length)];
      console.log('Loading MIDI file:', randomFile);
      setCurrentFile(randomFile);

      // Fetch the MIDI file
      const midiResponse = await fetch(`/MIDIs/${randomFile}`);
      const arrayBuffer = await midiResponse.arrayBuffer();
      
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
          console.log('\nMIDI Data Structure:');
          console.log('Full MIDI Data:', midiData);
          console.log('Track Names Array:', midiData.trackNames);
          console.log('Tracks Array:', midiData.tracks);
          console.log('Total Tracks:', midiData.tracksAmount);
          
          // Log all available properties
          console.log('\nAvailable MIDI Data Properties:');
          Object.keys(midiData).forEach(key => {
            console.log(`${key}:`, midiData[key]);
          });
          
          const newTracks: Track[] = [];
          let firstUnmutedTrack = -1; // Track which track should be unmuted first

          // First pass: create all tracks and find the highest priority track
          for (let i = 0; i < midiData.tracksAmount; i++) {
            console.log(`\nProcessing Track ${i}:`);
            
            // Get track name from metadata if available
            let trackName = `Track ${i}`;
            
            // Log all possible track name sources
            console.log('Track Name Sources:', {
              trackNamesIndex: i,
              trackNamesValue: midiData.trackNames?.[i],
              tracksIndex: i,
              tracksValue: midiData.tracks?.[i],
              tracksName: midiData.tracks?.[i]?.name,
              trackChannel: midiData.tracks?.[i]?.channel
            });
            
            // Check for track name in different possible locations
            if (midiData.trackNames && midiData.trackNames[i]) {
              trackName = midiData.trackNames[i];
              console.log(`Found track name in trackNames[${i}]:`, trackName);
            } else if (midiData.tracks && midiData.tracks[i]) {
              const track = midiData.tracks[i];
              if (track.name) {
                trackName = track.name;
                console.log(`Found track name in tracks[${i}].name:`, trackName);
              }
            }

            // If the track name is empty or just whitespace, use a default name
            if (!trackName || trackName.trim() === '') {
              trackName = `Track ${i}`;
              console.log(`Using default track name for track ${i}:`, trackName);
            }

            // Determine track priority for unmuting
            let priority = 2; // Default priority (other instruments)
            const lowerName = trackName.toLowerCase();
            if (lowerName.includes('percussion')) {
              priority = 0; // Highest priority - percussion first
            } else if (lowerName.includes('bass')) {
              priority = 1; // Second priority - bass
            } else if (lowerName.includes('guitar')) {
              priority = 3; // Lower priority than other instruments
            } else if (lowerName.includes('lead')) {
              priority = 4; // Fourth priority - lead
            } else if (lowerName.includes('voice')) {
              priority = 5; // Fifth priority - voice
            } else if (lowerName.includes('melody')) {
              priority = 6; // Lowest priority - melody
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
            
            console.log(`Created Track ${i}:`, {
              id: track.id,
              name: track.name,
              priority: track.priority,
              isMuted: track.isMuted,
              channelIndex: i,
              midiChannel: i + 1,
              originalChannel: midiData.tracks?.[i]?.channel
            });
          }

          // Sort tracks by priority for logging
          const sortedTracks = [...newTracks].sort((a, b) => a.priority - b.priority);
          console.log('\n=== UNMUTE ORDER ===');
          console.log('Tracks will be unmuted in this sequence:');
          sortedTracks.forEach((track, index) => {
            const priorityName = 
              track.priority === 0 ? 'PERCUSSION' :
              track.priority === 1 ? 'BASS' :
              track.priority === 2 ? 'OTHER INSTRUMENTS' :
              track.priority === 3 ? 'GUITAR' :
              track.priority === 4 ? 'LEAD' :
              track.priority === 5 ? 'VOICE' :
              'MELODY';
            
            console.log(`${index + 1}. ${track.name} (${priorityName}, Channel: ${track.id})`);
          });
          console.log('===================\n');

          // Second pass: set mute states in synthesizer
          console.log('\nInitial State:');
          for (let i = 0; i < newTracks.length; i++) {
            const shouldMute = i !== firstUnmutedTrack;
            const channelIndex = i;  // Use track index directly
            console.log(`Track ${i} (${newTracks[i].name}):`, {
              isMuted: shouldMute,
              channelIndex,
              midiChannel: channelIndex + 1
            });
            newTracks[i].isMuted = shouldMute;
            synthRef.current.muteChannel(channelIndex, shouldMute);
          }

          console.log('\nFinal Track Configuration:');
          newTracks.forEach((track, index) => {
            console.log(`Track ${index}:`, {
              id: track.id,
              name: track.name,
              priority: track.priority,
              isMuted: track.isMuted,
              channelIndex: track.id,  // Use track ID directly
              midiChannel: track.id + 1
            });
          });

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

  // Load a random MIDI file when the component mounts
  useEffect(() => {
    loadRandomMidiFile();
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
          console.log('\nMIDI Data Structure:');
          console.log('Full MIDI Data:', midiData);
          console.log('Track Names Array:', midiData.trackNames);
          console.log('Tracks Array:', midiData.tracks);
          console.log('Total Tracks:', midiData.tracksAmount);
          
          // Log all available properties
          console.log('\nAvailable MIDI Data Properties:');
          Object.keys(midiData).forEach(key => {
            console.log(`${key}:`, midiData[key]);
          });
          
          const newTracks: Track[] = [];
          let firstUnmutedTrack = -1; // Track which track should be unmuted first

          // First pass: create all tracks and find the highest priority track
          for (let i = 0; i < midiData.tracksAmount; i++) {
            console.log(`\nProcessing Track ${i}:`);
            
            // Get track name from metadata if available
            let trackName = `Track ${i}`;
            
            // Log all possible track name sources
            console.log('Track Name Sources:', {
              trackNamesIndex: i,
              trackNamesValue: midiData.trackNames?.[i],
              tracksIndex: i,
              tracksValue: midiData.tracks?.[i],
              tracksName: midiData.tracks?.[i]?.name,
              trackChannel: midiData.tracks?.[i]?.channel
            });
            
            // Check for track name in different possible locations
            if (midiData.trackNames && midiData.trackNames[i]) {
              trackName = midiData.trackNames[i];
              console.log(`Found track name in trackNames[${i}]:`, trackName);
            } else if (midiData.tracks && midiData.tracks[i]) {
              const track = midiData.tracks[i];
              if (track.name) {
                trackName = track.name;
                console.log(`Found track name in tracks[${i}].name:`, trackName);
              }
            }

            // If the track name is empty or just whitespace, use a default name
            if (!trackName || trackName.trim() === '') {
              trackName = `Track ${i}`;
              console.log(`Using default track name for track ${i}:`, trackName);
            }

            // Determine track priority for unmuting
            let priority = 2; // Default priority (other instruments)
            const lowerName = trackName.toLowerCase();
            if (lowerName.includes('percussion')) {
              priority = 0; // Highest priority - percussion first
            } else if (lowerName.includes('bass')) {
              priority = 1; // Second priority - bass
            } else if (lowerName.includes('guitar')) {
              priority = 3; // Lower priority than other instruments
            } else if (lowerName.includes('lead')) {
              priority = 4; // Fourth priority - lead
            } else if (lowerName.includes('voice')) {
              priority = 5; // Fifth priority - voice
            } else if (lowerName.includes('melody')) {
              priority = 6; // Lowest priority - melody
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
            
            console.log(`Created Track ${i}:`, {
              id: track.id,
              name: track.name,
              priority: track.priority,
              isMuted: track.isMuted,
              channelIndex: i,
              midiChannel: i + 1,
              originalChannel: midiData.tracks?.[i]?.channel
            });
          }

          // Sort tracks by priority for logging
          const sortedTracks = [...newTracks].sort((a, b) => a.priority - b.priority);
          console.log('\n=== UNMUTE ORDER ===');
          console.log('Tracks will be unmuted in this sequence:');
          sortedTracks.forEach((track, index) => {
            const priorityName = 
              track.priority === 0 ? 'PERCUSSION' :
              track.priority === 1 ? 'BASS' :
              track.priority === 2 ? 'OTHER INSTRUMENTS' :
              track.priority === 3 ? 'GUITAR' :
              track.priority === 4 ? 'LEAD' :
              track.priority === 5 ? 'VOICE' :
              'MELODY';
            
            console.log(`${index + 1}. ${track.name} (${priorityName}, Channel: ${track.id})`);
          });
          console.log('===================\n');

          // Second pass: set mute states in synthesizer
          console.log('\nInitial State:');
          for (let i = 0; i < newTracks.length; i++) {
            const shouldMute = i !== firstUnmutedTrack;
            const channelIndex = i;
            console.log(`Track ${i} (${newTracks[i].name}):`, {
              isMuted: shouldMute,
              channelIndex,
              midiChannel: channelIndex + 1,
              originalChannel: midiData.tracks?.[i]?.channel
            });
            newTracks[i].isMuted = shouldMute;
            synthRef.current.muteChannel(channelIndex, shouldMute);
          }

          console.log('\nFinal Track Configuration:');
          newTracks.forEach((track, index) => {
            console.log(`Track ${index}:`, {
              id: track.id,
              name: track.name,
              priority: track.priority,
              isMuted: track.isMuted,
              channelIndex: track.id,
              midiChannel: track.id + 1
            });
          });

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
    try {
      if (!sequencerRef.current?.midiData) {
        setCurrentTime(0);
        return;
      }
      const time = sequencerRef.current.currentTime;
      if (typeof time === 'number' && !isNaN(time)) {
        setCurrentTime(time);
      }
    } catch (error) {
      // Silently handle the error without displaying it
      setCurrentTime(0);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (sequencerRef.current?.midiData) {
      intervalId = setInterval(handleTimeUpdate, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [sequencerRef.current?.midiData]);

  const toggleMute = (trackId: number) => {
    if (!synthRef.current) return;

    // Subtract 1 to fix the offset
    const channelIndex = trackId - 1;
    
    console.log('\nMute State Change:');
    console.log('Track:', {
      id: trackId,
      name: tracks[trackId]?.name,
      currentMuteState: tracks[trackId]?.isMuted,
      channelIndex
    });

    setTracks(prevTracks => {
      const newTracks = prevTracks.map(track => {
        if (track.id === trackId) {
          const newMutedState = !track.isMuted;
          
          // Verify current state
          const currentChannelState = synthRef.current.getChannelState?.(channelIndex);
          const isCurrentlyMuted = synthRef.current.isChannelMuted?.(channelIndex);
          console.log('Current Channel State:', {
            channel: channelIndex,
            state: currentChannelState,
            isMuted: isCurrentlyMuted,
            expectedMuted: track.isMuted
          });

          // Mute/unmute the channel using the adjusted index
          synthRef.current.muteChannel(channelIndex, newMutedState);
          
          // Verify new state
          const newChannelState = synthRef.current.getChannelState?.(channelIndex);
          const isNowMuted = synthRef.current.isChannelMuted?.(channelIndex);
          console.log('New Channel State:', {
            channel: channelIndex,
            state: newChannelState,
            isMuted: isNowMuted,
            expectedMuted: newMutedState
          });

          // Verify the states match
          if (isNowMuted !== newMutedState) {
            console.warn('Mute state mismatch!', {
              trackId,
              channelIndex,
              buttonState: newMutedState,
              channelState: isNowMuted
            });
            // Try to fix the mismatch
            synthRef.current.muteChannel(channelIndex, newMutedState);
          }
          
          return { ...track, isMuted: newMutedState };
        }
        return track;
      });
      return newTracks;
    });
  };

  // Update verifyTrackStates to use the correct channel index
  const verifyTrackStates = (tracks: Track[]) => {
    console.log('\nVerifying Track States:');
    tracks.forEach(track => {
      const channelIndex = track.id - 1;  // Subtract 1 to fix the offset
      const isChannelMuted = synthRef.current.isChannelMuted?.(channelIndex);
      if (isChannelMuted !== track.isMuted) {
        console.warn('Initial state mismatch:', {
          track: track.name,
          trackId: track.id,
          channelIndex,
          buttonState: track.isMuted,
          channelState: isChannelMuted
        });
        // Fix the mismatch
        synthRef.current.muteChannel(channelIndex, track.isMuted);
      }
    });
  };

  // Add verification after tracks are initialized
  useEffect(() => {
    if (tracks.length > 0 && synthRef.current) {
      verifyTrackStates(tracks);
    }
  }, [tracks]);

  // Add periodic verification
  useEffect(() => {
    const interval = setInterval(() => {
      if (tracks.length > 0 && synthRef.current) {
        verifyTrackStates(tracks);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [tracks]);

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
    if (!synthRef.current || tokenBalance <= 0) return;  // Add token balance check

    console.log('Handling More Instruments click');
    // Reduce token balance by 1 first, before unmuting any tracks
    setTokenBalance(prev => Math.max(0, prev - 1));
    // Reduce prize by 2
    setPrize(prev => Math.max(0, prev - 2));
    console.log('Token balance reduced by 1, Prize reduced by 2');

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
      } else {
        console.log('No more tracks to unmute');
      }

      return newTracks;
    });
  };

  const handleGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !currentFile) return;
    
    // Get the MIDI filename without extension and clean it
    const midiName = currentFile.replace(/\.midi?$/i, '').toLowerCase();
    const inputName = gameName.trim().toLowerCase();
    
    // Get all variations of the input name
    const inputVariations = getGameVariations(inputName);
    
    // Configure Fuse for fuzzy matching with more lenient settings
    const fuse = new Fuse(inputVariations, {
      includeScore: true,
      threshold: 0.6, // More lenient threshold
      keys: ['name'],
      minMatchCharLength: 2, // Allow shorter matches
      location: 0,
      distance: 100, // Allow more distance between characters
      ignoreLocation: true, // Don't care about where the match occurs
      useExtendedSearch: true
    });
    
    // Check if any variation matches the MIDI filename
    const results = fuse.search(midiName);
    const bestMatch = results[0];
    
    // More lenient matching threshold
    const isSimilar = bestMatch && bestMatch.score && bestMatch.score < 0.8;
    
    setGameResult(isSimilar ? "YOU WON! 🎉" : "YOU LOST :(");
    console.log('Game name submitted:', gameName);
    console.log('MIDI file:', midiName);
    console.log('Input variations:', inputVariations);
    console.log('Best match score:', bestMatch?.score);
    console.log('Result:', isSimilar ? 'Win' : 'Loss');
  };

  // Function to create disco colors based on audio level
  const getDiscoColor = (level: number) => {
    const hue = (Date.now() / 20) % 360; // Rotate through hues
    const saturation = 100;
    const lightness = 50 + (level * 20); // Vary lightness with audio level
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Function to analyze audio and update background
  const analyzeAudio = () => {
    if (!analyserRef.current || !backgroundRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average audio level
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255; // Normalize to 0-1
    setAudioLevel(normalizedLevel);

    // Update background color
    backgroundRef.current.style.backgroundColor = getDiscoColor(normalizedLevel);

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  // Set up audio analysis when audio context is initialized
  useEffect(() => {
    if (audioContextRef.current && synthRef.current) {
      // Create analyzer node
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Connect synthesizer to analyzer
      synthRef.current.worklet.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      // Start analysis
      analyzeAudio();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [audioContextRef.current, synthRef.current]);

  // Only show non-currentTime related errors
  const displayError = error && !error.includes('currentTime');

  return (
    <div style={discoStyles.container}>
      <div ref={backgroundRef} style={discoStyles.background} />
      <div style={discoStyles.content}>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={loadRandomMidiFile}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load Random MIDI'}
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
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={!sequencerRef.current || isLoading || tokenBalance <= 0}
            >
              More Instruments
            </button>
          </div>
          
          {/* Token Balance Panel */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Token Balance</h3>
              <div className="text-2xl font-bold text-blue-600">{tokenBalance}</div>
            </div>
          </div>

          {/* Prize Panel */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Prize</h3>
              <div className="text-2xl font-bold text-green-600">{prize}</div>
            </div>
          </div>

          {/* Game Name Input */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <form onSubmit={handleGameSubmit} className="flex flex-col space-y-2">
              <label htmlFor="gameName" className="text-lg font-semibold text-gray-800">
                Which retro game?
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="gameName"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Enter retro game name..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Submit
                </button>
              </div>
              {gameResult && (
                <div className={`mt-2 text-lg font-bold ${gameResult.includes('WON') ? 'text-green-600' : 'text-red-600'}`}>
                  {gameResult}
                </div>
              )}
            </form>
          </div>
          
          {/* Error Display */}
          {displayError && (
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Tracks</h3>
                <button
                  onClick={() => setShowTracks(!showTracks)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  {showTracks ? 'Hide Tracks' : 'Show Tracks'}
                </button>
              </div>
              {showTracks && (
                <>
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
                        <span>Guitar</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-4 h-4 bg-pink-500 rounded-full"></span>
                        <span>Lead</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-4 h-4 bg-gray-500 rounded-full"></span>
                        <span>Voice</span>
                      </li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 