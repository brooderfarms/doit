# ShashaStream Encoder + ShashaStream Integration Guide

## Quick Start

### For Churches Using ShashaStream

1. **Install Encoder**
   - Download `ShashaStream-Encoder-Setup.exe`
   - Run the installer
   - Launch "ShashaStream Encoder"

2. **Get Your Stream Key**
   - Log into ShashaStream dashboard
   - Go to Settings → Streaming Platforms
   - Copy your stream key

3. **Configure Encoder**
   - **Capture Source**: Select "Screen" (for presentations) or "Webcam"
   - **RTMP URL**: `rtmp://your-shashastream-server.com/live/`
   - **Stream Key**: Paste your key from Step 2
   - **Resolution**: 1920x1080 (1080p)
   - **FPS**: 30
   - **Bitrate**: 6000 kbps

4. **Start Streaming**
   - Click "Start Stream" button
   - Open your ShashaStream dashboard
   - Your stream will appear live within 5-10 seconds

## Full Setup Instructions

### Prerequisites

1. **FFmpeg Installation**
   
   **Windows (Recommended: Chocolatey)**
   ```
   choco install ffmpeg
   ```
   
   **Windows (Manual)**
   - Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Extract to `C:\ffmpeg`
   - Add `C:\ffmpeg\bin` to System PATH
   
   **macOS**
   ```
   brew install ffmpeg
   ```
   
   **Linux**
   ```
   sudo apt-get install ffmpeg
   ```

2. **ShashaStream Account**
   - Create account at shashastream.com
   - Create your church/organization
   - Get RTMP endpoint and stream key

### Installation

1. Download `ShashaStream-Encoder-Setup.exe` from releases
2. Run installer (admin privileges recommended)
3. Install to default location
4. Complete installation and launch encoder

### Configuration

**Step 1: Select Capture Source**
- **Screen**: Captures your entire display (for presentations)
- **Webcam**: Captures camera (for talking head)
- **Window**: Captures specific app window

**Step 2: Enter Server Details**
- **RTMP URL**: Get from ShashaStream dashboard
- **Stream Key**: Get from ShashaStream settings

**Step 3: Quality Settings**
- **Resolution**: 1920x1080 for presentations, 1280x720 if bandwidth is limited
- **FPS**: 30 FPS for smooth presentation changes
- **Bitrate**: 6000 kbps (adjust based on connection)

**Step 4: Audio Setup**
- Select your microphone or audio input
- Test levels before starting stream

**Step 5: Start Streaming**
- Click "Start Stream"
- Wait for connection confirmation
- Monitor real-time stats

## Workflow Examples

### Streaming a Presentation

1. Open presentation software (PowerPoint, Google Slides, Keynote, etc.)
2. Configure Encoder:
   - Source: Screen
   - Select appropriate display
   - 1920x1080, 30 FPS, 6000 kbps
3. Click Start Stream
4. Present as normal
5. Viewers see live stream in ShashaStream player

### Streaming a Service with Multiple Cameras

1. Set up camera feeds
2. Use presentation software to display speaker/graphics
3. Configure Encoder:
   - Source: Screen (captures presentation overlay)
   - Or: Webcam (for camera feed)
4. Advanced tip: Use OBS locally to mix cameras, then stream OBS window to encoder

### Streaming With Lower Bandwidth

If internet is slow:
- Resolution: 1280x720
- FPS: 24
- Bitrate: 3000-4000 kbps

## Settings Explained

### Resolution
- **3840x2160 (4K)**: Best quality, requires 15+ Mbps
- **1920x1080 (1080p)**: Great quality, standard setting, 6-8 Mbps
- **1280x720 (720p)**: Good quality, 4-5 Mbps
- **854x480 (480p)**: Lower bandwidth, 2-3 Mbps

### Frame Rate
- **24 FPS**: Film-like, good for presentations
- **30 FPS**: Standard, smooth, recommended
- **60 FPS**: Very smooth, higher bandwidth needed

