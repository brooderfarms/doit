const EventEmitter = require('events');

/**
 * DMX512 Lighting Controller
 * Manages DMX universe(s) and lighting fixtures
 * Supports up to 32 universes with 512 channels each
 */
class DMXController extends EventEmitter {
  constructor() {
    super();
    this.universes = new Map();
    this.fixtures = new Map();
    this.scenes = new Map();
    this.effects = new Map();
    this.activeEffects = new Set();
    this.dmxAdapters = [];
  }

  /**
   * Discover available DMX adapters
   * @returns {Promise<Array>} Array of available DMX adapters
   */
  async getAvailableAdapters() {
    try {
      // Simulate DMX adapter discovery
      // In production, would use dmx npm package or similar
      const adapters = [
        {
          id: 'dmx-king-1',
          name: 'DMX King Interface',
          type: 'DMXKing',
          status: 'available'
        },
        {
          id: 'enttec-1',
          name: 'Enttec OpenDMX',
          type: 'ENTTEC',
          status: 'available'
        },
        {
          id: 'elation-1',
          name: 'Elation DMXIS',
          type: 'ELATION',
          status: 'available'
        }
      ];

      this.dmxAdapters = adapters;
      this.emit('adaptersDiscovered', adapters);
      return adapters;
    } catch (error) {
      console.error('[DMX] Error discovering adapters:', error);
      throw error;
    }
  }

  /**
   * Connect to a DMX universe via adapter
   * @param {string} universeId - Universe identifier
   * @param {string} adapterId - Adapter to use
   * @returns {Promise<Object>} Universe connection info
   */
  async connectUniverse(universeId, adapterId) {
    try {
      if (!this.dmxAdapters.find(a => a.id === adapterId)) {
        throw new Error(`Adapter ${adapterId} not found`);
      }

      const universe = {
        id: universeId,
        adapterId,
        number: this.universes.size,
        channels: new Array(512).fill(0),
        status: 'CONNECTED',
        createdAt: new Date(),
        lastUpdate: new Date()
      };

      this.universes.set(universeId, universe);
      this.emit('universeConnected', universe);

      console.log(`[DMX] Universe ${universeId} connected via adapter ${adapterId}`);
      return universe;
    } catch (error) {
      console.error('[DMX] Error connecting universe:', error);
      throw error;
    }
  }

  /**
   * Set a single DMX channel value
   * @param {string} universeId - Universe ID
   * @param {number} channel - Channel number (1-512)
   * @param {number} value - Channel value (0-255)
   */
  async setChannel(universeId, channel, value) {
    try {
      const universe = this.universes.get(universeId);
      if (!universe) {
        throw new Error(`Universe ${universeId} not found`);
      }

      if (channel < 1 || channel > 512) {
        throw new Error(`Channel must be between 1 and 512`);
      }

      if (value < 0 || value > 255) {
        throw new Error(`Value must be between 0 and 255`);
      }

      // Store the value (in production, send to actual DMX adapter)
      universe.channels[channel - 1] = value;
      universe.lastUpdate = new Date();

      this.emit('channelChanged', {
        universeId,
        channel,
        value,
        timestamp: new Date()
      });

      return { success: true, channel, value };
    } catch (error) {
      console.error('[DMX] Error setting channel:', error);
      throw error;
    }
  }

  /**
   * Set multiple channels at once
   * @param {string} universeId - Universe ID
   * @param {Object} channels - Map of {channel: value}
   */
  async setChannels(universeId, channels) {
    try {
      const universe = this.universes.get(universeId);
      if (!universe) {
        throw new Error(`Universe ${universeId} not found`);
      }

      const updates = [];
      for (const [channel, value] of Object.entries(channels)) {
        const ch = parseInt(channel);
        if (ch >= 1 && ch <= 512 && value >= 0 && value <= 255) {
          universe.channels[ch - 1] = value;
          updates.push({ channel: ch, value });
        }
      }

      universe.lastUpdate = new Date();
      this.emit('channelsChanged', {
        universeId,
        channels: updates,
        timestamp: new Date()
      });

      return { success: true, updatedCount: updates.length };
    } catch (error) {
      console.error('[DMX] Error setting channels:', error);
      throw error;
    }
  }

  /**
   * Define a fixture and its channels
   * @param {string} universeId - Universe ID
   * @param {string} fixtureName - Fixture name
   * @param {number} startChannel - First channel (1-512)
   * @param {number} channels - Number of channels used
   * @param {Object} profile - Fixture profile (optional)
   */
  setFixtureMapping(universeId, fixtureName, startChannel, channels, profile = {}) {
    try {
      const fixture = {
        id: `${universeId}-${fixtureName}`,
        name: fixtureName,
        universeId,
        startChannel,
        channels,
        profile: profile || {},
        currentValues: new Array(channels).fill(0),
        createdAt: new Date()
      };

      this.fixtures.set(fixture.id, fixture);
      this.emit('fixtureAdded', fixture);

      console.log(`[DMX] Fixture ${fixtureName} mapped to universe ${universeId} ch${startChannel}-${startChannel + channels - 1}`);
      return fixture;
    } catch (error) {
      console.error('[DMX] Error mapping fixture:', error);
      throw error;
    }
  }

