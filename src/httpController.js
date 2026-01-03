const EventEmitter = require('events');
const dgram = require('dgram');
const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * HTTP Device Controller
 * Manages network-based devices: cameras, switchers, relays, displays
 * Supports ONVIF, PTZ, GPIO, webhooks, and generic HTTP APIs
 */
class HTTPDeviceController extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
    this.connections = new Map();
    this.webhooks = new Map();
    this.automations = new Map();
    this.profiles = new Map();
    this.loadBuiltInProfiles();
  }

  /**
   * Load built-in device profiles
   */
  loadBuiltInProfiles() {
    this.profiles.set('onvif-generic', {
      type: 'CAMERA',
      protocol: 'http',
      endpoints: {
        status: '/onvif/device_service',
        ptz: '/onvif/ptz_service'
      },
      discovery: {
        method: 'onvif',
        port: 8080
      }
    });

    this.profiles.set('ptzoptics-camera', {
      type: 'CAMERA',
      protocol: 'http',
      endpoints: {
        pan: '/cgi-bin/ptzctl?command=:pan_value',
        tilt: '/cgi-bin/ptzctl?command=:tilt_value',
        zoom: '/cgi-bin/ptzctl?command=:zoom_value',
        status: '/usr/status.cgi'
      },
      discovery: {
        method: 'http',
        port: 80,
        probe: '/usr/status.cgi'
      }
    });

    this.profiles.set('generic-relay', {
      type: 'RELAY',
      protocol: 'http',
      endpoints: {
        on: '/relay?state=1&relay=:relay_number',
        off: '/relay?state=0&relay=:relay_number',
        status: '/status',
        toggle: '/relay?toggle=:relay_number'
      }
    });

    this.profiles.set('generic-hdmi-switcher', {
      type: 'SWITCHER',
      protocol: 'http',
      endpoints: {
        switch: '/switch?input=:input_number',
        status: '/status'
      }
    });

    console.log('[HTTP] Built-in profiles loaded');
  }

  /**
   * Discover devices on network using multiple methods
   * @returns {Promise<Array>} Array of discovered devices
   */
  async discoverDevices(options = {}) {
    try {
      const {
        subnet = '192.168.1',
        timeout = 2000,
        onvif = true,
        mdns = true,
        http = true
      } = options;

      const discovered = [];

      if (onvif) {
        console.log('[HTTP] Scanning for ONVIF cameras...');
        const onvifDevices = await this.discoverOnvifCameras(timeout);
        discovered.push(...onvifDevices);
      }

      if (http) {
        console.log('[HTTP] Scanning HTTP devices...');
        const httpDevices = await this.scanSubnetHttp(subnet, timeout);
        discovered.push(...httpDevices);
      }

      if (mdns) {
        console.log('[HTTP] Scanning mDNS...');
        const mdnsDevices = await this.discoverMdns(timeout);
        discovered.push(...mdnsDevices);
      }

      this.emit('devicesDiscovered', discovered);
      return discovered;
    } catch (error) {
      console.error('[HTTP] Error discovering devices:', error);
      throw error;
    }
  }

  /**
   * Discover ONVIF-compliant cameras
   * @returns {Promise<Array>} ONVIF cameras
   */
  async discoverOnvifCameras(timeout = 2000) {
    return new Promise((resolve) => {
      const cameras = [];
      const socket = dgram.createSocket('udp4');
      const message = Buffer.from(
        'M-SEARCH * HTTP/1.1\r\n' +
        'HOST: 239.255.255.250:1900\r\n' +
        'MAN: "ssdp:discover"\r\n' +
        'MX: 2\r\n' +
        'ST: urn:schemas-onvif-org:service:Device:1\r\n' +
        '\r\n'
      );

      socket.on('message', (msg) => {
        const response = msg.toString();
        const locationMatch = response.match(/LOCATION:\s*([^\r\n]+)/i);
        if (locationMatch) {
          const url = locationMatch[1];
          const ipMatch = url.match(/https?:\/\/([^/:]+)/);
          if (ipMatch) {
            cameras.push({
              ip: ipMatch[1],
              type: 'CAMERA',
              protocol: 'onvif',
              url
            });
          }
        }
      });

      socket.on('error', (err) => {
        console.error('[HTTP] mDNS error:', err);
      });

      socket.bind(0, () => {
        socket.setMulticastInterface('0.0.0.0');
        socket.addMembership('239.255.255.250');
      });

      setTimeout(() => {
        socket.close();
        resolve(cameras);
      }, timeout);
    });
  }

  /**
   * Scan subnet for HTTP devices
   * @param {string} subnet - Subnet to scan (e.g., "192.168.1")
   * @param {number} timeout - Request timeout
   * @returns {Promise<Array>} Discovered HTTP devices
   */
  async scanSubnetHttp(subnet = '192.168.1', timeout = 2000) {
    const devices = [];
    const ports = [80, 8080, 8000];
    const promises = [];

    // Scan common IP range (1-254)
    for (let i = 1; i <= 254; i += 10) { // Sample every 10th IP for speed
      for (const port of ports) {
        const ip = `${subnet}.${i}`;
        promises.push(
          this.probeDevice(ip, port, 'http', timeout)
            .then(device => {
              if (device) devices.push(device);
            })
            .catch(() => { /* Silently ignore */ })
        );
      }
    }

    await Promise.all(promises);
    return devices;
  }

  /**
   * Probe specific device
   * @param {string} ip - IP address
   * @param {number} port - Port number
   * @param {string} protocol - Protocol (http/https)
   * @param {number} timeout - Request timeout
   * @returns {Promise<Object|null>} Device info or null
   */
  async probeDevice(ip, port, protocol = 'http', timeout = 2000) {
    return new Promise((resolve) => {
      const url = `${protocol}://${ip}:${port}/`;
      const timeoutId = setTimeout(() => resolve(null), timeout);

      const client = protocol === 'https' ? https : http;
      const req = client.get(
        url,
        { timeout },
        (res) => {
          clearTimeout(timeoutId);
          const device = {
            ip,
            port,
            protocol,
            status: 'ONLINE',
            statusCode: res.statusCode,
            headers: res.headers
          };
          resolve(device);
        }
      );

      req.on('error', () => {
        clearTimeout(timeoutId);
        resolve(null);
      });

      req.on('timeout', () => {
        clearTimeout(timeoutId);
        req.abort();
        resolve(null);
      });
    });
  }

  /**
   * Discover mDNS devices
   * @param {number} timeout - Discovery timeout
   * @returns {Promise<Array>} mDNS devices
   */
  async discoverMdns(timeout = 2000) {
    // mDNS discovery would require mdns package
    // For now, return empty array
    return [];
  }

  /**
   * Register a device
   * @param {Object} config - Device configuration
   * @returns {Object} Registered device
   */
  registerDevice(config) {
    try {
      const {
        id = `device-${Date.now()}`,
        name,
        type,
        ip,
        port = 80,
        protocol = 'http',
        username,
        password,
        profile
      } = config;

      const device = {
        id,
        name,
        type,
        ip,
        port,
        protocol,
        username,
        password,
        profile,
        status: 'OFFLINE',
        lastSeen: null,
        createdAt: new Date()
      };

      this.devices.set(id, device);
      this.emit('deviceRegistered', device);

      console.log(`[HTTP] Device registered: ${name} (${ip}:${port})`);
      return device;
    } catch (error) {
      console.error('[HTTP] Error registering device:', error);
      throw error;
    }
  }

  /**
   * Get device by ID
   * @param {string} deviceId - Device ID
   * @returns {Object} Device configuration
   */
  getDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    return device;
  }

  /**
   * Get device status
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} Device status
   */
  async getDeviceStatus(deviceId) {
    try {
      const device = this.getDevice(deviceId);
      const url = `${device.protocol}://${device.ip}:${device.port}/status`;

      return new Promise((resolve, reject) => {
        const client = device.protocol === 'https' ? https : http;
        const req = client.get(url, { timeout: 5000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            device.status = 'ONLINE';
            device.lastSeen = new Date();
            this.emit('deviceStatusUpdate', { deviceId, status: 'ONLINE' });
            resolve({ status: 'ONLINE', data });
          });
        });

        req.on('error', (err) => {
          device.status = 'OFFLINE';
          this.emit('deviceStatusUpdate', { deviceId, status: 'OFFLINE' });
          reject(err);
        });

        req.on('timeout', () => {
          req.abort();
          reject(new Error('Device timeout'));
        });
      });
    } catch (error) {
      console.error('[HTTP] Error getting device status:', error);
      throw error;
    }
  }

  /**
   * Send HTTP command to device
   * @param {string} deviceId - Device ID
   * @param {string} command - Command name
   * @param {Object} parameters - Command parameters
   * @returns {Promise<Object>} Command response
   */
  async sendHttpCommand(deviceId, command, parameters = {}) {
    try {
      const device = this.getDevice(deviceId);
      const profile = device.profile ? this.profiles.get(device.profile) : null;

      if (!profile || !profile.endpoints[command]) {
        throw new Error(`Command ${command} not supported for this device`);
      }

      let endpoint = profile.endpoints[command];
      
      // Replace parameters in endpoint
      for (const [key, value] of Object.entries(parameters)) {
        endpoint = endpoint.replace(`:${key}`, value);
      }

      const url = `${device.protocol}://${device.ip}:${device.port}${endpoint}`;
      
      return new Promise((resolve, reject) => {
        const client = device.protocol === 'https' ? https : http;
        const req = client.get(url, { timeout: 5000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            this.emit('commandExecuted', {
              deviceId,
              command,
              status: 'SUCCESS'
            });
            resolve({ status: 'SUCCESS', data, statusCode: res.statusCode });
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.abort();
          reject(new Error('Command timeout'));
        });
      });
    } catch (error) {
      console.error('[HTTP] Error sending command:', error);
      throw error;
    }
  }

  /**
   * Control PTZ camera
   * @param {string} deviceId - Camera device ID
   * @param {number} pan - Pan value (-100 to +100)
   * @param {number} tilt - Tilt value (-100 to +100)
   * @param {number} zoom - Zoom value (1.0 to 10.0)
   * @returns {Promise<Object>} Command result
   */
  async controlPTZ(deviceId, pan, tilt, zoom) {
    try {
      const commands = [];

      if (pan !== undefined) {
        commands.push(
          this.sendHttpCommand(deviceId, 'pan', { pan_value: pan })
        );
      }

      if (tilt !== undefined) {
        commands.push(
          this.sendHttpCommand(deviceId, 'tilt', { tilt_value: tilt })
        );
      }

      if (zoom !== undefined) {
        commands.push(
          this.sendHttpCommand(deviceId, 'zoom', { zoom_value: zoom })
        );
      }

      const results = await Promise.all(commands);
      
      this.emit('ptzControlled', {
        deviceId,
        pan,
        tilt,
        zoom
      });

      return { success: true, results };
    } catch (error) {
      console.error('[HTTP] PTZ control error:', error);
      throw error;
    }
  }

  /**
   * Control relay output
   * @param {string} deviceId - Relay device ID
   * @param {number} relayNumber - Relay number (1-16)
   * @param {string} action - ON, OFF, or TOGGLE
   * @returns {Promise<Object>} Command result
   */
  async controlRelay(deviceId, relayNumber, action = 'TOGGLE') {
    try {
      const device = this.getDevice(deviceId);
      const profile = this.profiles.get(device.profile);

      if (!profile || device.type !== 'RELAY') {
        throw new Error('Device is not a relay controller');
      }

      const commandName = action.toLowerCase();
      const result = await this.sendHttpCommand(
        deviceId,
        commandName,
        { relay_number: relayNumber }
      );

      this.emit('relayControlled', {
        deviceId,
        relayNumber,
        action
      });

      return result;
    } catch (error) {
      console.error('[HTTP] Relay control error:', error);
      throw error;
    }
  }

  /**
   * Register webhook for device events
   * @param {string} deviceId - Device ID
   * @param {string} event - Event type (ONLINE, OFFLINE, ERROR, COMMAND)
   * @param {string} webhookUrl - URL to POST to
   * @param {Object} options - Additional options
   * @returns {Object} Webhook registration
   */
  registerWebhook(deviceId, event, webhookUrl, options = {}) {
    try {
      const webhookId = `webhook-${Date.now()}`;
      const webhook = {
        id: webhookId,
        deviceId,
        event,
        webhookUrl,
        retries: options.retries || 3,
        timeout: options.timeout || 5000,
        headers: options.headers || {},
        isActive: true,
        createdAt: new Date()
      };

      this.webhooks.set(webhookId, webhook);
      this.emit('webhookRegistered', webhook);

      console.log(`[HTTP] Webhook registered for ${event} on device ${deviceId}`);
      return webhook;
    } catch (error) {
      console.error('[HTTP] Error registering webhook:', error);
      throw error;
    }
  }

  /**
   * Trigger webhook
   * @param {string} deviceId - Device ID
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  async triggerWebhook(deviceId, event, data = {}) {
    try {
      const device = this.getDevice(deviceId);
      const relevantWebhooks = Array.from(this.webhooks.values()).filter(
        w => w.deviceId === deviceId && w.event === event && w.isActive
      );

      for (const webhook of relevantWebhooks) {
        this.deliverWebhook(webhook, { device, event, data });
      }
    } catch (error) {
      console.error('[HTTP] Error triggering webhook:', error);
    }
  }

  /**
   * Deliver webhook with retry logic
   * @param {Object} webhook - Webhook configuration
   * @param {Object} payload - Data to send
   */
  async deliverWebhook(webhook, payload, retries = 0) {
    try {
      const url = new URL(webhook.webhookUrl);
      const client = url.protocol === 'https:' ? https : http;

      const postData = JSON.stringify(payload);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...webhook.headers
        },
        timeout: webhook.timeout
      };

      return new Promise((resolve, reject) => {
        const req = client.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            this.emit('webhookDelivered', {
              webhookId: webhook.id,
              statusCode: res.statusCode
            });
            resolve({ statusCode: res.statusCode, body });
          });
        });

        req.on('error', async (err) => {
          if (retries < webhook.retries) {
            console.log(`[HTTP] Retrying webhook delivery (${retries + 1}/${webhook.retries})`);
            setTimeout(() => {
              this.deliverWebhook(webhook, payload, retries + 1)
                .then(resolve)
                .catch(reject);
            }, 1000 * (retries + 1));
          } else {
            this.emit('webhookFailed', {
              webhookId: webhook.id,
              error: err.message
            });
            reject(err);
          }
        });

        req.on('timeout', () => {
          req.abort();
          if (retries < webhook.retries) {
            setTimeout(() => {
              this.deliverWebhook(webhook, payload, retries + 1)
                .then(resolve)
                .catch(reject);
            }, 1000 * (retries + 1));
          } else {
            reject(new Error('Webhook timeout'));
          }
        });

        req.write(postData);
        req.end();
      });
    } catch (error) {
      console.error('[HTTP] Error delivering webhook:', error);
      throw error;
    }
  }

  /**
   * Create automation
   * @param {string} deviceId - Device ID
   * @param {Object} config - Automation configuration
   * @returns {Object} Automation
   */
  createAutomation(deviceId, config) {
    try {
      const {
        name,
        trigger,        // SCHEDULE, EVENT, MANUAL
        condition,      // Conditional logic
        actions         // Array of actions to execute
      } = config;

      const automation = {
        id: `auto-${Date.now()}`,
        deviceId,
        name,
        trigger,
        condition,
        actions,
        isEnabled: true,
        executedCount: 0,
        lastExecuted: null,
        createdAt: new Date()
      };

      this.automations.set(automation.id, automation);
      this.emit('automationCreated', automation);

      console.log(`[HTTP] Automation created: ${name}`);
      return automation;
    } catch (error) {
      console.error('[HTTP] Error creating automation:', error);
      throw error;
    }
  }

  /**
   * Execute automation
   * @param {string} automationId - Automation ID
   * @returns {Promise<Object>} Execution result
   */
  async executeAutomation(automationId) {
    try {
      const automation = this.automations.get(automationId);
      if (!automation) {
        throw new Error(`Automation ${automationId} not found`);
      }

      const results = [];
      for (const action of automation.actions) {
        try {
          const result = await this.executeAction(action);
          results.push({ action: action.name, status: 'SUCCESS', result });
        } catch (err) {
          results.push({ action: action.name, status: 'ERROR', error: err.message });
        }
      }

      automation.executedCount++;
      automation.lastExecuted = new Date();

      this.emit('automationExecuted', {
        automationId,
        results
      });

      return { success: true, results };
    } catch (error) {
      console.error('[HTTP] Error executing automation:', error);
      throw error;
    }
  }

  /**
   * Execute individual action
   * @param {Object} action - Action configuration
   * @returns {Promise<Object>} Action result
   */
  async executeAction(action) {
    const { type, deviceId, command, parameters } = action;

    switch (type) {
      case 'COMMAND':
        return await this.sendHttpCommand(deviceId, command, parameters);
      case 'PTZ':
        return await this.controlPTZ(deviceId, parameters.pan, parameters.tilt, parameters.zoom);
      case 'RELAY':
        return await this.controlRelay(deviceId, parameters.relayNumber, parameters.action);
      case 'DELAY':
        return new Promise(resolve => setTimeout(() => resolve({ type: 'DELAY', ms: parameters.ms }), parameters.ms));
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  /**
   * Get all devices
   * @returns {Array} All registered devices
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Remove device
   * @param {string} deviceId - Device ID
   */
  removeDevice(deviceId) {
    this.devices.delete(deviceId);
    this.emit('deviceRemoved', deviceId);
  }

  /**
   * Get device profile
   * @param {string} profileId - Profile ID
   * @returns {Object} Profile configuration
   */
  getProfile(profileId) {
    return this.profiles.get(profileId);
  }

  /**
   * List all available profiles
   * @returns {Array} Available profiles
   */
  listProfiles() {
    return Array.from(this.profiles.values());
  }
}

module.exports = HTTPDeviceController;
