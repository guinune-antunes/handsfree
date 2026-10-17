import type { StreamQualityPreset } from '../types';

export const STREAM_QUALITY_PRESETS: StreamQualityPreset[] = [
  {
    id: '1080p60',
    label: '1080p • 60 FPS (Ultra Fluido / Recomendado)',
    resolution: '1080p',
    fps: 60,
    width: 1920,
    height: 1080,
    bitrate: 4_500_000, // 4.5 Mbps (Padrão Discord Nitro - excelente nitidez sem sobrecarregar upload)
  },
  {
    id: '1080p30',
    label: '1080p • 30 FPS (Alta Definição)',
    resolution: '1080p',
    fps: 30,
    width: 1920,
    height: 1080,
    bitrate: 3_000_000, // 3.0 Mbps
  },
  {
    id: '720p60',
    label: '720p • 60 FPS (Fluido / Estável)',
    resolution: '720p',
    fps: 60,
    width: 1280,
    height: 720,
    bitrate: 2_500_000, // 2.5 Mbps
  },
  {
    id: '720p30',
    label: '720p • 30 FPS (Leve / Economia de Dados)',
    resolution: '720p',
    fps: 30,
    width: 1280,
    height: 720,
    bitrate: 1_500_000, // 1.5 Mbps
  },
  {
    id: 'source60',
    label: 'Fonte Original • 60 FPS (Sem Compressão)',
    resolution: 'Original',
    fps: 60,
    width: 2560,
    height: 1440,
    bitrate: 6_000_000, // 6.0 Mbps
  },
];

export const DEFAULT_STREAM_PRESET = STREAM_QUALITY_PRESETS[0]; // 1080p 60fps