  /**
   * Get all fixtures in a universe
   * @param {string} universeId - Universe ID
   * @returns {Array} Array of fixtures
   */
  getFixtures(universeId) {
    return Array.from(this.fixtures.values()).filter(f => f.universeId === universeId);
  }

  /**
   * Control a fixture's channels
   * @param {string} fixtureId - Fixture ID
   * @param {Object} values - Channel values {param: value}
   */
  async controlFixture(fixtureId, values) {
    try {
      const fixture = this.fixtures.get(fixtureId);
      if (!fixture) {
        throw new Error(`Fixture ${fixtureId} not found`);
      }

      const universe = this.universes.get(fixture.universeId);
      if (!universe) {
        throw new Error(`Universe ${fixture.universeId} not found`);
      }

      // Convert fixture parameters to DMX channels
      const channels = {};
      for (let i = 0; i < Object.keys(values).length; i++) {
        const value = Object.values(values)[i];
        const channelIndex = fixture.startChannel - 1 + i;
        channels[channelIndex] = value;
      }

      await this.setChannels(fixture.universeId, channels);

      fixture.currentValues = Object.values(values);
      this.emit('fixtureControlled', { fixtureId, values });

      return { success: true };
    } catch (error) {
      console.error('[DMX] Error controlling fixture:', error);
      throw error;
    }
  }

  /**
   * Save a lighting scene (preset)
   * @param {string} name - Scene name
   * @param {Object} sceneData - {universeId: {channel: value}}
   */
  saveScene(name, sceneData) {
    try {
      const scene = {
        id: `scene-${Date.now()}`,
        name,
        data: sceneData,
        createdAt: new Date()
      };

      this.scenes.set(scene.id, scene);
      this.emit('sceneSaved', scene);

      console.log(`[DMX] Scene "${name}" saved`);
      return scene;
    } catch (error) {
      console.error('[DMX] Error saving scene:', error);
      throw error;
    }
  }

