# ShashaStream Encoder

A lightweight, standalone Electron app for streaming presentations and content to RTMP servers (ShashaStream, YouTube, Facebook, Twitch, or custom servers).

## Features

✨ **Easy to Use**
- Simple, intuitive interface
- One-click streaming
- Real-time statistics

🎥 **Multiple Capture Sources**
- Screen capture
- Webcam
- Window capture

⚡ **Professional Quality**
- Hardware-accelerated encoding (NVIDIA, AMD, Intel)
- Configurable resolution (480p - 4K)
- Adjustable frame rate (24, 30, 60 FPS)
- Custom bitrate control

🎙️ **Audio Support**
- Multiple audio input devices
- AAC audio codec
- 48kHz sample rate

🔗 **Universal RTMP Support**
- Works with ShashaStream
- YouTube Live
- Facebook Live
- Twitch
- Custom RTMP servers
- OBS-compatible endpoints

## Requirements

1. **FFmpeg** - Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Windows: Add FFmpeg to PATH or install via `choco install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt-get install ffmpeg`

2. **Node.js 14+** - For development

## Installation

### From Release (Recommended for Users)
1. Download `ShashaStream-Encoder-Setup.exe` from releases
2. Run the installer
3. Launch "ShashaStream Encoder" from your Start Menu

### From Source (For Developers)
```bash
cd encoder
npm install
npm start
```

## Building

### Windows
```bash
npm run build:win
```

### macOS
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

## Usage

1. **Select Source**: Choose screen, webcam, or window capture
2. **Configure RTMP**: Enter your server URL and stream key
3. **Adjust Quality**: Set resolution, FPS, and bitrate
4. **Start Stream**: Click "Start Stream" button
5. **Monitor**: Watch real-time statistics (FPS, bitrate, frames)

### Example RTMP URLs

**ShashaStream**
```
rtmp://your-shashastream-server.com/live/
Stream Key: [your-stream-key]
```

**YouTube**
```
rtmp://a.rtmp.youtube.com/live2/
Stream Key: [your-youtube-stream-key]
```

**Facebook**
```
rtmps://live-api-s.facebook.com:443/rtmp/
Stream Key: [your-facebook-stream-key]
```

**Twitch**
```
rtmp://live-[region].twitch.tv/app/
Stream Key: [your-twitch-stream-key]
```

## Configuration

### Resolution Options
- 4K: 3840x2160
- 1080p: 1920x1080 (Recommended)
- 720p: 1280x720
- 480p: 854x480

### Frame Rate
- 24 FPS (for film-like quality)
- 30 FPS (standard, recommended for presentations)
- 60 FPS (for gaming/fast motion)

### Bitrate Guidelines
- 2.5 Mbps: Low quality (480p, 30fps)
- 6 Mbps: Medium quality (720p, 30fps)
- 8 Mbps: High quality (1080p, 30fps)
- 15 Mbps: Ultra quality (1080p, 60fps)

## Advanced Options

**Hardware Acceleration**
Enable to use GPU encoding (NVIDIA NVENC, AMD VCE, Intel QuickSync) for better performance and lower CPU usage.

**Low Latency Mode**
Reduces encoding delay for interactive streaming. Useful for live events where responsiveness matters.

## Troubleshooting

### FFmpeg Not Found
1. Install FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Windows: Add FFmpeg to PATH
3. Restart the encoder

### High CPU Usage
- Enable Hardware Acceleration
- Lower resolution
- Reduce bitrate
- Close other applications

### Connection Failed
- Verify RTMP URL is correct
- Check stream key
- Ensure firewall allows RTMP (port 1935)
- Test connection to server

### Audio Issues
- Select correct audio input device
- Check audio device levels in system settings
- Restart the encoder

## Performance Tips

1. **Use Hardware Acceleration** when available
2. **Match output resolution** to your source
3. **Limit FPS** to what you need (30 FPS for presentations)
4. **Close background apps** to free CPU
5. **Use wired network** connection if possible

## System Requirements

**Minimum**
- Windows 7+ / macOS 10.13+ / Ubuntu 18.04+
- 2 GB RAM
- 500 MB disk space
- FFmpeg installed

**Recommended**
- Windows 10+ / macOS 11+ / Ubuntu 20.04+
- 4+ GB RAM
- GPU with encoding support (NVIDIA/AMD/Intel)
- Wired network connection

## Privacy

- All encoding happens locally on your computer
- Stream credentials are saved locally only
- No data is sent to us except the actual stream to your server

## Support

For issues or feature requests, please visit:
- GitHub: [shashastream/encoder](https://github.com/shashastream/encoder)
- Email: support@shashastream.com

## License

MIT License - Free for personal and commercial use

## Roadmap

- [ ] Recording to local file
- [ ] Stream presets/profiles
- [ ] Multi-server simultaneous streaming
- [ ] Plugin system for overlays
- [ ] Virtual camera support
- [ ] Scene management
- [ ] Audio normalization
- [ ] Advanced filters
