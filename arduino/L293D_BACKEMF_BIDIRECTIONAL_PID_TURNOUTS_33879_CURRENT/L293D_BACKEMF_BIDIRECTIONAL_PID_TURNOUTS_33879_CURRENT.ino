/**
 * This is a Z-scale integrated train and turnout controller, with a serial
 * port JSON interface. It features backward/forward driving of one locomotive
 * with speed regulation, and control of up to 16 turnouts or up to 32 
 * single solenoid accessories.
 *
 *  TODO:
 *    - implement proper digital filtering rather than rolling averages
 *
 * 2013.03.06: add SPI library to control a 75HC595 for quick prototyping
 * 2013.03.16: use two MC33880 for control of up to 16 accessories
 * 2013.05.12: Add current measurement support
 * 2013.06.23: Add support for MC33879 rather than MC33880
 * 2013.06.25: Add command to trigger a software reset
 * 2013.06.27: Add commands to control relays that are present on v3.0 controller
 *
 * (c) 2013 Edouard Lafargue, edouard@lafargue.name
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
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
const int pin1a = 3;   // Pin 1A
const int pin4a = 2;   // Pin 4A
const int bemfpin = 0; // Analog0 Pin connected to BEMF measurement point
const int currentpin = 1; // Analog1 Pin connected to current measurement chip.

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
#define MSG_POST_VALUE 6
#define MSG_FAULT_VALUES 7
#define MSG_RELAYS_VALUE 8
#define MSG_ACK 98          // Sent to acknowlege a command
#define MSG_ERROR 99        // Sent to tell command error
#define MSG_JSON_SYNTAX 100 // JSON Syntax error

// We are able to run a few autotests at startup,
// result codes are defined here:
#define SPI_INTEGRITY_FAULT 1  // Issue on SPI bus

// ADC Prescaler values to force the ADC to a faster mode
const unsigned char PS_16 = (1 << ADPS2);
const unsigned char PS_32 = (1 << ADPS2) | (1 << ADPS0);
const unsigned char PS_64 = (1 << ADPS2) | (1 << ADPS1);
const unsigned char PS_128 = (1 << ADPS2) | (1 << ADPS1) | (1 << ADPS0);

// Turnout control below
#define OP_PULSE 0
#define OP_ON    1
#define OP_OFF   2

// Relays: the v3.0 controller supports 4 relays, we
// set those and related operations as defines here:
#define RELAYS 4
#define RELAY_ON 1
#define RELAY_OFF 0


// SPI Connection to the shift register/relay driver
const int spi_mosi  = 11;
const int spi_miso  = 12;
const int spi_clock = 13;
const int spi_ss    =  6;

const int turnout_max   = 16; // 1 x MC33879 = 8 ports = 4 turnouts
const int turnout_banks =  4; // We have 4 banks of 4 turnouts

//////////////////////////////////////////////////////////////////
// Global Variables
//////////////////////////////////////////////////////////////////

double pwm_rate = 0;
double target_rpm = 0;
int current_direction = STOP;

byte relay_mask = 0; // A mask to keep the state of relay outputs when we manipulate turnouts

// Back EMF Measurement: we do a rolling average over BUFFER_SIZE samples which
// we keep in a ring buffer because BEMF measurement is extremely noisy
// on tiny locomotives.
#define BUFFER_SIZE 48
double ring_buffer [BUFFER_SIZE];
double ring_buffer_current [BUFFER_SIZE];
int idx = 0;
int idx2 = 0;
double measured_rpm = 0;
double measured_current = 0;

aJsonStream serial_stream(&Serial);
unsigned long last_print; // time when we last output a status message or response
unsigned long fr_print;
int next_message; // ID of next message to output
const char* ack_cmd;    // command we are acknowledging for.

// Accessory global variables
double accessory_on_timestamp = 0;    // On time stamp
int accessory_on_id   = -1;           // ID of accessory that was turned on
int accessory_on_port =  0;

// In order to simplify PCB layout, I used MC33880 pins out of order,
// so I'm using a static mapping array to remap the pins for both
// turnouts and banks:
// Turnout bank mapping: what pin matches what port
//                            Port:    0    1    2    3    4   5   6   7 

const byte lowside_map[]          = {  6,   3,   2,   4,   7,  1,  0,  5 };
const byte lowside_inverse_map[] =  {  6,   5,   2,   1,   3,  7,  0,  4 };

// Turnout pinout mapping
//                  Port:    0    1    2    3
const byte highside_map[] = {  1,   0,   2,   3};

// Relay output mapping
const byte relay_map[] = { 2, 3, 0, 1};

// Connection map: for port 1 to 32
// false: accessory not connected
// true: accessory connected
#define ACCESSORY_PORTS 32
int accessory_map[ACCESSORY_PORTS];


// Auto-test of the board at startup:
byte post_result = 0;

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

// Default controller serial update rate (in ms)
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

/**
 * Trigger a software reset on the Arduino by jumping to zero
 */