  /**
   * Load and execute a lighting scene
   * @param {string} sceneId - Scene ID to load
   * @returns {Promise<Object>} Execution result
   */
  async loadScene(sceneId) {
    try {
      const scene = this.scenes.get(sceneId);
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`);
      }

      // Apply all channels from scene
      for (const [universeId, channels] of Object.entries(scene.data)) {
        await this.setChannels(universeId, channels);
      }

      this.emit('sceneLoaded', scene);
      console.log(`[DMX] Scene "${scene.name}" loaded and executed`);

      return { success: true, scene };
    } catch (error) {
      console.error('[DMX] Error loading scene:', error);
      throw error;
    }
  }

  /**
   * Start a fade effect on channels
   * @param {string} universeId - Universe ID
   * @param {Array} channels - Array of channel numbers
   * @param {number} targetValue - Target DMX value (0-255)
   * @param {number} duration - Duration in milliseconds
   */
  async startFade(universeId, channels, targetValue, duration = 3000) {
    try {
      const universe = this.universes.get(universeId);
      if (!universe) {
        throw new Error(`Universe ${universeId} not found`);
      }

      const effectId = `fade-${Date.now()}`;
      const effect = {
        id: effectId,
        type: 'FADE',
        universeId,
        channels,
        targetValue,
        duration,
        startTime: Date.now(),
        startValues: channels.map(ch => universe.channels[ch - 1])
      };

      this.effects.set(effectId, effect);
      this.activeEffects.add(effectId);

      const startTime = Date.now();
      const interval = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const updates = {};
        for (let i = 0; i < channels.length; i++) {
          const startVal = effect.startValues[i];
          const value = Math.round(startVal + (targetValue - startVal) * progress);
          updates[channels[i]] = value;
        }

        await this.setChannels(universeId, updates);

        if (progress >= 1) {
          clearInterval(interval);
          this.activeEffects.delete(effectId);
          this.emit('fadeComplete', effect);
        }
      }, 50);

      this.emit('fadeStarted', effect);
      return effectId;
    } catch (error) {
      console.error('[DMX] Error starting fade:', error);
      throw error;
    }
  }

  /**
   * Start a chase effect
   * @param {string} universeId - Universe ID
   * @param {Array} channelGroups - Array of channel groups to chase
   * @param {number} speed - Speed in milliseconds per step
   */
  async startChase(universeId, channelGroups, speed = 200) {
    try {
      const effectId = `chase-${Date.now()}`;
      const effect = {
        id: effectId,
        type: 'CHASE',
        universeId,
        channelGroups,
        speed,
        currentStep: 0,
        running: true
      };

      this.effects.set(effectId, effect);
      this.activeEffects.add(effectId);

      let step = 0;
      const interval = setInterval(async () => {
        if (!effect.running) {
          clearInterval(interval);
          this.activeEffects.delete(effectId);
          return;
        }

        // Turn off all channels
        const allChannels = channelGroups.flat();
        const updates = {};
        for (const ch of allChannels) {
          updates[ch] = 0;
        }

        // Turn on current step
        for (const ch of channelGroups[step % channelGroups.length]) {
          updates[ch] = 255;
        }

        await this.setChannels(universeId, updates);
        step++;
      }, speed);

      this.emit('chaseStarted', effect);
      return effectId;
    } catch (error) {
      console.error('[DMX] Error starting chase:', error);
      throw error;
    }
  }

  /**
   * Start a strobe effect
   * @param {string} universeId - Universe ID
   * @param {Array} channels - Channels to strobe
   * @param {number} frequency - Strobe frequency in Hz
   * @param {number} duration - Duration in milliseconds
   */
  async startStrobe(universeId, channels, frequency = 5, duration = Infinity) {
    try {
      const effectId = `strobe-${Date.now()}`;
      const period = 1000 / (frequency * 2); // Half-period for on/off

      const effect = {
        id: effectId,
        type: 'STROBE',
        universeId,
        channels,
        frequency,
        running: true,
        startTime: Date.now()
      };

      this.effects.set(effectId, effect);
      this.activeEffects.add(effectId);

      let isOn = false;
      const interval = setInterval(async () => {
        const elapsed = Date.now() - effect.startTime;
        if (elapsed > duration) {
          clearInterval(interval);
          this.activeEffects.delete(effectId);
          this.emit('strobeComplete', effect);
          return;
        }

        const updates = {};
        const value = isOn ? 255 : 0;
        for (const ch of channels) {
          updates[ch] = value;
        }

        await this.setChannels(universeId, updates);
        isOn = !isOn;
      }, period);

      this.emit('strobeStarted', effect);
      return effectId;
    } catch (error) {
      console.error('[DMX] Error starting strobe:', error);
      throw error;
    }
  }

  /**
   * Stop all active effects
   * @param {string} universeId - Universe ID (optional)
   */
  async stopAllEffects(universeId = null) {
    try {
      for (const effectId of this.activeEffects) {
        const effect = this.effects.get(effectId);
        if (!universeId || effect.universeId === universeId) {
          effect.running = false;
          this.activeEffects.delete(effectId);
        }
      }

      console.log(`[DMX] All effects stopped${universeId ? ` for universe ${universeId}` : ''}`);
      this.emit('effectsStopped', { universeId });
      return { success: true };
    } catch (error) {
      console.error('[DMX] Error stopping effects:', error);
      throw error;
    }
  }

  /**
   * Stop a specific effect
   * @param {string} effectId - Effect ID
   */
  async stopEffect(effectId) {
    try {
      const effect = this.effects.get(effectId);
      if (effect) {
        effect.running = false;
        this.activeEffects.delete(effectId);
      }
      return { success: true };
    } catch (error) {
      console.error('[DMX] Error stopping effect:', error);
      throw error;
    }
  }

  /**
   * Get universe status
   * @param {string} universeId - Universe ID
   * @returns {Object} Universe state
   */
  getUniverseStatus(universeId) {
    const universe = this.universes.get(universeId);
    if (!universe) {
      return null;
    }

    return {
      id: universe.id,
      status: universe.status,
      channels: universe.channels,
      lastUpdate: universe.lastUpdate,
      fixtures: this.getFixtures(universeId).length,
      activeEffects: Array.from(this.activeEffects).filter(
        id => this.effects.get(id).universeId === universeId
      ).length
    };
  }

  /**
   * Get all universes
   * @returns {Array} Array of universe statuses
   */
  getAllUniverses() {
    return Array.from(this.universes.values()).map(u => this.getUniverseStatus(u.id));
  }

  /**
   * Disconnect a universe
   * @param {string} universeId - Universe ID
   */
  async disconnectUniverse(universeId) {
    try {
      await this.stopAllEffects(universeId);
      
      const universe = this.universes.get(universeId);
      if (universe) {
        universe.status = 'DISCONNECTED';
        this.emit('universeDisconnected', universeId);
      }

      return { success: true };
    } catch (error) {
      console.error('[DMX] Error disconnecting universe:', error);
      throw error;
    }
  }

  /**
   * Get DMX channel values as DMX buffer
   * @param {string} universeId - Universe ID
   * @returns {Buffer} DMX512 buffer
   */
  getDMXBuffer(universeId) {
    const universe = this.universes.get(universeId);
    if (!universe) {
      throw new Error(`Universe ${universeId} not found`);
    }

    // Create DMX512 buffer (513 bytes: 1 start code + 512 data)
    const buffer = Buffer.alloc(513);
    buffer[0] = 0; // Start code

    for (let i = 0; i < 512; i++) {
      buffer[i + 1] = universe.channels[i];
    }

    return buffer;
  }

  /**
   * Get all scenes
   * @returns {Array} Array of scenes
   */
  getScenes() {
    return Array.from(this.scenes.values());
  }

  /**
   * Delete a scene
   * @param {string} sceneId - Scene ID
   */
  deleteScene(sceneId) {
    const deleted = this.scenes.delete(sceneId);
    if (deleted) {
      this.emit('sceneDeleted', sceneId);
    }
    return { success: deleted };
  }
}

module.exports = DMXController;
