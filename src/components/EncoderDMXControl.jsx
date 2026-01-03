import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Slider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Lightbulb as LightbulbIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const EncoderDMXControl = ({ churchId }) => {
  const [adapters, setAdapters] = useState([]);
  const [universes, setUniverses] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [activeUniverse, setActiveUniverse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog states
  const [universeDialog, setUniverseDialog] = useState(false);
  const [fixtureDialog, setFixtureDialog] = useState(false);
  const [effectDialog, setEffectDialog] = useState(false);

  // Form states
  const [newUniverse, setNewUniverse] = useState({
    name: '',
    adapterId: ''
  });

  const [newFixture, setNewFixture] = useState({
    name: '',
    type: 'LIGHT',
    startChannel: 1,
    channelCount: 3
  });

  const [selectedEffect, setSelectedEffect] = useState('FADE');
  const [effectParams, setEffectParams] = useState({
    channels: [],
    targetValue: 255,
    duration: 3000,
    frequency: 5,
    channelGroups: []
  });

  // Fetch adapters on mount
  useEffect(() => {
    fetchAdapters();
  }, []);

  // Fetch universes and fixtures when active universe changes
  useEffect(() => {
    if (activeUniverse) {
      // Load fixtures for active universe
    }
  }, [activeUniverse]);

  const fetchAdapters = async () => {
    try {
      setLoading(true);
      const result = await window.encoderAPI.getDmxAdapters();
      if (result.success) {
        setAdapters(result.adapters);
      } else {
        setError(result.error || 'Failed to fetch adapters');
      }
    } catch (err) {
      setError('Error fetching adapters: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUniverse = async () => {
    try {
      if (!newUniverse.name || !newUniverse.adapterId) {
        setError('Please fill in all fields');
        return;
      }

      const result = await window.encoderAPI.connectDmxUniverse({
        universeId: `universe-${Date.now()}`,
        adapterId: newUniverse.adapterId
      });

      if (result.success) {
        setUniverses([...universes, { ...result.universe, name: newUniverse.name }]);
        setSuccess('Universe created successfully');
        setUniverseDialog(false);
        setNewUniverse({ name: '', adapterId: '' });
      }
    } catch (err) {
      setError('Error creating universe: ' + err.message);
    }
  };

  const handleCreateFixture = async () => {
    try {
      if (!activeUniverse || !newFixture.name) {
        setError('Please select universe and fixture name');
        return;
      }

      // In real implementation, would call backend API to save fixture
      const fixture = {
        id: `fixture-${Date.now()}`,
        ...newFixture,
        universeId: activeUniverse,
        currentValues: new Array(newFixture.channelCount).fill(0)
      };

      setFixtures([...fixtures, fixture]);
      setSuccess('Fixture created successfully');
      setFixtureDialog(false);
      setNewFixture({ name: '', type: 'LIGHT', startChannel: 1, channelCount: 3 });
    } catch (err) {
      setError('Error creating fixture: ' + err.message);
    }
  };

  const handleSetChannel = async (universeId, channel, value) => {
    try {
      const result = await window.encoderAPI.setDmxChannel({
        universeId,
        channel,
        value: Math.round(value)
      });

      if (!result.success) {
        setError(result.error || 'Failed to set channel');
      } else {
        setSuccess(`Channel ${channel} set to ${Math.round(value)}`);
      }
    } catch (err) {
      setError('Error setting channel: ' + err.message);
    }
  };

  const handleStartFade = async () => {
    try {
      if (!activeUniverse) {
        setError('Please select a universe');
        return;
      }

      const result = await window.encoderAPI.startDmxFade({
        universeId: activeUniverse,
        channels: effectParams.channels,
        targetValue: effectParams.targetValue,
        duration: effectParams.duration
      });

      if (result.success) {
        setSuccess('Fade effect started');
        setEffectDialog(false);
      } else {
        setError(result.error || 'Failed to start fade');
      }
    } catch (err) {
      setError('Error starting fade: ' + err.message);
    }
  };

  const handleStartChase = async () => {
    try {
      if (!activeUniverse) {
        setError('Please select a universe');
        return;
      }

      const result = await window.encoderAPI.startDmxChase({
        universeId: activeUniverse,
        channelGroups: effectParams.channelGroups,
        speed: effectParams.duration
      });

      if (result.success) {
        setSuccess('Chase effect started');
        setEffectDialog(false);
      } else {
        setError(result.error || 'Failed to start chase');
      }
    } catch (err) {
      setError('Error starting chase: ' + err.message);
    }
  };

  const handleStartStrobe = async () => {
    try {
      if (!activeUniverse) {
        setError('Please select a universe');
        return;
      }

      const result = await window.encoderAPI.startDmxStrobe({
        universeId: activeUniverse,
        channels: effectParams.channels,
        frequency: effectParams.frequency,
        duration: effectParams.duration
      });

      if (result.success) {
        setSuccess('Strobe effect started');
        setEffectDialog(false);
      } else {
        setError(result.error || 'Failed to start strobe');
      }
    } catch (err) {
      setError('Error starting strobe: ' + err.message);
    }
  };

  const handleStopAllEffects = async () => {
    try {
      if (!activeUniverse) {
        setError('Please select a universe');
        return;
      }

      const result = await window.encoderAPI.stopDmxAllEffects({
        universeId: activeUniverse
      });

      if (result.success) {
        setSuccess('All effects stopped');
      } else {
        setError(result.error || 'Failed to stop effects');
      }
    } catch (err) {
      setError('Error stopping effects: ' + err.message);
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" sx={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LightbulbIcon />
        DMX Lighting Control
      </Typography>

      {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Adapter Discovery */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>DMX Adapters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={fetchAdapters}
                loading={loading}
              >
                Scan for Adapters
              </Button>
            </Grid>
            {adapters.length > 0 ? (
              <Grid item xs={12}>
                <List>
                  {adapters.map((adapter) => (
                    <ListItem key={adapter.id} sx={{ backgroundColor: '#f5f5f5', marginBottom: 1, borderRadius: 1 }}>
                      <ListItemText
                        primary={`${adapter.name} (${adapter.type})`}
                        secondary={`Status: ${adapter.status}`}
                      />
                      <Chip label={adapter.status} color={adapter.status === 'available' ? 'success' : 'default'} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            ) : (
              <Grid item xs={12}>
                <Typography color="textSecondary">No adapters found. Please connect a DMX adapter.</Typography>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Universe Management */}
      <Accordion sx={{ marginTop: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>DMX Universes ({universes.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} sx={{ width: '100%' }}>
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setUniverseDialog(true)}
                sx={{ marginBottom: 2 }}
              >
                Add Universe
              </Button>
            </Grid>
            {universes.map((universe) => (
              <Grid item xs={12} key={universe.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: activeUniverse === universe.id ? '#e3f2fd' : 'white',
                    border: activeUniverse === universe.id ? '2px solid #1976d2' : '1px solid #ddd'
                  }}
                  onClick={() => setActiveUniverse(universe.id)}
                >
                  <CardHeader
                    title={universe.name || `Universe ${universe.universeNumber}`}
                    subheader={`Adapter: ${universe.adapterId}`}
                    action={<Chip label={universe.status} color={universe.status === 'CONNECTED' ? 'success' : 'error'} />}
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Fixture Management */}
      {activeUniverse && (
        <Accordion sx={{ marginTop: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Fixtures ({fixtures.filter(f => f.universeId === activeUniverse).length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} sx={{ width: '100%' }}>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setFixtureDialog(true)}
                >
                  Add Fixture
                </Button>
              </Grid>
              {fixtures
                .filter(f => f.universeId === activeUniverse)
                .map((fixture) => (
                  <Grid item xs={12} sm={6} key={fixture.id}>
                    <Card>
                      <CardHeader
                        title={fixture.name}
                        subheader={`${fixture.type} (ch${fixture.startChannel}-${fixture.startChannel + fixture.channelCount - 1})`}
                      />
                      <CardContent>
                        {Array.from({ length: fixture.channelCount }).map((_, i) => (
                          <Box key={i} sx={{ marginBottom: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                              <Typography variant="body2">
                                Channel {fixture.startChannel + i}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {Math.round(fixture.currentValues[i] || 0)}
                              </Typography>
                            </Box>
                            <Slider
                              min={0}
                              max={255}
                              step={1}
                              value={fixture.currentValues[i] || 0}
                              onChange={(e, value) => {
                                const newValue = [...fixture.currentValues];
                                newValue[i] = value;
                                const updatedFixture = { ...fixture, currentValues: newValue };
                                setFixtures(fixtures.map(f => f.id === fixture.id ? updatedFixture : f));
                                handleSetChannel(activeUniverse, fixture.startChannel + i, value);
                              }}
                            />
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Effects Control */}
      {activeUniverse && (
        <Accordion sx={{ marginTop: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Effects</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} sx={{ width: '100%' }}>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ marginBottom: 2 }}>
                  <InputLabel>Effect Type</InputLabel>
                  <Select
                    value={selectedEffect}
                    label="Effect Type"
                    onChange={(e) => setSelectedEffect(e.target.value)}
                  >
                    <MenuItem value="FADE">Fade</MenuItem>
                    <MenuItem value="CHASE">Chase</MenuItem>
                    <MenuItem value="STROBE">Strobe</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                {selectedEffect === 'FADE' && (
                  <Box>
                    <TextField
                      fullWidth
                      label="Channels (comma-separated)"
                      placeholder="1,2,3"
                      onChange={(e) =>
                        setEffectParams({
                          ...effectParams,
                          channels: e.target.value.split(',').map(Number)
                        })
                      }
                      sx={{ marginBottom: 2 }}
                    />
                    <Box sx={{ marginBottom: 2 }}>
                      <Typography>Target Value: {effectParams.targetValue}</Typography>
                      <Slider
                        min={0}
                        max={255}
                        step={1}
                        value={effectParams.targetValue}
                        onChange={(e, value) =>
                          setEffectParams({ ...effectParams, targetValue: value })
                        }
                      />
                    </Box>
                    <Box sx={{ marginBottom: 2 }}>
                      <Typography>Duration (ms): {effectParams.duration}</Typography>
                      <Slider
                        min={500}
                        max={10000}
                        step={100}
                        value={effectParams.duration}
                        onChange={(e, value) =>
                          setEffectParams({ ...effectParams, duration: value })
                        }
                      />
                    </Box>
                    <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleStartFade}>
                      Start Fade
                    </Button>
                  </Box>
                )}

                {selectedEffect === 'CHASE' && (
                  <Box>
                    <TextField
                      fullWidth
                      label="Channel Groups (comma-separated, e.g., 1,2 3,4)"
                      placeholder="1,2 3,4"
                      onChange={(e) => {
                        const groups = e.target.value.split(' ').map(group =>
                          group.split(',').map(Number)
                        );
                        setEffectParams({ ...effectParams, channelGroups: groups });
                      }}
                      sx={{ marginBottom: 2 }}
                    />
                    <Box sx={{ marginBottom: 2 }}>
                      <Typography>Speed (ms per step): {effectParams.duration}</Typography>
                      <Slider
                        min={100}
                        max={1000}
                        step={50}
                        value={effectParams.duration}
                        onChange={(e, value) =>
                          setEffectParams({ ...effectParams, duration: value })
                        }
                      />
                    </Box>
                    <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleStartChase}>
                      Start Chase
                    </Button>
                  </Box>
                )}

                {selectedEffect === 'STROBE' && (
                  <Box>
                    <TextField
                      fullWidth
                      label="Channels (comma-separated)"
                      placeholder="1,2,3"
                      onChange={(e) =>
                        setEffectParams({
                          ...effectParams,
                          channels: e.target.value.split(',').map(Number)
                        })
                      }
                      sx={{ marginBottom: 2 }}
                    />
                    <Box sx={{ marginBottom: 2 }}>
                      <Typography>Frequency (Hz): {effectParams.frequency}</Typography>
                      <Slider
                        min={1}
                        max={20}
                        step={1}
                        value={effectParams.frequency}
                        onChange={(e, value) =>
                          setEffectParams({ ...effectParams, frequency: value })
                        }
                      />
                    </Box>
                    <Box sx={{ marginBottom: 2 }}>
                      <Typography>Duration (ms): {effectParams.duration}</Typography>
                      <Slider
                        min={1000}
                        max={10000}
                        step={500}
                        value={effectParams.duration}
                        onChange={(e, value) =>
                          setEffectParams({ ...effectParams, duration: value })
                        }
                      />
                    </Box>
                    <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleStartStrobe}>
                      Start Strobe
                    </Button>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={handleStopAllEffects}
                  sx={{ marginTop: 2 }}
                >
                  Stop All Effects
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Universe Dialog */}
      <Dialog open={universeDialog} onClose={() => setUniverseDialog(false)}>
        <DialogTitle>Create DMX Universe</DialogTitle>
        <DialogContent>
          <Box sx={{ paddingTop: 2, minWidth: 400 }}>
            <TextField
              fullWidth
              label="Universe Name"
              value={newUniverse.name}
              onChange={(e) => setNewUniverse({ ...newUniverse, name: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>DMX Adapter</InputLabel>
              <Select
                value={newUniverse.adapterId}
                label="DMX Adapter"
                onChange={(e) => setNewUniverse({ ...newUniverse, adapterId: e.target.value })}
              >
                {adapters.map((adapter) => (
                  <MenuItem key={adapter.id} value={adapter.id}>
                    {adapter.name} ({adapter.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUniverseDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateUniverse} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fixture Dialog */}
      <Dialog open={fixtureDialog} onClose={() => setFixtureDialog(false)}>
        <DialogTitle>Create Fixture</DialogTitle>
        <DialogContent>
          <Box sx={{ paddingTop: 2, minWidth: 400 }}>
            <TextField
              fullWidth
              label="Fixture Name"
              value={newFixture.name}
              onChange={(e) => setNewFixture({ ...newFixture, name: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={newFixture.type}
                label="Type"
                onChange={(e) => setNewFixture({ ...newFixture, type: e.target.value })}
              >
                <MenuItem value="LIGHT">Light</MenuItem>
                <MenuItem value="MOVING_HEAD">Moving Head</MenuItem>
                <MenuItem value="PROJECTOR">Projector</MenuItem>
                <MenuItem value="STROBE">Strobe</MenuItem>
                <MenuItem value="FOG_MACHINE">Fog Machine</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Start Channel (1-512)"
              value={newFixture.startChannel}
              onChange={(e) => setNewFixture({ ...newFixture, startChannel: parseInt(e.target.value) })}
              margin="normal"
              inputProps={{ min: 1, max: 512 }}
            />
            <TextField
              fullWidth
              type="number"
              label="Channel Count"
              value={newFixture.channelCount}
              onChange={(e) => setNewFixture({ ...newFixture, channelCount: parseInt(e.target.value) })}
              margin="normal"
              inputProps={{ min: 1, max: 512 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFixtureDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateFixture} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EncoderDMXControl;
