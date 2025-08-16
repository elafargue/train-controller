/**
 * Test controller that emulates a real Arduino train controller for testing purposes
 * - Sends realistic random-walk values around the target speed/power with proper noise
 * - Maintains PID parameters and emulates PID behavior
 * - Emulates direction changes, stop commands, and all Arduino controller features
 * - Uses proper protocol with JSON messages matching the Arduino implementation
 */

const EventEmitter = require('events');

class TestController extends EventEmitter {
    constructor() {
        super();
        // Controller state matching Arduino defines
        this.currentSpeed = 0;      // Current speed PWM value (0-800, MAX_PWM = 800)
        this.currentDir = 's';      // Current direction (f/b/s for STOP/FWD/BCK)
        this.running = false;       // Is the controller running?
        this.updateInterval = null;
        
        // PID settings - matching Arduino defaults
        this.pidSettings = {
            kp: 0.40,    // Arduino default: double Kp=0.40
            ki: 1.45,    // Arduino default: double Ki=1.45  
            kd: 0.0,     // Arduino default: double Kd=0
            sample: 80   // Arduino default: int sampleTime = 80
        };
        
        // Controller settings
        this.updateRate = 300;      // Default serial update rate (ms)
        this.turnoutPulse = 20;     // Default turnout pulse length (ms)
        this.turnoutMaxOn = 2000;   // Default max accessory on time (ms)
        this.turnoutMax = 16;       // Max turnouts supported
        this.relays = 4;            // Number of relays supported
        
        // Emulation state for realistic behavior
        this.measured_rpm = 0;      // Current measured speed (BEMF simulation)
        this.target_rpm = 0;        // Target RPM for PID
        this.measured_current = 0;  // Current measurement simulation
        
        // Ring buffer simulation for moving averages (like Arduino BUFFER_SIZE 48)
        this.bufferSize = 48;
        this.ringBuffer = new Array(this.bufferSize).fill(0);
        this.ringBufferCurrent = new Array(this.bufferSize).fill(0);
        this.bufferIndex = 0;
        this.bufferIndexCurrent = 0;
        
        // For realistic random walk with inertia
        this.speedInertia = 0;      // Simulates train inertia
        this.loadVariation = 0;     // Simulates varying track conditions
        this.noiseLevel = 0.05;     // Base noise level
        
        // Message timing
        this.lastFreeram = 0;       // For freeram message timing (every 2 seconds like Arduino)
        
        console.log('Test controller initialized with Arduino-like parameters');
    }

    // Start the controller
    start() {
        this.running = true;
        if (this.updateInterval === null) {
            // Match Arduino update rate (default 300ms)
            this.updateInterval = setInterval(() => this.emulateValues(), this.updateRate);
        }
        console.log('Test controller started with update rate:', this.updateRate + 'ms');
    }

    // Stop the controller
    stop() {
        this.running = false;
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.currentSpeed = 0;
        this.currentDir = 's';
        // Reset ring buffers like Arduino does when stopping
        this.ringBuffer.fill(0);
        this.ringBufferCurrent.fill(0);
        this.target_rpm = 0;
        this.measured_rpm = 0;
        this.measured_current = 0;
        this.emulateValues(); // Send one last update
        console.log('Test controller stopped');
    }

    // Moving average calculation (like Arduino moving_avg function)
    movingAverage(buffer) {
        return buffer.reduce((sum, val) => sum + val, 0) / buffer.length;
    }

    // Add value to ring buffer (simulating Arduino ring buffer)
    addToRingBuffer(buffer, value, indexName) {
        buffer[this[indexName]] = value;
        this[indexName] = (this[indexName] + 1) % this.bufferSize;
        return this.movingAverage(buffer);
    }

    // Simulate PID-like behavior with realistic train physics
    simulateTrainPhysics() {
        if (this.currentDir === 's') {
            // When stopped, gradually reduce all values
            this.speedInertia *= 0.9;
            this.measured_rpm *= 0.95;
            this.measured_current *= 0.9;
            return;
        }

        // Simulate train inertia - trains don't change speed instantly
        const targetSpeed = this.currentSpeed;
        const speedDiff = targetSpeed - this.speedInertia;
        this.speedInertia += speedDiff * 0.1; // Gradual acceleration/deceleration

        // Add random load variations (hills, curves, etc.)
        this.loadVariation += (Math.random() - 0.5) * 0.02;
        this.loadVariation *= 0.98; // Decay the variation

        // Calculate base RPM from speed with load effects
        const baseRpm = this.speedInertia * (1 + this.loadVariation);
        
        // Add noise (BEMF measurement is very noisy on tiny locomotives)
        const noise = (Math.random() - 0.5) * this.noiseLevel * baseRpm;
        const instantRpm = Math.max(0, baseRpm + noise);

        // Add to ring buffer and get moving average (like Arduino)
        this.measured_rpm = this.addToRingBuffer(this.ringBuffer, instantRpm, 'bufferIndex');
        
        // Current measurement - proportional to speed with some noise
        const baseCurrent = Math.sqrt(this.speedInertia) * 0.8; // Non-linear like real motors
        const currentNoise = (Math.random() - 0.5) * 0.1;
        const instantCurrent = Math.max(0, baseCurrent + currentNoise);
        this.measured_current = this.addToRingBuffer(this.ringBufferCurrent, instantCurrent, 'bufferIndexCurrent');
        
        // Update target RPM (PID setpoint follows measured when speed changes)
        if (Math.abs(this.currentSpeed - this.target_rpm) > 0.1) {
            this.target_rpm += (this.measured_rpm - this.target_rpm) * 0.05;
        }
    }

