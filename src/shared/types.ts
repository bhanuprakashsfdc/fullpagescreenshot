export type CaptureFormat = 'png' | 'jpeg' | 'webp';

export interface ScreenshotSettings {
  format: CaptureFormat;
  quality: number;
  filenameTemplate: string;
  scrollDelay: number;
  theme: 'light' | 'dark';
  windowId: number;
}

export type CaptureMessage = {
  type: 'start-capture';
  settings: ScreenshotSettings;
};

export type CaptureResponse =
  | { type: 'capture-progress'; phase: 'idle' | 'capturing' | 'stitching' | 'done' | 'error'; percent: number; message: string }
  | { type: 'capture-complete'; dataUrl: string; width: number; height: number }
  | { type: 'capture-error'; error: string };
