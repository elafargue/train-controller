/**
 * This is a test to experiment with L293D drivers on a Z-Scale train, nothing fancy
 * (c) Ed Lafargue 2013
 * Licence: GPLv3
 *
 * This is a simple model train controller that includes speed regulation using a
 * PID controller.
 *
 * Issue with traditional driving of motor by PWM'ing the EN pin: when EN is low,
 *       the motor actively brakes, which lowers efficiency. This design improves it as it
 *       does not put both motor connectors in HiZ at the same time. so the motor is freerunning.
 *
 *  In this version, we are able to change the direction but still measure BackEMF
 *  easily, without braking the motor when EN is switched off. The drawback is that we
 *  use an extra EN pin on the L293D.
 *
 *  TODO:
 *    - implement digital filtering rather than rolling averages
 *
 *  ONGOING:
 *    - implement point and accessory control
 *
 * 2013.03.06: add SPI library to control a 75HC595 for quick prototyping
 */
 
/* We use the Timer1 library to get more options on PWM frequency and interrupts*/
#include <TimerOne.h>
/* The PID library is a nice implementation of PID calculations, no need to reinvent the wheel */
#include <PID_v1.h>
/* We use the Arduino JSON library to talk to our server over the serial line */
/* Be sure to use the latest version as I added patches to make the library more error-tolerant */
#include <aJSON.h>
/* The hardware SPI library is used to control turnouts */
#include <SPI.h>


//////////////////////////////////////////////////////////////////
// Enable Debug mode
//////////////////////////////////////////////////////////////////
#define DEBUG

//////////////////////////////////////////////////////////////////
// Hardware pinout info
//////////////////////////////////////////////////////////////////

// How the L293D H Bridge is connected to the Arduino
const int fwdpwm = 9;  // Used for PWM, L293D EN1
const int bckpwm = 10; // Used for PWM, L293D EN2
const int pin1a = 2;   // Pin 1A
const int pin4a = 3;   // Pin 4A
const int bemfpin = 0; // Analog0 Pin connected to BEMF measurement point

// Connect GND, VCC1 and VCC2 on the L293D
// Motor connected to Y1 and Y4

#ifdef DEBUG
const int debugpin = 7; // This is connected to a scope to check the speed
                        // of the interrupt routine for BEMF measurement
#endif
//////////////////////////////////////////////////////////////////
// Global constants and defines
//////////////////////////////////////////////////////////////////

// Define two set/clear macros to do PIN manipulation
// way way faster than Arduino's digitalWrite.
// inspired by the the _BV() macro
#define setpin(port, pin) (port) |= (1 << (pin)) 
#define clearpin(port, pin) (port) &= ~(1 << (pin))

// Direction of the train
#define STOP 0
#define FWD  1
#define BCK  2

// Types of messages that can be output (internal codes)
#define MSG_NOP 0
#define MSG_PID_VALUES 1
#define MSG_ACCP_VALUE 2
#define MSG_ACCM_VALUE 3
#define MSG_UPDT_VALUE 4
#define MSG_TURNOUTS_VALUE 5
#define MSG_ACK 98          // Sent to acknowlege a command
#define MSG_ERROR 99        // Sent to tell command error
#define MSG_JSON_SYNTAX 100 // JSON Syntax error

// ADC Prescaler values to force the ADC to a faster mode
const unsigned char PS_16 = (1 << ADPS2);
const unsigned char PS_32 = (1 << ADPS2) | (1 << ADPS0);
const unsigned char PS_64 = (1 << ADPS2) | (1 << ADPS1);
const unsigned char PS_128 = (1 << ADPS2) | (1 << ADPS1) | (1 << ADPS0);

// Turnout control below

#define OP_PULSE 0
#define OP_ON 1
#define OP_OFF 2

// SPI Connection to the shift register/relay driver
const int spi_mosi = 11;
const int spi_miso = 12;
const int spi_clock = 13;
const int spi_ss = 6;

const int turnout_max = 16; // 2x 74HC595 + ULN2083A low side driver
const int turnout_banks = 4; // We have 4 banks of 4 turnouts

//////////////////////////////////////////////////////////////////
// Global Variables
//////////////////////////////////////////////////////////////////