    // Emulate controller values with realistic Arduino-like behavior
    emulateValues() {
        // Simulate train physics
        this.simulateTrainPhysics();

        // Create message data matching Arduino createMessage() function
        const data = {
            // Note: Arduino converts current in mA and rpm in mV
            bemf: Math.round(this.measured_rpm * 3.3 * 3 / 1024 * 1000), // Convert to mV like Arduino
            target: Math.round(this.target_rpm * 3.3 * 3 / 1024 * 1000),   // Convert to mV like Arduino
            rate: Math.round(this.currentSpeed),                           // PWM rate (0-800)
            current: Math.round(this.measured_current * 1000 / 1024)       // Convert to mA like Arduino
        };

        // Add direction every ~2 seconds like Arduino (when fr_print condition triggers)
        const now = Date.now();
        if (now - this.lastFreeram > 2000) {
            data.dir = this.currentDir;
            data.freeram = Math.floor(Math.random() * 200) + 1500; // Simulate free RAM
            this.lastFreeram = now;
        }

        // Emit the data if we have a callback registered
        if (this.onDataCallback) {
            this.onDataCallback(data);
        }
    }

    // Process JSON commands like Arduino processMessage() function
    processCommand(cmdStr) {
        console.log('Test controller processing command:', cmdStr);
        
        try {
            const cmd = JSON.parse(cmdStr);
            
            // Echo the command first (like Arduino does)
            if (this.onDataCallback) {
                this.onDataCallback(cmd);
            }

            // Process speed command
            if (cmd.speed !== undefined) {
                const newSpeed = Math.max(0, Math.min(100, parseInt(cmd.speed)));
                const mappedSpeed = Math.floor(newSpeed * 8); // Map 0-100 to 0-800 like Arduino
                
                // Simulate the change_speed function with gradual transitions
                this.gradualSpeedChange(mappedSpeed);
                
                // Send acknowledgment
                this.sendAck('speed');
                return;
            }

            // Process direction command  
            if (cmd.dir !== undefined) {
                const newDir = cmd.dir;
                if (['f', 'b', 's'].includes(newDir)) {
                    this.currentDir = newDir;
                    
                    if (newDir === 's') {
                        this.stop();
                    } else if (!this.running) {
                        this.start();
                    }
                    
                    this.sendAck('dir');
                    console.log('Direction changed to:', newDir);
                    return;
                }
            }

            // Process PID command
            if (cmd.pid !== undefined) {
                const pid = cmd.pid;
                if (pid.kp !== undefined && pid.ki !== undefined && 
                    pid.kd !== undefined && pid.sample !== undefined) {
                    
                    this.pidSettings.kp = parseFloat(pid.kp);
                    this.pidSettings.ki = parseFloat(pid.ki);
                    this.pidSettings.kd = parseFloat(pid.kd);
                    this.pidSettings.sample = parseInt(pid.sample);
                    
                    this.sendAck('pid');
                    console.log('PID updated:', this.pidSettings);
                    return;
                }
            }

            // Process get commands
            if (cmd.get !== undefined) {
                this.handleGetCommand(cmd.get);
                return;
            }

            // Process set commands
            if (cmd.set !== undefined) {
                this.handleSetCommand(cmd.set);
                return;
            }

            // Process accessory commands (basic simulation)
            if (cmd.acc !== undefined) {
                this.handleAccessoryCommand(cmd.acc);
                return;
            }

            // Process relay commands (basic simulation)
            if (cmd.rel !== undefined) {
                this.handleRelayCommand(cmd.rel);
                return;
            }

        } catch (err) {
            console.log('JSON parse error in test controller:', err);
            // Send JSON syntax error like Arduino
            if (this.onDataCallback) {
                this.onDataCallback({ error: "json" });
            }
        }
    }

    // Gradual speed change simulation (like Arduino change_speed function)
    gradualSpeedChange(newSpeed) {
        const currentSpeed = this.currentSpeed;
        const step = 8; // Arduino uses step of 8
        const steps = Math.abs(newSpeed - currentSpeed) / step;
        
        if (steps > 1) {
            let currentStep = currentSpeed;
            const direction = newSpeed > currentSpeed ? step : -step;
            
            const changeInterval = setInterval(() => {
                currentStep += direction;
                
                if ((direction > 0 && currentStep >= newSpeed) || 
                    (direction < 0 && currentStep <= newSpeed)) {
                    clearInterval(changeInterval);
                    this.currentSpeed = newSpeed;
                } else {
                    this.currentSpeed = currentStep;
                }
            }, 15); // Arduino uses 15ms delay
        } else {
            this.currentSpeed = newSpeed;
        }
        
        // After speed change, update target (like Arduino does)
        setTimeout(() => {
            this.target_rpm = this.measured_rpm;
        }, 1000); // Arduino waits 1000ms for train to settle
    }

