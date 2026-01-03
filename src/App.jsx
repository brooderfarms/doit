import React, { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Grid,
  Paper,
  Switch,
  FormControlLabel,
  LinearProgress,
  Divider,
  Tooltip,
  IconButton,
  Tabs,
  Tab
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Cloud as CloudIcon
} from '@mui/icons-material'
import EncoderHTTPControl from './components/EncoderHTTPControl'
import './App.css'

function App() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [ffmpegStatus, setFfmpegStatus] = useState(null)
  const [displays, setDisplays] = useState([])
  const [audioDevices, setAudioDevices] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  
  // Stream config
  const [config, setConfig] = useState({
    source: 'screen', // screen, camera, window
    rtmpUrl: 'rtmp://your-server.com/live/',
    streamKey: '',
    resolution: '1920x1080',
    fps: 30,
    bitrate: 6000,
    audioDevice: 'Microphone',
    displayId: 0,
    hardwareAccel: true,
    lowLatency: false
  })

  // Stream stats
  const [stats, setStats] = useState({
    frames: 0,
    currentFps: 0,
    currentKbps: 0,
    timemark: '00:00:00'
  })

  const [error, setError] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Load system info on mount
  useEffect(() => {
    loadSystemInfo()
    loadSavedConfig()
  }, [])

  // Listen to stream events
  useEffect(() => {
    if (!window.encoder) return

    window.encoder.onStreamStarted(() => {
      setIsStreaming(true)
      setError(null)
    })

    window.encoder.onStreamProgress((data) => {
      setStats(data)
    })

    window.encoder.onStreamError((error) => {
      setError(`Stream error: ${error}`)
      setIsStreaming(false)
    })

    window.encoder.onStreamEnded(() => {
      setIsStreaming(false)
    })

    return () => {
      // Cleanup listeners
    }
  }, [])

  const loadSystemInfo = async () => {
    try {
      const ffmpeg = await window.encoder.getFFmpegStatus()
      setFfmpegStatus(ffmpeg)

      const displays = await window.encoder.getDisplays()
      setDisplays(displays)

      const audio = await window.encoder.getAudioDevices()
      setAudioDevices(audio)
    } catch (err) {
      setError(`Failed to load system info: ${err.message}`)
    }
  }

  const loadSavedConfig = () => {
    try {
      const saved = window.encoder.getSettings('encoderConfig')
      if (saved) {
        setConfig(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  const saveConfig = () => {
    try {
      window.encoder.setSettings('encoderConfig', config)
      setError(null)
    } catch (err) {
      setError(`Failed to save config: ${err.message}`)
    }
  }

  const handleStartStream = async () => {
    if (!config.streamKey) {
      setError('Stream key is required')
      return
    }

    try {
      setError(null)
      const result = await window.encoder.startStream(config)
      if (!result.success) {
        setError(result.error)
      } else {
        saveConfig()
      }
    } catch (err) {
      setError(`Failed to start stream: ${err.message}`)
    }
  }

  const handleStopStream = async () => {
    try {
      const result = await window.encoder.stopStream()
      if (!result.success) {
        setError(result.error)
      }
    } catch (err) {
      setError(`Failed to stop stream: ${err.message}`)
    }
  }

  // Tab panel component
  const TabPanel = ({ children, value, index }) => (
    <Box role="tabpanel" hidden={value !== index}>
      {value === index && children}
    </Box>
  )

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            🎙️ ShashaStream Encoder
          </Typography>
          <Typography color="text.secondary">Stream your presentations and content</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          {ffmpegStatus && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {ffmpegStatus.installed ? (
                <>
                  <CheckIcon sx={{ color: '#10b981', fontSize: '1.5rem' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>FFmpeg Ready</Typography>
                    <Typography variant="caption" color="text.secondary">{ffmpegStatus.path}</Typography>
                  </Box>
                </>
              ) : (
                <>
                  <ErrorIcon sx={{ color: '#ef4444', fontSize: '1.5rem' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>FFmpeg Missing</Typography>
                    <Typography variant="caption">Install from ffmpeg.org</Typography>
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {isStreaming && <Alert severity="success" sx={{ mb: 2 }}>🔴 Streaming live...</Alert>}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Stream" icon={<PlayIcon />} iconPosition="start" />
          <Tab label="HTTP Devices" icon={<CloudIcon />} iconPosition="start" />
        </Tabs>
      </Card>

      {/* Tab 0: Stream Configuration */}
      <TabPanel value={activeTab} index={0}>
      {/* Main Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Stream Configuration</Typography>

          <Grid container spacing={2}>
            {/* Source Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Capture Source</InputLabel>
                <Select
                  value={config.source}
                  label="Capture Source"
                  onChange={(e) => setConfig({ ...config, source: e.target.value })}
                  disabled={isStreaming}
                >
                  <MenuItem value="screen">📺 Screen</MenuItem>
                  <MenuItem value="camera">📹 Webcam</MenuItem>
                  <MenuItem value="window">🪟 Window</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Display Selection (for screen capture) */}
            {config.source === 'screen' && displays.length > 0 && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Display</InputLabel>
                  <Select
                    value={config.displayId}
                    label="Display"
                    onChange={(e) => setConfig({ ...config, displayId: e.target.value })}
                    disabled={isStreaming}
                  >
                    {displays.map((display) => (
                      <MenuItem key={display.id} value={display.id}>
                        {display.name} ({display.width}x{display.height})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* RTMP Server */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="RTMP Server URL"
                value={config.rtmpUrl}
                onChange={(e) => setConfig({ ...config, rtmpUrl: e.target.value })}
                placeholder="rtmp://your-server.com/live/"
                disabled={isStreaming}
                helperText="Example: rtmp://live.youtube.com/live2/ or your ShashaStream server"
              />
            </Grid>

            {/* Stream Key */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Stream Key"
                type="password"
                value={config.streamKey}
                onChange={(e) => setConfig({ ...config, streamKey: e.target.value })}
                placeholder="Your stream key"
                disabled={isStreaming}
                required
              />
            </Grid>

            {/* Resolution */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Resolution</InputLabel>
                <Select
                  value={config.resolution}
                  label="Resolution"
                  onChange={(e) => setConfig({ ...config, resolution: e.target.value })}
                  disabled={isStreaming}
                >
                  <MenuItem value="3840x2160">4K (3840x2160)</MenuItem>
                  <MenuItem value="1920x1080">1080p (1920x1080)</MenuItem>
                  <MenuItem value="1280x720">720p (1280x720)</MenuItem>
                  <MenuItem value="854x480">480p (854x480)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* FPS */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Frame Rate</InputLabel>
                <Select
                  value={config.fps}
                  label="Frame Rate"
                  onChange={(e) => setConfig({ ...config, fps: e.target.value })}
                  disabled={isStreaming}
                >
                  <MenuItem value={24}>24 FPS</MenuItem>
                  <MenuItem value={30}>30 FPS</MenuItem>
                  <MenuItem value={60}>60 FPS</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Bitrate */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Bitrate</InputLabel>
                <Select
                  value={config.bitrate}
                  label="Bitrate"
                  onChange={(e) => setConfig({ ...config, bitrate: e.target.value })}
                  disabled={isStreaming}
                >
                  <MenuItem value={2500}>2.5 Mbps (Low)</MenuItem>
                  <MenuItem value={6000}>6 Mbps (Medium)</MenuItem>
                  <MenuItem value={8000}>8 Mbps (High)</MenuItem>
                  <MenuItem value={15000}>15 Mbps (Ultra)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Audio Device */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Audio Input</InputLabel>
                <Select
                  value={config.audioDevice}
                  label="Audio Input"
                  onChange={(e) => setConfig({ ...config, audioDevice: e.target.value })}
                  disabled={isStreaming}
                >
                  {audioDevices.map((device) => (
                    <MenuItem key={device.id} value={device.id}>
                      🎙️ {device.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Advanced Options Toggle */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
              <Button
                startIcon={<SettingsIcon />}
                onClick={() => setShowAdvanced(!showAdvanced)}
                variant="text"
              >
                Advanced Options
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={isStreaming ? 'contained' : 'outlined'}
                  color={isStreaming ? 'error' : 'success'}
                  startIcon={isStreaming ? <StopIcon /> : <PlayIcon />}
                  onClick={isStreaming ? handleStopStream : handleStartStream}
                  size="large"
                >
                  {isStreaming ? 'Stop Stream' : 'Start Stream'}
                </Button>
              </Box>
            </Grid>

            {/* Advanced Options */}
            {showAdvanced && (
              <>
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.hardwareAccel}
                        onChange={(e) => setConfig({ ...config, hardwareAccel: e.target.checked })}
                        disabled={isStreaming}
                      />
                    }
                    label="Hardware Acceleration (NVIDIA/AMD/Intel)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.lowLatency}
                        onChange={(e) => setConfig({ ...config, lowLatency: e.target.checked })}
                        disabled={isStreaming}
                      />
                    }
                    label="Low Latency Mode"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Stream Stats */}
      {isStreaming && (
        <Card sx={{ mb: 3, bgcolor: '#1a1a2e' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#fff' }}>
              📊 Stream Statistics
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: '#16213e', textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="caption">Frames</Typography>
                  <Typography variant="h5" sx={{ color: '#10b981', my: 1 }}>
                    {stats.frames}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: '#16213e', textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="caption">FPS</Typography>
                  <Typography variant="h5" sx={{ color: '#3b82f6', my: 1 }}>
                    {stats.currentFps}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: '#16213e', textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="caption">Bitrate</Typography>
                  <Typography variant="h5" sx={{ color: '#f59e0b', my: 1 }}>
                    {stats.currentKbps} kbps
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: '#16213e', textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="caption">Duration</Typography>
                  <Typography variant="h5" sx={{ color: '#ec4899', my: 1 }}>
                    {stats.timemark}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <InfoIcon sx={{ color: '#3b82f6', mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                How to Use
              </Typography>
              <ul style={{ marginTop: 0, paddingLeft: 20 }}>
                <li>Select your capture source (screen, camera, or window)</li>
                <li>Enter your RTMP server URL and stream key</li>
                <li>Adjust quality settings as needed</li>
                <li>Click "Start Stream" to begin broadcasting</li>
                <li>Monitor stats in real-time while streaming</li>
              </ul>
              <Typography variant="caption" color="text.secondary">
                💡 Works with ShashaStream, YouTube, Facebook, or any RTMP server
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      </TabPanel>

      {/* Tab 1: HTTP Devices */}
      <TabPanel value={activeTab} index={1}>
        <EncoderHTTPControl />
      </TabPanel>
    </Container>