double pwm_rate = 0;
double target_rpm = 0;
int current_direction = STOP;

// Back EMF Measurement: we do a rolling average over BUFFER_SIZE samples which
// we keep in a ring buffer because BEMF measurement is extremely noisy
// on tiny locomotives.
#define BUFFER_SIZE 48
double ring_buffer [BUFFER_SIZE];
int idx = 0;
double measured_rpm = 0;

aJsonStream serial_stream(&Serial);
unsigned long last_print; // time when we last output a status message or response
#ifdef DEBUG
unsigned long fr_print;
#endif
int next_message; // ID of next message to output
char* ack_cmd;    // command we are acknowledging for.

// Accessory global variables
double accessory_on_timestamp = 0; // On time stamp
int accessory_on_id = -1;           // ID of accessory that was turned on
int accessory_on_port = 0;


//////////////////////////////////////////////////////////////////
// Default controller settings (powerup settings)
//////////////////////////////////////////////////////////////////

// The two below cannot be modified for now:
const int PWMFREQUENCY = 60; // 60Hz frequency for PWM output.
const int MAX_PWM = 800;

//Specify the links and initial tuning parameters
//
// Note: shall we use two sets, one agressive for honing in, and a conservative
//       for keeping at the point ?
//double Kp=2, Ki=1.5, Kd=1;
//double Kp=1.15,Ki=0.35, Kd=0.00;
//double Kp=0.25,Ki=1.31, Kd=0.42;
//double Kp=0.05, Ki=1.35, Kd=0.38;

// Very good results with those:
double Kp=0.40, Ki=1.45, Kd=0;

// We need a fast running loop, because the trains are
// very lightweight, so their speed changes very fast when
// any perturbation occurs.
int sampleTime = 80; // Lower than 80 is shorter than the loop, so the PID calculations
                     // will be wrong, don't go lower than this.


// Default controller serial update rate
int updateRate = 300;

// Default length of Turnout set pulse (in ms):
int turnoutPulse = 20;
// Default maximum "on" time for accessory
int turnoutMaxOn = 2000;

/**
 * Arguments are myPID(Input,Output,Setpoint,kp,ki,kd,mode);
 *   Input : The variable we're trying to control -> Measured speed of the train
 *   Output: The variable that will be adjusted by the pid -> pwm_rate
 * Setpoint: The value we want to Input to maintain -> target_rpm
 */
PID myPID(&measured_rpm, &pwm_rate, &target_rpm,Kp,Ki,Kd, DIRECT);

//////////////////////////////////////////////////////////////////
// Start of the program
//////////////////////////////////////////////////////////////////


/* Setup everything */
void setup() {

   Serial.begin(9600); // Let's not go too fast, otherwise we'll lose
                       // characters on long JSON input
   pinMode(pin1a,OUTPUT);
   pinMode(pin4a,OUTPUT);
   
#ifdef DEBUG
   pinMode(debugpin,OUTPUT);
#endif
   
   Timer1.initialize(1e6/PWMFREQUENCY);
   // enable timer compare interrupt
   TIMSK1 |= (1 << OCIE1A);
   TIMSK1 |= (1 << OCIE1B);
  
   //turn the PID on
   myPID.SetSampleTime(sampleTime);
   myPID.SetOutputLimits(0,MAX_PWM);
   myPID.SetMode(AUTOMATIC);

   // Initialize the ADC to a faster speed:
   // set up the ADC
   ADCSRA &= ~PS_128;  // This is the default Arduino prescaler, clear it
   ADCSRA |= PS_64;    // set our own prescaler to 64 (double speed)
   
   // Initialise the SPI library
   SPI.setBitOrder(MSBFIRST);
   SPI.begin();
   
   pinMode(spi_ss,OUTPUT);
   SPI.transfer(0); // Make sure all outputs are Zero at startup!
}

/**
 * Read ADC when PWM signal is low in order to measure the
 * motor's back EMF.
 *
 * Note: spending too much time in the interrupts leads to lost
 * characters on the serial input, therefore we need to make things
 * as fast as possible here. The interrupt must last less than two
 * characters (the length of the hardware UART buffer on the Arduino)
 *
 * COMPA is for Pin 9
 */