void(* triggerReset) (void) = 0; //declare reset function @ address 0

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

   // Initialise our accessory map:
   for (int i=0; i<32; i++) {
     accessory_map[i]=false;
   };

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
   SPI.setBitOrder(MSBFIRST); // 33879 Uses MSB First transmission
   SPI.begin();
   SPI.setDataMode(SPI_MODE1); // Data on clock going down
   
   pinMode(spi_ss,OUTPUT);
   digitalWrite(spi_ss,HIGH); // Deselect chips
   delay(3);
   
   // SPI Integrity check: transmit 4 bytes to each chip. 1st byte received should be
   // zero, 2nd received byte is the fault output, 3rd & 4th are the same as byte 1 and
   // 2 we sent:
   digitalWrite(spi_ss,LOW);
   
   // Test pattern that will be sent to 2nd chip:
   byte val = SPI.transfer(0xaa); // Test pattern (10101010)
   // "val" should be zero (doc p17), coming from 2nd chip
   post_result |= (val!=0) ? SPI_INTEGRITY_FAULT : 0;
   val = SPI.transfer(0x55); // Test pattern (01010101)
   // "val" will be fault status of the outputs (we don't know what
   // it can be, we don't test)
   
   // Test pattern that will be sent to 1st chip
   val = SPI.transfer(0xaa); // Test pattern (10101010)
   // "val" should be zero (doc p17), coming from 1st chip
   post_result |= (val!=0) ? SPI_INTEGRITY_FAULT : 0;
   val = SPI.transfer(0x55); // Test pattern (01010101)
   // "val" will be fault status of the outputs of 1st chip

   // Now send second batch of values, those are the ones that
   // we be commands for the chips - in our case, switch off all
   // outputs, and turn off open load detect
   // Chip 2:
   val = SPI.transfer(0);
   // "val" should now be the 1st 0xaa we wrote:
   post_result |= (val!=0xaa) ? SPI_INTEGRITY_FAULT : 0;
   val = SPI.transfer(0);
   post_result |= (val!=0x55) ? SPI_INTEGRITY_FAULT : 0;

   // Chip 1:
   val = SPI.transfer(0);
   post_result |= (val!=0xaa) ? SPI_INTEGRITY_FAULT : 0;
   val = SPI.transfer(0);
   post_result |= (val!=0x55) ? SPI_INTEGRITY_FAULT : 0;

   // And wrap it up:
   digitalWrite(spi_ss,HIGH);

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
  delayMicroseconds(1300); // Wait for the filter curve to be past us.
  if (!bitRead(PINB,1))
  { // Only trigger when output goes low (measuring Back EMF)
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
    } else {
      // Measuring current, not voltage, since output is high
#ifdef DEBUG
      setpin(PORTD,7);
#endif
      int curr = analogRead(currentpin);
      for (int i=0; i<7;i++) {
         curr += analogRead(currentpin);
      }
      ring_buffer_current[idx2] = curr; // No overflow to fear, analog read is 0-1023.
      idx2 = (idx2+1)%BUFFER_SIZE;
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
  delayMicroseconds(1300);
  if (!bitRead(PINB,2))
  { // Only trigger when output goes low
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
    } else {
#ifdef DEBUG
      setpin(PORTD,7);  // Just a debug signal for my scope to check
                        // how long it takes for the loop below to complete
#endif
      int curr = analogRead(currentpin);
      for (int i=0; i<7;i++) {
         curr += analogRead(currentpin);
      }
      ring_buffer_current[idx2] = curr; // No overflow to fear, analog read is 0-1023.
      idx2 = (idx2+1)%BUFFER_SIZE;
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
double moving_avg(double buffer[]) {
  double avg =0;
  for (int i=0; i< BUFFER_SIZE; i++) {
    // Note: we took 8 samples, but skipped the averaging
    // in the interrupt to save time, so we divide here:
    avg += buffer[i]/8;
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



// Using the fault register value and bank number,
// update our connected accessory map
void remap_faults(byte bank, byte faults) {
  byte v;
  for (int i=0; i<8; i++) {
    v = faults & (1<<i);
    if (bank%2) {
      accessory_map[bank*8+lowside_inverse_map[i]] = !(v>0);
    } else {
      accessory_map[bank*8+7-lowside_inverse_map[i]] = !(v>0);
    }
  }
}

/**
 * Switch a relay on-off.
 */
void relayCommand(int address, int op)
{
  byte response, io;
  if (address < 0|| address > RELAYS)
    return;
  address--; // Commands are 1 to 4, we translate from 0 to 3
  // Remap the relay outputs (PCB is not wired in order):
  address = relay_map[address];
  // Relay outputs are in port 5 to 8
  byte bankio = 1 << (address+4);
  if (op == RELAY_OFF) {
    relay_mask &= ~bankio;
  } else {
    relay_mask |= bankio;
  }
  
  // Enable the accessory bank (highside driver)
  digitalWrite(spi_ss,LOW);
  response = SPI.transfer(0);       // Disable open load detect for relays
  response = SPI.transfer(relay_mask); // Highside driver value
  response = SPI.transfer(0);      // Disable open load detect on low side.
  response = SPI.transfer(0);      // Lowside: all zeroes for now (all accessories off)
  digitalWrite(spi_ss,HIGH);       // Turn outputs on/off

}

/**
 * Set a turnout
 * Arguments: 
 * address: turnout number (starts at ONE)
 * dir: true or false (straight or not)
 * op : one of OP_PULSE, OP_LONGPULSE (for decouplers)
 */
void accessoryCommand(int address, int port, int op)
{
  byte response, io;
  address--; // we start at one in the command, this is more human friendly.
  // Compute the turnout bank we should enable
  byte bank = address / turnout_banks;
  byte bankio = (1 << highside_map[bank]) | relay_mask; // Preserve relay state too
  
  
  // Compute the actual I/O we should pulse
  if (bank%2) { // Ports are wired in a symetrical way on the board
    io = 1 << (lowside_map[address%turnout_banks*2+port]);
  } else {
    io = 1 << (lowside_map[7-address%turnout_banks*2-port]);
  }
  
    if (op == OP_ON) {
      // Save timestamp & accessory ID:
      accessory_on_id = address;
      accessory_on_port = port;
      accessory_on_timestamp = millis();
    }

   // Enable the accessory bank (highside driver)
   digitalWrite(spi_ss,LOW);
   response = SPI.transfer(0);      // 1st byte is Open load detect: we don't want it on high side
   response = SPI.transfer(bankio); // Highside driver value (bank select)
   response = SPI.transfer(0xff);   // Enable open load detect on low side.
   response = SPI.transfer(0);      // Lowside: all zeroes for now (all accessories off)
   digitalWrite(spi_ss,HIGH);       // Turn outputs on/off
   delay(10); // Required to give the 33880 time to do open circuit fault detection (has to be > 300us)
   // Send pulse (lowside driver)
   digitalWrite(spi_ss,LOW); // Upon transistion to low, fault status is udpated in the
                              // 33880 register: the next two SPI commands will return those,
                              // see below. 
   if (op != OP_OFF) {
     // Enable the lowside driver for the currently selected
     // accessory
     response = SPI.transfer(0);      // Disable open load detect on Hiside (response should be zero)
     response = SPI.transfer(bankio); // Highside driver value (response = hiside status)
     //Serial.print("Highside fault upon bank select: ");
     //Serial.println(response,BIN);
     response = SPI.transfer(0);      // Now disable open load detect on lowside, saves power
                                      // response should be zero
     response = SPI.transfer(io);     // Lowside driver value
     // This response value tells up which pins are connected to
     // an accessory and which are not:
     // a connected pin will be zero, an unconnected one will be 1 ("Open")
     remap_faults(bank,response);

#if 0
    aJsonObject *msg = aJson.createObject();
    aJson.addNumberToObject(msg, "bank", bank);
    aJson.addNumberToObject(msg, "bankio", bankio);
    aJson.addNumberToObject(msg, "io", io);    
    aJson.addNumberToObject(msg, "faults", response);
    aJson.print(msg, &serial_stream);
    Serial.println();
    aJson.deleteItem(msg);
#endif

   }
    if (op == OP_PULSE) {
        digitalWrite(spi_ss,HIGH);    // Updates outputs + fault status
        delay(turnoutPulse);
        digitalWrite(spi_ss,LOW);
   }
   if (op != OP_ON) {
     response = SPI.transfer(0);
     response = SPI.transfer(relay_mask);      // Switch off Highside (preserve relays)
     //response is now Highside fault status after lowside select
     response = SPI.transfer(0);
     response = SPI.transfer(0);      // Switch off Lowside
     //response is now Lowside fault status after lowside select
   }
   digitalWrite(spi_ss,HIGH);
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
    case MSG_RELAYS_VALUE:
      aJson.addNumberToObject(msg,"relays", RELAYS);
      break;
    case MSG_ACK:
      aJson.addTrueToObject(msg, "ack");
      aJson.addStringToObject(msg, "cmd", ack_cmd);
      break;
    case MSG_POST_VALUE:
      if (post_result ==0) {
         aJson.addStringToObject(msg,"post","PASS");
      } else {
         aJson.addStringToObject(msg,"post","FAIL");
         if (post_result & SPI_INTEGRITY_FAULT)
           aJson.addStringToObject(msg,"err","SPI");
      }
      break;
    case MSG_FAULT_VALUES: {
      // First, issue a "OFF" command to the first port of each bank
      // to make sure the fault map is fully updated:
      accessoryCommand(1, 0, OP_PULSE);
      accessoryCommand(5, 0, OP_PULSE);
      accessoryCommand(9, 0, OP_PULSE);
      accessoryCommand(13,0, OP_PULSE);
      aJsonObject *pst = aJson.createIntArray(accessory_map,ACCESSORY_PORTS);
      aJson.addItemToObject(msg,"ports",pst);
      break; }
    case MSG_ERROR:
      aJson.addFalseToObject(msg,"ack");
      aJson.addStringToObject(msg, "cmd", ack_cmd);
      break;
    case MSG_JSON_SYNTAX:
      aJson.addStringToObject(msg,"error", "json");
      break;
    default:
      // Note: we convert current in mA and rpm in mV:
      aJson.addNumberToObject(msg, "bemf", measured_rpm*3.3*3/1024*1000);
      aJson.addNumberToObject(msg, "target", target_rpm*3.3*3/1024*1000);
      aJson.addNumberToObject(msg, "rate", pwm_rate);
      aJson.addNumberToObject(msg, "current", measured_current*1000/1024);
      if (millis() - fr_print > 2000) {
        switch (current_direction) {
            case STOP:
              aJson.addStringToObject(msg,"dir","s");
              break;
            case FWD:
              aJson.addStringToObject(msg,"dir","f");
              break;
            case BCK:
              aJson.addStringToObject(msg,"dir","b");
              break;
        }
        aJson.addNumberToObject(msg, "freeram", freeRam());
        fr_print = millis();
      }
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
 *             "relays"  : Max number of relays supported
 *              "ports"  : do an accessory connected/disconnected diag.
 *                         Will return a list of all accessory port statuses.
 *              "post"   : return result of Power-on self test.
 *
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
 *     rel    : Relay command. All args below must be present:
 *              "id": Relay address (1 to 4)
 *              "cmd": "on" or "off"
 *     acc    : Accessory command. All args below must be present:
 *              "id" : Accessory address (1 to 16) 
 *              "port" : Accessory port (0 or 1)
 *              "cmd"  : can be "p" (pulse),  "on" or "off"
 *                       Note: accessory will go back to off after "accm"
 *                       milliseconds in every case, or the next command
 *                       (design only allows one accessory at a time)
 *     reset  : Trigger a controller reset - used to get back on our feet. For syntax reasons,
 *              we need an argument: { "reset":1 }. Note that with the default
 *              Arduino bootloader, we cannot use this to enable firmware uploads.
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
    measured_rpm = moving_avg(ring_buffer);
    measured_current = moving_avg(ring_buffer_current);
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

    ack_cmd = "dir";
    next_message = MSG_ACK;
    
    if (strcmp(jsptr->valuestring,"f")==0) {
      if (current_direction == FWD)
        return;
      current_direction = FWD;
      // Setup L293D as follows:
      // - Y1: High/HiZ depending on EN1 (PWM)
      // - Y4: Low (gnd)
      digitalWrite(pin1a,HIGH);
      digitalWrite(pin4a,LOW);
      Timer1.disablePwm(bckpwm);
      digitalWrite(bckpwm,HIGH);
      Timer1.pwm(fwdpwm,pwm_rate);
      return;
    }

    if (strcmp(jsptr->valuestring,"b")==0) {
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
    
    if (strcmp(jsptr->valuestring,"s")==0) {
      if (current_direction == STOP)
        return;
      current_direction = STOP;
      // Setup L293D as follows:
      // - Y4: Low (gnd)
      // - Y1: Low (gnd)
      digitalWrite(pin1a,LOW);
      digitalWrite(pin4a,LOW);
      Timer1.disablePwm(fwdpwm);
      Timer1.disablePwm(bckpwm);
      digitalWrite(fwdpwm, LOW);
      digitalWrite(bckpwm, LOW);
      // Last thing: we reset all readings which don't make sense
      // when we're in "off" mode:
      for (int i=0; i < BUFFER_SIZE; i++) {
        ring_buffer[i] =0;
        ring_buffer_current[i]=0;
      }
      target_rpm=0; // Tell the PID we're stopped too :)
      return;
    }

    // Did not understand the argument
    next_message = MSG_ERROR;
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
      if (id < 1) return;
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

  jsptr = aJson.getObjectItem(msg, "rel");
  if (jsptr) {
      ack_cmd = "rel";
      aJsonObject *arg = aJson.getObjectItem(jsptr, "id");
      if (!arg) return;
      if (arg->type != aJson_Int) return;
      int id = arg->valueint;
      if (id > RELAYS) return;
      if (id < 1) return;
      arg = aJson.getObjectItem(jsptr, "cmd");
      if (!arg) return;
      if (arg->type != aJson_String) return;
      if (strcmp(arg->valuestring,"on")==0) {
        // Switch on
        relayCommand(id, RELAY_ON);
        next_message = MSG_ACK;
        return;
      }
      if (strcmp(arg->valuestring,"off")==0) {
        // Switch off
        relayCommand(id, RELAY_OFF);
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
    if (strcmp(jsptr->valuestring,"relays")==0) {
       next_message = MSG_RELAYS_VALUE;
       return;
    }
    if (strcmp(jsptr->valuestring,"post")==0) {
      next_message = MSG_POST_VALUE;
      return;
    }
    if (strcmp(jsptr->valuestring,"ports")==0) {
      next_message = MSG_FAULT_VALUES;
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
  
  jsptr = aJson.getObjectItem(msg, "reset");
  if (jsptr) {
    Serial.print("{\"msg\": \"Reset in 2 seconds\"}");
    delay(2000);
    triggerReset();
  }
  
  // We were not able to understand anything
  // serial_stream.flush();
}

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
   measured_rpm = moving_avg(ring_buffer);
   myPID.Compute(); // Most important part!
   pwm(pwm_rate);

  ///////
  // Measure current too
  ///////
  measured_current = moving_avg(ring_buffer_current);

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
