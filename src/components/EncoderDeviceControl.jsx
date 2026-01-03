import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Slider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const EncoderDeviceControl = () => {
  const [midiDevices, setMidiDevices] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [openMappingDialog, setOpenMappingDialog] = useState(false);
  const [openCommandDialog, setOpenCommandDialog] = useState(false);

  const [mappingForm, setMappingForm] = useState({
    name: '',
    commands: []
  });

  const [commandForm, setCommandForm] = useState({
    channel: 1,
    controller: 7,
    value: 64
  });

  // Load MIDI devices on component mount
  useEffect(() => {
    loadMidiDevices();
    loadMappings();
  }, []);

  const loadMidiDevices = async () => {
    try {
      setLoading(true);
      const result = await window.encoderAPI.getMidiDevices();
      if (result.success) {
        setMidiDevices(result.devices || []);
      } else {
        setError(result.error || 'Failed to load MIDI devices');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async () => {
    try {
      const result = await window.encoderAPI.getMidiMappings();
      if (result.success) {
        setMappings(result.mappings || []);
      }
    } catch (err) {
      console.error('Failed to load mappings:', err);
    }
  };

  const handleConnectDevice = async (deviceId) => {
    try {
      setLoading(true);
      const result = await window.encoderAPI.connectMidiDevice(deviceId);
      if (result.success) {
        setConnectedDevice(deviceId);
        setSuccess(`Connected to device ${deviceId}`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await window.encoderAPI.disconnectMidiDevice();
      if (result.success) {
        setConnectedDevice(null);
        setSuccess('Device disconnected');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendCommand = async () => {
    try {
      if (!connectedDevice) {
        setError('No device connected');
        return;
      }

      const result = await window.encoderAPI.sendMidiCommand({
        deviceId: connectedDevice,
        channel: commandForm.channel,
        controller: commandForm.controller,
        value: commandForm.value
      });

      if (result.success) {
        setSuccess('Command sent successfully');
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateMapping = async () => {
    try {
      if (!mappingForm.name.trim()) {
        setError('Mapping name is required');
        return;
      }

      const result = await window.encoderAPI.createMidiMapping({
        deviceId: connectedDevice,
        name: mappingForm.name,
        commands: mappingForm.commands
      });

      if (result.success) {
        setOpenMappingDialog(false);
        setMappingForm({ name: '', commands: [] });
        loadMappings();
        setSuccess('Mapping created');
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExecuteMapping = async (mappingName) => {
    try {
      const result = await window.encoderAPI.executeMidiMapping({ mappingName });
      if (result.success) {
        setSuccess(`Executed: ${mappingName}`);
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddCommand = () => {
    setMappingForm({
      ...mappingForm,
      commands: [
        ...mappingForm.commands,
        { channel: 1, controller: 7, value: 64 }
      ]
    });
  };

  const handleRemoveCommand = (index) => {
    setMappingForm({
      ...mappingForm,
      commands: mappingForm.commands.filter((_, i) => i !== index)
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon /> MIDI Device Control
      </Typography>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      {/* MIDI Devices */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Available MIDI Devices</Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              loadMidiDevices();
            }}
            sx={{ ml: 2 }}
          >
            <RefreshIcon />
          </IconButton>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {midiDevices.length > 0 ? (
              midiDevices.map(device => (
                <Grid item xs={12} sm={6} md={4} key={device.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{device.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        ID: {device.id}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        {connectedDevice === device.id ? (
                          <>
                            <Chip label="Connected" color="success" size="small" sx={{ mb: 1 }} />
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              fullWidth
                              onClick={handleDisconnect}
                            >
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => handleConnectDevice(device.id)}
                            disabled={loading}
                          >
                            Connect
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography color="textSecondary">No MIDI devices found. Check connections.</Typography>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Device Control Panel */}
      {connectedDevice && (
        <Accordion sx={{ mt: 2 }} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Control Panel</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Connected to: <Chip label={connectedDevice} color="primary" size="small" />
              </Typography>

              <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>Send Command</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      label="Channel (1-16)"
                      value={commandForm.channel}
                      onChange={(e) => setCommandForm({ ...commandForm, channel: Math.min(16, Math.max(1, parseInt(e.target.value) || 1)) })}
                      inputProps={{ min: 1, max: 16 }}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      label="Controller (0-127)"
                      value={commandForm.controller}
                      onChange={(e) => setCommandForm({ ...commandForm, controller: Math.min(127, Math.max(0, parseInt(e.target.value) || 0)) })}
                      inputProps={{ min: 0, max: 127 }}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      label="Value (0-127)"
                      value={commandForm.value}
                      onChange={(e) => setCommandForm({ ...commandForm, value: Math.min(127, Math.max(0, parseInt(e.target.value) || 0)) })}
                      inputProps={{ min: 0, max: 127 }}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Value: {commandForm.value}
                  </Typography>
                  <Slider
                    value={commandForm.value}
                    onChange={(e, newValue) => setCommandForm({ ...commandForm, value: newValue })}
                    min={0}
                    max={127}
                    step={1}
                    marks
                  />
                </Box>

                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleSendCommand}
                  disabled={loading}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Send Command
                </Button>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Mappings */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">MIDI Mappings ({mappings.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ width: '100%' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenMappingDialog(true)}
              disabled={!connectedDevice}
              sx={{ mb: 2 }}
            >
              Create Mapping
            </Button>

            {mappings.length > 0 ? (
              <Grid container spacing={2}>
                {mappings.map((mapping, idx) => (
                  <Grid item xs={12} sm={6} key={idx}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">{mapping.name}</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {mapping.commands?.length || 0} commands
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleExecuteMapping(mapping.name)}
                          fullWidth
                        >
                          Execute
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography color="textSecondary">No mappings created yet.</Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Mapping Dialog */}
      <Dialog open={openMappingDialog} onClose={() => setOpenMappingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create MIDI Mapping</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Mapping Name"
            value={mappingForm.name}
            onChange={(e) => setMappingForm({ ...mappingForm, name: e.target.value })}
            placeholder="e.g., Scene 1"
            sx={{ mb: 3 }}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>Commands</Typography>
          {mappingForm.commands.map((cmd, idx) => (
            <Box key={idx} sx={{ p: 2, mb: 1, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  Ch{cmd.channel} CC{cmd.controller} = {cmd.value}
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveCommand(idx)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          <Button
            variant="outlined"
            size="small"
            onClick={handleAddCommand}
            sx={{ mt: 1 }}
          >
            Add Command
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMappingDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateMapping} variant="contained" disabled={loading}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EncoderDeviceControl;