ISR(TIMER1_COMPA_vect){
  if (current_direction != FWD)
    return;
  if (!bitRead(PINB,1))
  { // Only trigger when output goes low
      delayMicroseconds(1300); // Wait for the filter curve to be past us.
#ifdef DEBUG
      setpin(PORTD,7);  // Just a debug signal for my scope to check
                        // how long it takes for the loop below to complete
#endif
      // Now read our analog pin (average over several samples, it is very noisy):
      int bemf = analogRead(bemfpin);
      for (int i=0; i<7;i++) {
         bemf += analogRead(bemfpin);
      }
      ring_buffer[idx] = bemf; // No overflow to fear, analog read is 0-1023.
      idx = (idx+1)%BUFFER_SIZE;
#ifdef DEBUG
      clearpin(PORTD,7);
#endif
    }
}

/**
 * This is triggered for the other PWM output (pin 10)
 */
ISR(TIMER1_COMPB_vect){
  if (current_direction != BCK)
    return;
  if (!bitRead(PINB,2))
  { // Only trigger when output goes low
      delayMicroseconds(1300);
#ifdef DEBUG
      setpin(PORTD,7);
#endif
      int bemf = analogRead(bemfpin);
      for (int i=0; i<7;i++) {
         bemf += analogRead(bemfpin);
      }
      ring_buffer[idx] = bemf;
      idx = (idx+1)%BUFFER_SIZE;
#ifdef DEBUG
      clearpin(PORTD,7);
#endif
    }
}

/**
 * Again, we have a _noisy_ signal, so a moving average over BUFFER_SIZE
 * samples is a must. Length of the moving average should remain under the PID
 * loop sample time.
 */
double moving_avg() {
  double avg =0;
  for (int i=0; i< BUFFER_SIZE; i++) {
    // Note: we took 8 samples, but skipped the averaging
    // in the interrupt to win time, so we divide here:
    avg += ring_buffer[i]/8;
  }
  return avg/BUFFER_SIZE;  
}
  

/**
 * Set PWM duty cycle
 */
void pwm(int val) {
  // We use setPwmDuty here because PWM is already initialized earlier.
  // and setPwmDuty is faster.
  switch (current_direction) {
    case FWD:
      Timer1.setPwmDuty(fwdpwm, val);
      break;
    case BCK:
      Timer1.setPwmDuty(bckpwm,val);
      break;
    default:
      break;
  }
}

/**
 * Nice utility to print free Ram
 * http://www.controllerprojects.com/2011/05/23/determining-sram-usage-on-arduino/
 * thanks!
 */
int freeRam () {
  extern int __heap_start, *__brkval; 
  int v; 
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval); 
}

/**
 * Set a turnout
 * Arguments: 
 * address: turnout number (starts at zero)
 * dir: true or false (straight or not)
 * op : one of OP_PULSE, OP_ON, OP_OFF
 */
boolean accessoryCommand(int address, int port, int op)
{
  byte response;
  // Compute the turnout bank we should enable
  // TODO (not on hardware prototype yet)
  int bank = address / turnout_banks;
  
  // Compute the actual I/O we should pulse
  int io = 1 << (address%turnout_banks*2);
  io = io << port;
  
   // Enable the turnout bank (highside driver)
   // TODO (not on hardware prototype yet)
  
    if (op == OP_ON) {
      // Save timestamp & accessory ID:
      accessory_on_id = address;
      accessory_on_port = port;
      accessory_on_timestamp = millis();
    }
#ifdef DEBUG
    aJsonObject *msg = aJson.createObject();
    aJson.addNumberToObject(msg, "io", io);
    aJson.print(msg, &serial_stream);
    Serial.println();
    aJson.deleteItem(msg);
#endif
   // Send pulse on the hardware SPI bus (lowside driver)
   digitalWrite(spi_ss,LOW);
   if (op != OP_OFF)
     response = SPI.transfer(io);
     if (op == OP_PULSE) {
        digitalWrite(spi_ss,HIGH);
        delay(turnoutPulse);
        digitalWrite(spi_ss,LOW);
   }
   if (op != OP_ON)
     response = SPI.transfer(0);
   digitalWrite(spi_ss,HIGH);
   
   // Disable the turnout bank
   
   // TODO (not on hardware prototype yet)

}


