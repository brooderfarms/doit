/**
 * MIDI Device Controller for ShashaStream Encoder
 * Controls MIDI-compatible devices (mixers, cameras, lighting controllers)
 */

const midi = require('midi');

class MIDIController {
  constructor() {
    this.output = null;
    this.input = null;
    this.devices = []
    this.mappings = {} // Device ID -> MIDI commands
    this.isConnected = false
  }

  /**
   * Initialize MIDI output
   */
  initOutput() {
    try {
      this.output = new midi.output()
      return true
    } catch (err) {
      console.error('Failed to initialize MIDI output:', err)
      return false
    }
  }

  /**
   * Initialize MIDI input (for feedback)
   */
  initInput() {
    try {
      this.input = new midi.input()
      this.input.on('message', (deltaTime, message) => {
        this.handleMIDIMessage(message)
      })
      return true
    } catch (err) {
      console.error('Failed to initialize MIDI input:', err)
      return false
    }
  }

  /**
   * Get available MIDI outputs (devices)
   */
  getAvailableDevices() {
    if (!this.output) {
      this.initOutput()
    }

    const devices = []
    const portCount = this.output.getPortCount()

    for (let i = 0; i < portCount; i++) {
      devices.push({
        id: i,
        name: this.output.getPortName(i),
        type: 'output'
      })
    }

    this.devices = devices
    return devices
  }

  /**
   * Connect to MIDI device
   */
  connectDevice(deviceId) {
    try {
      if (!this.output) {
        this.initOutput()
      }

      this.output.openPort(deviceId)
      this.isConnected = true
      console.log(`Connected to MIDI device: ${this.getAvailableDevices()[deviceId]?.name}`)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Send MIDI command to device
   */
  sendMIDICommand(channel, controller, value) {
    try {
      if (!this.output || !this.isConnected) {
        return { success: false, error: 'MIDI device not connected' }
      }

      // MIDI Control Change message
      // Status byte: 0xB0 (control change) + channel (0-15)
      // Data byte 1: Controller number (0-127)
      // Data byte 2: Value (0-127)

      const statusByte = 0xB0 + (channel - 1) // Channel 1-16 mapped to 0-15
      const message = [statusByte, controller, value]

      this.output.sendMessage(message)
      console.log(`MIDI sent - Channel: ${channel}, Controller: ${controller}, Value: ${value}`)

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Send program change (scene selection on mixer)
   */
  sendProgramChange(channel, programNumber) {
    try {
      if (!this.output || !this.isConnected) {
        return { success: false, error: 'MIDI device not connected' }
      }

      const statusByte = 0xC0 + (channel - 1) // Program change + channel
      const message = [statusByte, programNumber]

      this.output.sendMessage(message)
      console.log(`Program change sent - Channel: ${channel}, Program: ${programNumber}`)

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Send note on/off (for buttons, triggers)
   */
  sendNote(channel, note, velocity = 127, isNoteOn = true) {
    try {
      if (!this.output || !this.isConnected) {
        return { success: false, error: 'MIDI device not connected' }
      }

      const statusByte = (isNoteOn ? 0x90 : 0x80) + (channel - 1)
      const message = [statusByte, note, velocity]

      this.output.sendMessage(message)
      console.log(`Note ${isNoteOn ? 'on' : 'off'} sent - Channel: ${channel}, Note: ${note}`)

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Create device mapping (friendly names -> MIDI commands)
   */
  createMapping(deviceId, mappingName, midiCommands) {
    this.mappings[mappingName] = {
      deviceId,
      commands: midiCommands // Array of {channel, controller, value, name}
    }
    return { success: true, mappingId: mappingName }
  }

  /**
   * Execute mapped device command
   */
  executeMapping(mappingName) {
    try {
      const mapping = this.mappings[mappingName]
      if (!mapping) {
        return { success: false, error: 'Mapping not found' }
      }

      const results = []
      for (const cmd of mapping.commands) {
        const result = this.sendMIDICommand(cmd.channel, cmd.controller, cmd.value)
        results.push({
          command: cmd.name,
          success: result.success,
          error: result.error
        })
      }

      return { success: true, commands: results }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Handle incoming MIDI messages (feedback from devices)
   */
  handleMIDIMessage(message) {
    const [statusByte, data1, data2] = message
    const messageType = statusByte & 0xF0
    const channel = (statusByte & 0x0F) + 1

    console.log(`MIDI received - Type: ${messageType.toString(16)}, Channel: ${channel}, Data: ${data1}, ${data2}`)

    // Could emit events here for UI updates
  }

  /**
   * Disconnect from MIDI device
   */
  disconnect() {
    try {
      if (this.output) {
        this.output.closePort()
      }
      if (this.input) {
        this.input.closePort()
      }
      this.isConnected = false
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Get all saved mappings
   */
  getMappings() {
    return Object.keys(this.mappings).map(key => ({
      name: key,
      ...this.mappings[key]
    }))
  }
}

module.exports = MIDIController
