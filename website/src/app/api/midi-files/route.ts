import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const midiDir = path.join(process.cwd(), 'public', 'MIDIs');
    
    // Check if directory exists
    if (!fs.existsSync(midiDir)) {
      return NextResponse.json([], { status: 200 });
    }

    // Read directory contents
    const files = fs.readdirSync(midiDir);
    
    // Filter for .mid and .midi files
    const midiFiles = files.filter(file => 
      file.toLowerCase().endsWith('.mid') || 
      file.toLowerCase().endsWith('.midi')
    );

    return NextResponse.json(midiFiles);
  } catch (error) {
    console.error('Error reading MIDI files:', error);
    return NextResponse.json(
      { error: 'Failed to read MIDI files' },
      { status: 500 }
    );
  }
} 