/**
 * Controller output, in JSON.
 *
 * By default, we output PWM/BEMF values, unless
 * we are told (using global next_message) that
 * we should respond to a query.
 */
aJsonObject *createMessage()
{
  aJsonObject *msg = aJson.createObject();

  switch(next_message) {
    case MSG_PID_VALUES:
      aJson.addNumberToObject(msg, "kp", Kp);
      aJson.addNumberToObject(msg, "ki", Ki);
      aJson.addNumberToObject(msg, "kd", Kd);
      aJson.addNumberToObject(msg, "sample", sampleTime);
      break;
    case MSG_ACCP_VALUE:
      aJson.addNumberToObject(msg,"accp", turnoutPulse);
      break;
    case MSG_ACCM_VALUE:
      aJson.addNumberToObject(msg,"accm", turnoutMaxOn);
      break;
    case MSG_UPDT_VALUE:
      aJson.addNumberToObject(msg,"updt", updateRate);
      break;
    case MSG_TURNOUTS_VALUE:
      aJson.addNumberToObject(msg,"turnouts", turnout_max);
      break;
    case MSG_ACK:
      aJson.addTrueToObject(msg, "ack");
      aJson.addStringToObject(msg, "cmd", ack_cmd);
      break;
    case MSG_ERROR:
      aJson.addFalseToObject(msg,"ack");
      aJson.addStringToObject(msg, "cmd", ack_cmd);
      break;
    case MSG_JSON_SYNTAX:
      aJson.addStringToObject(msg,"error", "json");
      break;
    default:
      aJson.addNumberToObject(msg, "bemf", measured_rpm);
      aJson.addNumberToObject(msg, "target", target_rpm);
      aJson.addNumberToObject(msg, "rate", pwm_rate);
#ifdef DEBUG
      if (millis() - fr_print > 2000) {
        aJson.addNumberToObject(msg, "freeram", freeRam());
        fr_print = millis();
      }
#endif
      break;
  }
 
  next_message = MSG_NOP;
  return msg;
}

/**
 * Process an incoming JSON message.
 * We don't have much memory on an AVR, so we keep the
 * messages short:
 * Arguments are as follows:
 *     name  :  possible values
 *   ------------------------------
 *     get   : get a setting
 *           : "pid"     : current PID values
 *             "accp"    : Accessory pulse length (ms)
 *             "accm"    : Accessory max on time (ms)
 *             "turnouts": Max number of turnouts supported
 *     speed : set speed of the train
 *             0 to 100 (in percent)
 *     dir   : direction
 *             "f", "b", "s" (forward,backward,stop)
 *     pid   : set PID loop parameters
 *             all arguments must be present
 *             (Have to be floats with a decimal point except for sample)
 *             "kp", "ki", "kd", "sample"
 *     set    : Set parameters (only one at a time)
 *              "updt" : update rate of output in ms
 *              "accp" : update accessory pulse length (ms)
 *              "accm" : update accessory max 'on' time (ms)
 *     acc    : Accessory command. All args below must be present:
 *              "id" : Accessory address (1 to 16)
 *              "port" : Accessory port (0 or 1)
 *              "cmd"  : can be "p" (pulse), "on" or "off"
 *                       Note: accessory will go back to off after "accm"
 *                       milliseconds in every case.
 *
 *  Examples:
 *    { "pid": {"kp":0.015, "ki":0.45, "kd":0.001, "sample":80}}
 *    { "speed":50 }
 *    { "get": "pid" }
 *    { "set": {"updt":200}} (only ONE set at a time)
 *    { "acc": {"id":3, "port":1, "cmd":"p"}}
 */
