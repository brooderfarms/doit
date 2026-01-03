import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Slider,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Edit,
  Delete,
  Settings,
  PlayArrow,
  Stop,
  Videocam,
  Power,
  NetworkCheck,
  Cloud,
  AutoFixHigh,
  WebhookOutlined,
  SearchOutlined
} from '@mui/icons-material';

/**
 * HTTP Device Control Component for Encoder
 * Manages network cameras, relays, switchers, and IoT devices
 */
function EncoderHTTPControl() {
  // State
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Dialog states
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);

  // Form states
  const [registerForm, setRegisterForm] = useState({
    name: '',
    type: 'CAMERA',
    ip: '',
    port: 80,
    protocol: 'http',
    username: '',
    password: '',
    profile: 'onvif-generic'
  });

  const [controlForm, setControlForm] = useState({
    pan: 0,
    tilt: 0,
    zoom: 1,
    command: '',
    parameters: ''
  });

  const [webhookForm, setWebhookForm] = useState({
    event: 'ONLINE',
    webhookUrl: '',
    retries: 3,
    timeout: 5000
  });

  const [automationForm, setAutomationForm] = useState({
    name: '',
    trigger: 'MANUAL',
    condition: '',
    actions: []
  });

  // Load devices
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.api.httpDevices.list();
      setDevices(result || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error loading devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Discover devices on network
   */
  const handleDiscoverDevices = useCallback(async () => {
    try {
      setDiscovering(true);
      setError(null);
      
      const discovered = await window.api.httpDevices.discover({
        subnet: '192.168.1',
        timeout: 2000,
        onvif: true,
        mdns: true,
        http: true
      });

      setSuccess(`Found ${discovered.length} devices`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error discovering devices:', err);
    } finally {
      setDiscovering(false);
    }
  }, []);

  /**
   * Register device
   */
  const handleRegisterDevice = useCallback(async () => {
    try {
      if (!registerForm.name || !registerForm.ip) {
        setError('Name and IP are required');
        return;
      }

      setLoading(true);
      const device = await window.api.httpDevices.register(registerForm);
      
      setDevices([...devices, device]);
      setRegisterDialogOpen(false);
      setRegisterForm({
        name: '',
        type: 'CAMERA',
        ip: '',
        port: 80,
        protocol: 'http',
        username: '',
        password: '',
        profile: 'onvif-generic'
      });
      setSuccess('Device registered successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error registering device:', err);
    } finally {
      setLoading(false);
    }
  }, [registerForm, devices]);

  /**
   * Delete device
   */
  const handleDeleteDevice = useCallback(async (deviceId) => {
    if (window.confirm('Are you sure?')) {
      try {
        setLoading(true);
        await window.api.httpDevices.delete(deviceId);
        setDevices(devices.filter(d => d.id !== deviceId));
        setSuccess('Device deleted');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.message);
        console.error('Error deleting device:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [devices]);

  /**
   * Control PTZ camera
   */
  const handleControlPTZ = useCallback(async () => {
    try {
      if (!selectedDevice) return;

      setLoading(true);
      await window.api.httpDevices.controlPTZ(selectedDevice.id, {
        pan: controlForm.pan,
        tilt: controlForm.tilt,
        zoom: controlForm.zoom
      });

      setSuccess('PTZ control sent');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error controlling PTZ:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, controlForm]);

  /**
   * Send generic command
   */
  const handleSendCommand = useCallback(async () => {
    try {
      if (!selectedDevice || !controlForm.command) {
        setError('Device and command required');
        return;
      }

      setLoading(true);
      await window.api.httpDevices.sendCommand(selectedDevice.id, {
        command: controlForm.command,
        parameters: controlForm.parameters ? JSON.parse(controlForm.parameters) : {}
      });

      setSuccess('Command executed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error sending command:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, controlForm]);

  /**
   * Control relay
   */
  const handleControlRelay = useCallback(async (relayNumber, action) => {
    try {
      if (!selectedDevice) return;

      setLoading(true);
      await window.api.httpDevices.controlRelay(selectedDevice.id, {
        relayNumber,
        action
      });

      setSuccess(`Relay ${relayNumber} ${action}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error controlling relay:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  /**
   * Register webhook
   */
  const handleRegisterWebhook = useCallback(async () => {
    try {
      if (!selectedDevice || !webhookForm.webhookUrl) {
        setError('Webhook URL required');
        return;
      }

      setLoading(true);
      await window.api.httpDevices.registerWebhook(selectedDevice.id, webhookForm);

      setWebhookDialogOpen(false);
      setWebhookForm({
        event: 'ONLINE',
        webhookUrl: '',
        retries: 3,
        timeout: 5000
      });
      setSuccess('Webhook registered');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error registering webhook:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, webhookForm]);

  /**
   * Create automation
   */
  const handleCreateAutomation = useCallback(async () => {
    try {
      if (!selectedDevice || !automationForm.name) {
        setError('Automation name required');
        return;
      }

      setLoading(true);
      await window.api.httpDevices.createAutomation(selectedDevice.id, automationForm);

      setAutomationDialogOpen(false);
      setAutomationForm({
        name: '',
        trigger: 'MANUAL',
        condition: '',
        actions: []
      });
      setSuccess('Automation created');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error creating automation:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, automationForm]);

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'CAMERA':
        return <Videocam />;
      case 'RELAY':
        return <Power />;
      case 'SWITCHER':
        return <Cloud />;
      default:
        return <NetworkCheck />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ONLINE':
        return 'success';
      case 'OFFLINE':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>HTTP Device Control</h2>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDiscoverDevices}
            disabled={discovering}
            sx={{ mr: 1 }}
            startIcon={<SearchOutlined />}
          >
            {discovering ? 'Discovering...' : 'Discover Devices'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setRegisterDialogOpen(true)}
            startIcon={<Settings />}
          >
            Register Device
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      {/* Devices List */}
      {loading && !discovering ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {devices.map(device => (
            <Grid item xs={12} sm={6} md={4} key={device.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  bgcolor: selectedDevice?.id === device.id ? '#f5f5f5' : 'white',
                  border: selectedDevice?.id === device.id ? '2px solid #ec4899' : '1px solid #e0e0e0'
                }}
                onClick={() => setSelectedDevice(device)}
              >
                <CardHeader
                  avatar={getDeviceIcon(device.type)}
                  title={device.name}
                  subheader={device.ip}
                  action={
                    <Box>
                      <Chip
                        label={device.status}
                        color={getStatusColor(device.status)}
                        size="small"
                      />
                    </Box>
                  }
                />
                <CardContent>
                  <Box sx={{ mb: 1 }}>
                    <strong>Type:</strong> {device.type}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <strong>Address:</strong> {device.protocol}://{device.ip}:{device.port}
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <strong>Profile:</strong> {device.profile}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary">
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteDevice(device.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Device Control Panel */}
      {selectedDevice && (
        <Box sx={{ mt: 4 }}>
          <Card>
            <CardHeader title={`Control: ${selectedDevice.name}`} />
            <CardContent>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                {selectedDevice.type === 'CAMERA' && (
                  <Tab label="PTZ Control" icon={<Videocam />} iconPosition="start" />
                )}
                <Tab label="Commands" icon={<PlayArrow />} iconPosition="start" />
                {selectedDevice.type === 'RELAY' && (
                  <Tab label="Relays" icon={<Power />} iconPosition="start" />
                )}
                <Tab label="Webhooks" icon={<WebhookOutlined />} iconPosition="start" />
                <Tab label="Automations" icon={<AutoFixHigh />} iconPosition="start" />
              </Tabs>

              {/* PTZ Control Tab */}
              {selectedDevice.type === 'CAMERA' && activeTab === 0 && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ mb: 3 }}>
                    <p>Pan</p>
                    <Slider
                      value={controlForm.pan}
                      onChange={(e, v) => setControlForm({ ...controlForm, pan: v })}
                      min={-100}
                      max={100}
                      marks
                    />
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <p>Tilt</p>
                    <Slider
                      value={controlForm.tilt}
                      onChange={(e, v) => setControlForm({ ...controlForm, tilt: v })}
                      min={-100}
                      max={100}
                      marks
                    />
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <p>Zoom</p>
                    <Slider
                      value={controlForm.zoom}
                      onChange={(e, v) => setControlForm({ ...controlForm, zoom: v })}
                      min={1}
                      max={10}
                      step={0.5}
                      marks
                    />
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleControlPTZ}
                    disabled={loading}
                  >
                    Apply PTZ
                  </Button>
                </Box>
              )}

              {/* Commands Tab */}
              {activeTab === (selectedDevice.type === 'CAMERA' ? 1 : 0) && (
                <Box sx={{ mt: 3 }}>
                  <TextField
                    fullWidth
                    label="Command"
                    value={controlForm.command}
                    onChange={(e) => setControlForm({ ...controlForm, command: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Parameters (JSON)"
                    multiline
                    rows={3}
                    value={controlForm.parameters}
                    onChange={(e) => setControlForm({ ...controlForm, parameters: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSendCommand}
                    disabled={loading}
                  >
                    Send Command
                  </Button>
                </Box>
              )}

              {/* Relays Tab */}
              {selectedDevice.type === 'RELAY' && (
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(relayNum => (
                      <Grid item xs={6} sm={4} key={relayNum}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            onClick={() => handleControlRelay(relayNum, 'ON')}
                            disabled={loading}
                            size="small"
                          >
                            Relay {relayNum} ON
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={() => handleControlRelay(relayNum, 'OFF')}
                            disabled={loading}
                            size="small"
                          >
                            OFF
                          </Button>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Webhooks Tab */}
              {activeTab === (selectedDevice.type === 'RELAY' ? 2 : 1) && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setWebhookDialogOpen(true)}
                    sx={{ mb: 2 }}
                  >
                    Add Webhook
                  </Button>
                  {/* Webhook list would go here */}
                </Box>
              )}

              {/* Automations Tab */}
              {activeTab === (selectedDevice.type === 'RELAY' ? 3 : 2) && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setAutomationDialogOpen(true)}
                    sx={{ mb: 2 }}
                  >
                    Create Automation
                  </Button>
                  {/* Automation list would go here */}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Register Device Dialog */}
      <Dialog open={registerDialogOpen} onClose={() => setRegisterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register HTTP Device</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Device Name"
            value={registerForm.name}
            onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Select
            fullWidth
            value={registerForm.type}
            onChange={(e) => setRegisterForm({ ...registerForm, type: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="CAMERA">Camera (ONVIF/PTZ)</MenuItem>
            <MenuItem value="RELAY">Relay Controller</MenuItem>
            <MenuItem value="SWITCHER">HDMI Switcher</MenuItem>
            <MenuItem value="DISPLAY">Display/Projector</MenuItem>
          </Select>
          <TextField
            fullWidth
            label="IP Address"
            value={registerForm.ip}
            onChange={(e) => setRegisterForm({ ...registerForm, ip: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Port"
            type="number"
            value={registerForm.port}
            onChange={(e) => setRegisterForm({ ...registerForm, port: parseInt(e.target.value) })}
            sx={{ mb: 2 }}
          />
          <Select
            fullWidth
            value={registerForm.protocol}
            onChange={(e) => setRegisterForm({ ...registerForm, protocol: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="http">HTTP</MenuItem>
            <MenuItem value="https">HTTPS</MenuItem>
          </Select>
          <Select
            fullWidth
            value={registerForm.profile}
            onChange={(e) => setRegisterForm({ ...registerForm, profile: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="onvif-generic">ONVIF Generic</MenuItem>
            <MenuItem value="ptzoptics-camera">PTZOptics Camera</MenuItem>
            <MenuItem value="generic-relay">Generic Relay</MenuItem>
            <MenuItem value="generic-hdmi-switcher">HDMI Switcher</MenuItem>
          </Select>
          <TextField
            fullWidth
            label="Username (Optional)"
            value={registerForm.username}
            onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password (Optional)"
            type="password"
            value={registerForm.password}
            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRegisterDevice}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* Webhook Dialog */}
      <Dialog open={webhookDialogOpen} onClose={() => setWebhookDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register Webhook</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Select
            fullWidth
            value={webhookForm.event}
            onChange={(e) => setWebhookForm({ ...webhookForm, event: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="ONLINE">Device Online</MenuItem>
            <MenuItem value="OFFLINE">Device Offline</MenuItem>
            <MenuItem value="ERROR">Error</MenuItem>
            <MenuItem value="COMMAND">Command Executed</MenuItem>
          </Select>
          <TextField
            fullWidth
            label="Webhook URL"
            value={webhookForm.webhookUrl}
            onChange={(e) => setWebhookForm({ ...webhookForm, webhookUrl: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Retries"
            type="number"
            value={webhookForm.retries}
            onChange={(e) => setWebhookForm({ ...webhookForm, retries: parseInt(e.target.value) })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Timeout (ms)"
            type="number"
            value={webhookForm.timeout}
            onChange={(e) => setWebhookForm({ ...webhookForm, timeout: parseInt(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebhookDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRegisterWebhook}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* Automation Dialog */}
      <Dialog open={automationDialogOpen} onClose={() => setAutomationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Automation</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Automation Name"
            value={automationForm.name}
            onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Select
            fullWidth
            value={automationForm.trigger}
            onChange={(e) => setAutomationForm({ ...automationForm, trigger: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="SCHEDULE">Schedule</MenuItem>
            <MenuItem value="EVENT">Event Trigger</MenuItem>
            <MenuItem value="MANUAL">Manual</MenuItem>
          </Select>
          <TextField
            fullWidth
            label="Condition (JSON)"
            multiline
            rows={3}
            value={automationForm.condition}
            onChange={(e) => setAutomationForm({ ...automationForm, condition: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Actions (JSON)"
            multiline
            rows={4}
            value={JSON.stringify(automationForm.actions)}
            onChange={(e) => {
              try {
                setAutomationForm({ ...automationForm, actions: JSON.parse(e.target.value) });
              } catch {}
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutomationDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateAutomation}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EncoderHTTPControl;