### Bitrate
- **2500 kbps**: Mobile streaming (480p)
- **6000 kbps**: Standard (720p-1080p)
- **8000 kbps**: High quality (1080p)
- **15000 kbps**: Ultra quality (1080p 60fps)

### Hardware Acceleration
- **Enabled**: Uses GPU for encoding (faster, lower CPU)
- **Disabled**: Uses CPU only

If you have NVIDIA, AMD, or Intel GPU with encoding, enable this for 40-50% CPU reduction.

### Low Latency Mode
- Reduces delay from 2-3 seconds to 0.5 seconds
- Uses more bandwidth
- Good for interactive events

## Monitoring Stream Health

While streaming, watch these stats:

- **Frames**: Total video frames sent
- **FPS**: Current frames per second (should match target)
- **Bitrate**: Current upload bitrate (should stay near target)
- **Duration**: How long stream has been running

**Healthy Stream:**
- FPS stable (shows set value)
- Bitrate consistent
- No errors in console

**Problem Signs:**
- FPS dropping below target = lower bitrate or resolution
- Bitrate jumping = unstable connection
- Red error messages = check RTMP server

## Troubleshooting

### "FFmpeg Not Found"
- Windows: Install via `choco install ffmpeg` or download from ffmpeg.org
- macOS: Run `brew install ffmpeg`
- Linux: Run `sudo apt-get install ffmpeg`
- Restart encoder after installing

### "Connection Failed"
1. Verify RTMP URL is correct
2. Check stream key is valid
3. Ensure firewall allows RTMP (port 1935)
4. Test with online RTMP tester
5. Check server status on ShashaStream dashboard

### "High CPU Usage"
1. Enable Hardware Acceleration
2. Lower resolution
3. Lower bitrate
4. Close unnecessary apps
5. Check CPU temperature

### "No Audio"
1. Select correct audio device in dropdown
2. Check system audio levels
3. Check encoder audio levels are up
4. Test microphone in system settings

### "Choppy/Stuttering Stream"
1. Lower bitrate
2. Lower resolution
3. Lower FPS to 24
4. Check internet connection speed
5. Enable Hardware Acceleration

### "Stream Disconnects"
1. Check internet stability (run speed test)
2. Check firewall/router settings
3. Try lower bitrate
4. Check if router supports RTMP

## Advanced Configuration

### Custom RTMP Servers

You can use any RTMP server, not just ShashaStream:

**YouTube Live**
```
RTMP: rtmp://a.rtmp.youtube.com/live2/
Key: [your youtube stream key]
Bitrate: 6000 kbps
```

**Facebook Live**
```
RTMP: rtmps://live-api-s.facebook.com:443/rtmp/
Key: [your facebook stream key]
Bitrate: 6000 kbps
```

**Twitch**
```
RTMP: rtmp://live-[region].twitch.tv/app/
Key: [your twitch stream key]
Bitrate: 6000 kbps
```

## Performance Tips

1. **Close Background Apps**: Free up CPU for encoding
2. **Use Wired Network**: More stable than WiFi
3. **Enable Hardware Acceleration**: If GPU available
4. **Match Resolution**: Use native display resolution
5. **Test Before Live Event**: Always do a test stream
6. **Monitor System Resources**: Keep CPU below 80%

## Getting Help

**ShashaStream Support**
- Email: support@shashastream.com
- Website: shashastream.com/support
- Documentation: shashastream.com/docs

**Encoder Issues**
- Check encoder logs
- Verify FFmpeg installation
- Test RTMP connection
- Review system requirements

## Next Steps

1. ✅ Install encoder
2. ✅ Configure encoder with your ShashaStream details
3. ✅ Do a test stream
4. ✅ Verify stream appears in dashboard
5. ✅ Check quality and audio
6. ✅ Share stream link with viewers
7. ✅ Monitor stats during broadcast

Enjoy streaming! 🎙️