void processMessage(aJsonObject *msg)
{
  // We query all possible messages and execute the first one we
  // detect.
  //
  // Note: we only process one command at a time, so keep
  //       this in mind when talking to the controller. For
  //       instance, don't set speed and direction in the
  //       same json packet.

  // Reply with the message first
  aJson.print(msg, &serial_stream);
  Serial.println();

  next_message = MSG_ERROR; // Unless we decode something, we complain

  aJsonObject *jsptr = aJson.getObjectItem(msg, "speed");
  if (jsptr) {
    if (jsptr->type != aJson_Int) {
      return;
    }
    myPID.SetMode(MANUAL);
    int new_speed = map(constrain(jsptr->valueint,0,100), 0, 100, 0, MAX_PWM);
    change_speed(new_speed,8);
    // Let the train settle at the new speed
    // TODO: this should be long enough to make sure the
    // rolling average reflects the new speed
    delay(1000);
    measured_rpm = moving_avg();
    target_rpm = measured_rpm;
    myPID.SetMode(AUTOMATIC); // Reset the PID to new RPM target
    ack_cmd = "speed";
    next_message = MSG_ACK;
    return;
  }
  
  jsptr = aJson.getObjectItem(msg, "dir");
  if (jsptr) {
    if (jsptr->type != aJson_String) {
      return;
    }
    
    if (strcmp(jsptr->valuestring,"f")==0) {
      ack_cmd = "dir";
      next_message = MSG_ACK;
      if (current_direction == FWD)
        return;
      current_direction = FWD;
      // Setup L293D as follows:
      // - Y1: High/HiZ dependingon EN1 (PWM)
      // - Y4: Low (gnd)
      digitalWrite(pin1a,HIGH);
      digitalWrite(pin4a,LOW);
      Timer1.disablePwm(bckpwm);
      digitalWrite(bckpwm,HIGH);
      Timer1.pwm(fwdpwm,pwm_rate);
      return;
    }

    if (strcmp(jsptr->valuestring,"b")==0) {
      ack_cmd = "dir";
      next_message = MSG_ACK;
      if (current_direction == BCK)
        return;
      current_direction = BCK;
      // Setup L293D as follows:
      // - Y4: High/HiZ dependingon EN2 (PWM)
      // - Y1: Low (gnd)
      digitalWrite(pin1a,LOW);
      digitalWrite(pin4a,HIGH);
      Timer1.disablePwm(fwdpwm);
      digitalWrite(fwdpwm, HIGH);
      Timer1.pwm(bckpwm,pwm_rate);
      return;
    }
    // Did not understand the argument
    return;
  }

  jsptr = aJson.getObjectItem(msg, "acc");
  if (jsptr) {
      ack_cmd = "acc";
      aJsonObject *arg = aJson.getObjectItem(jsptr, "id");
      if (!arg) return;
      if (arg->type != aJson_Int) return;
      int id = arg->valueint;
      if (id > turnout_max) return;
      arg = aJson.getObjectItem(jsptr, "port");
      if (!arg) return;
      if (arg->type != aJson_Int) return;
      int port = arg->valueint;
      if (port > 1) return;
      arg = aJson.getObjectItem(jsptr, "cmd");
      if (!arg) return;
      if (arg->type != aJson_String) return;
      if (strcmp(arg->valuestring,"p")==0) {
        if (accessory_on_id > -1) return; // We only allow one accessory command at a time.
                                          // so if an accessory is still on, we return.
        accessoryCommand(id, port, OP_PULSE);
        next_message = MSG_ACK;
        return;
      }
      if (strcmp(arg->valuestring,"on")==0) {
        if (accessory_on_id > -1) return; // We only allow one accessory command at a time.
                                          // so if an accessory is still on, we return.
        // Switch on
        accessoryCommand(id, port, OP_ON);
        next_message = MSG_ACK;
        return;
      }
      if (strcmp(arg->valuestring,"off")==0) {
        // Switch off
        accessoryCommand(id, port, OP_OFF);
        next_message = MSG_ACK;
        return;
      }
      return;
  }
  
  jsptr = aJson.getObjectItem(msg, "pid");
  if (jsptr) {
    // We store in temp variables because
    // we only update the PID if we get _all_ values
    double newKp, newKi, newKd;
    aJsonObject *arg = aJson.getObjectItem(jsptr, "kp");
    if (!arg) return;
    if (arg->type != aJson_Float) return;
    newKp = arg->valuefloat;
    arg = aJson.getObjectItem(jsptr, "ki");
    if (!arg) return;
    if (arg->type != aJson_Float) return;
    newKi = arg->valuefloat;
    arg = aJson.getObjectItem(jsptr, "kd");
    if (!arg) return;
    if (arg->type != aJson_Float) return;
    newKd = arg->valuefloat;
    arg = aJson.getObjectItem(jsptr, "sample");
    if (!arg) return;
    if (arg->type != aJson_Int) return;
    // We now have all values:
    ack_cmd = "pid";
    next_message = MSG_ACK;
    sampleTime = arg->valueint;
    Kp = newKp;
    Ki = newKi;
    Kd = newKd;
    myPID.SetTunings(Kp,Ki,Kd);
    myPID.SetSampleTime(sampleTime);
    return;
  }
  
  jsptr = aJson.getObjectItem(msg, "get");
  if (jsptr) {
    if (jsptr->type != aJson_String) {
      return;
    }
    if (strcmp(jsptr->valuestring,"pid")==0) {
      next_message = MSG_PID_VALUES;
      return;
    }
    if (strcmp(jsptr->valuestring,"accp")==0) {
      next_message = MSG_ACCP_VALUE;
      return;
    }
    if (strcmp(jsptr->valuestring,"accm")==0) {
      next_message = MSG_ACCM_VALUE;
      return;
    }
    if (strcmp(jsptr->valuestring,"updt")==0) {
      next_message = MSG_UPDT_VALUE;
      return;
    }
    if (strcmp(jsptr->valuestring,"turnouts")==0) {
      next_message = MSG_TURNOUTS_VALUE;
      return;
    }    
    return;
  }

  jsptr = aJson.getObjectItem(msg, "set");
  if (jsptr) {
    aJsonObject* arg = aJson.getObjectItem(jsptr,"updt");
    if (arg) {
      if (arg->type != aJson_Int) return;
      int updt = arg->valueint;
      if (updt < 100) return; // Don't accept updates faster than this
      updateRate = updt;
      ack_cmd = "set";
      next_message = MSG_ACK;
      return;
    }
    arg = aJson.getObjectItem(jsptr,"accp");
    if (arg) {
      if (arg->type != aJson_Int) return;
      int val = arg->valueint;
      if (val > 200) return; // No pulses above 200ms
      if (val < 5) return;   // No pulses below 5ms
      turnoutPulse = val;
      ack_cmd = "set";
      next_message = MSG_ACK;
      return;
    }
    arg = aJson.getObjectItem(jsptr,"accm");
    if (arg) {
      if (arg->type != aJson_Int) return;
      int val = arg->valueint;
      if (val > 2000) return; // Never stay on more than 2 seconds
      turnoutMaxOn = val;
      ack_cmd = "set";
      next_message = MSG_ACK;
      return;
    }
  }
  
  // We were not able to understand anything
  // serial_stream.flush();
}


