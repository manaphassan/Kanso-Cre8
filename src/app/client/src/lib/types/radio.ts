export interface CassetteRadioStation {
  id: string;
  name: string;
  genre: string;
  frequency: string;
  streamUrl: string;
  shellColor: string;
  labelColor: string;
  accentColor: string;
  description: string;
}

export interface RadioPlaybackState {
  currentStationId: string;
  isPlaying: boolean;
  isBuffering: boolean;
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  currentTrackTitle: string;
  spoolRotation: number;
  tapeSide: 'A' | 'B';
  sessionElapsedSeconds: number;
}