    // Send acknowledgment message
    sendAck(command) {
        if (this.onDataCallback) {
            this.onDataCallback({
                ack: true,
                cmd: command
            });
        }
    }

    // Send error message
    sendError(command) {
        if (this.onDataCallback) {
            this.onDataCallback({
                ack: false,
                cmd: command
            });
        }
    }

    // Handle get commands (matching Arduino get commands)
    handleGetCommand(getParam) {
        switch(getParam) {
            case 'pid':
                this.onDataCallback({
                    kp: this.pidSettings.kp,
                    ki: this.pidSettings.ki, 
                    kd: this.pidSettings.kd,
                    sample: this.pidSettings.sample
                });
                break;
            case 'accp':
                this.onDataCallback({ accp: this.turnoutPulse });
                break;
            case 'accm':
                this.onDataCallback({ accm: this.turnoutMaxOn });
                break;
            case 'updt':
                this.onDataCallback({ updt: this.updateRate });
                break;
            case 'turnouts':
                this.onDataCallback({ turnouts: this.turnoutMax });
                break;
            case 'relays':
                this.onDataCallback({ relays: this.relays });
                break;
            case 'post':
                this.onDataCallback({ post: "PASS" }); // Simulate successful POST
                break;
            case 'ports':
                // Simulate accessory port status (all connected for testing)
                const ports = new Array(32).fill(1); 
                this.onDataCallback({ ports: ports });
                break;
            default:
                this.sendError('get');
        }
    }

    // Handle set commands
    handleSetCommand(setParams) {
        if (setParams.updt !== undefined) {
            const newRate = parseInt(setParams.updt);
            if (newRate >= 100) { // Arduino minimum is 100ms
                this.updateRate = newRate;
                // Restart interval with new rate
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                    this.updateInterval = setInterval(() => this.emulateValues(), this.updateRate);
                }
                this.sendAck('set');
            } else {
                this.sendError('set');
            }
            return;
        }
        
        if (setParams.accp !== undefined) {
            const val = parseInt(setParams.accp);
            if (val >= 5 && val <= 200) { // Arduino limits: 5-200ms
                this.turnoutPulse = val;
                this.sendAck('set');
            } else {
                this.sendError('set');
            }
            return;
        }
        
        if (setParams.accm !== undefined) {
            const val = parseInt(setParams.accm);
            if (val <= 2000) { // Arduino limit: max 2000ms
                this.turnoutMaxOn = val;
                this.sendAck('set');
            } else {
                this.sendError('set');
            }
            return;
        }
        
        this.sendError('set');
    }

    // Handle accessory commands (basic simulation)
    handleAccessoryCommand(acc) {
        if (acc.id !== undefined && acc.port !== undefined && acc.cmd !== undefined) {
            const id = parseInt(acc.id);
            const port = parseInt(acc.port);
            const cmd = acc.cmd;
            
            if (id >= 1 && id <= this.turnoutMax && port >= 0 && port <= 1) {
                if (['p', 'on', 'off'].includes(cmd)) {
                    console.log(`Accessory ${id} port ${port} command ${cmd}`);
                    this.sendAck('acc');
                    return;
                }
            }
        }
        this.sendError('acc');
    }

    // Handle relay commands (basic simulation)  
    handleRelayCommand(rel) {
        if (rel.id !== undefined && rel.cmd !== undefined) {
            const id = parseInt(rel.id);
            const cmd = rel.cmd;
            
            if (id >= 1 && id <= this.relays) {
                if (['on', 'off'].includes(cmd)) {
                    console.log(`Relay ${id} command ${cmd}`);
                    this.sendAck('rel');
                    return;
                }
            }
        }
        this.sendError('rel');
    }

    // Register data callback (for server.js to receive messages)
    set onData(callback) {
        this.onDataCallback = callback;
    }

    // For compatibility with old interface
    setSpeed(speed) {
        console.log('Legacy setSpeed called:', speed);
        this.processCommand(JSON.stringify({ speed: speed }));
    }

    setDirection(dir) {
        console.log('Legacy setDirection called:', dir);
        this.processCommand(JSON.stringify({ dir: dir }));
    }

    setPID(kp, ki, kd, sample) {
        console.log('Legacy setPID called:', kp, ki, kd, sample);
        this.processCommand(JSON.stringify({ 
            pid: { kp: kp, ki: ki, kd: kd, sample: sample }
        }));
    }

    getPID() {
        console.log('Legacy getPID called');
        this.processCommand(JSON.stringify({ get: "pid" }));
    }

    // Clean up
    close() {
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('Test controller closed');
        // Emit close event to match real serial port behavior
        this.emit('close');
    }
}

module.exports = TestController;