int test = 0;

/**
 *  The main loop, which processes incoming data, outputs data
 * and updates the PID loop.
 */
void loop() {
  
  ///////
  // Regular serial port output
  ///////  
  if (millis() - last_print > updateRate) {
    aJsonObject *msg = createMessage();
    aJson.print(msg, &serial_stream);
    Serial.println();
    aJson.deleteItem(msg);
    last_print = millis();
  }

  ///////
  // Safeguard: switch off an accessory that remained
  // on for too long
  ///////
  if (accessory_on_id > -1) {
    if (millis() - accessory_on_timestamp > turnoutMaxOn)
        accessoryCommand(accessory_on_id,accessory_on_port, OP_OFF);
        accessory_on_id = -1;
  }
 
  ///////
  // PID calculations
  ///////  
   measured_rpm = moving_avg();
   myPID.Compute(); // Most important part!
   pwm(pwm_rate);

  ///////
  // Process incoming commands
  ///////  
  if (serial_stream.available()) {
    aJsonObject *msg = aJson.parse(&serial_stream);
    if (!msg) {
      // We were not able to decode this, let's
      // simply flush the buffer and go on with our
      // life
      serial_stream.flush();
      next_message = MSG_JSON_SYNTAX;
    } else {
      processMessage(msg);
      aJson.deleteItem(msg);
    }
  }
 
}

/**
 * Transition to new speed
 */
void change_speed(int new_speed, int stp) {
  if (new_speed < pwm_rate)
    stp = - stp;
  while (abs(new_speed-pwm_rate) > abs(stp)) {
    pwm_rate += stp;
    pwm(pwm_rate);
    delay(15);
  }
  pwm_rate = new_speed;
  pwm(pwm_rate);
}
