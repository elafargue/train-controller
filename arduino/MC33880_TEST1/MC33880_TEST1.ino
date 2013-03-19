/**
 * This is a test for Freescale 33880 SPI relay drivers
 * (c) Ed Lafargue 2013
 * Licence: GPLv3
 *
 * 2013.03.17: Simple test for a single chip
 */
 
/* The hardware SPI library is used to control turnouts */
#include <SPI.h>


//////////////////////////////////////////////////////////////////
// Enable Debug mode
//////////////////////////////////////////////////////////////////
#define DEBUG

//////////////////////////////////////////////////////////////////
// Hardware pinout info
//////////////////////////////////////////////////////////////////

// SPI Connection to the shift register/relay driver
const int spi_mosi  = 11;
const int spi_miso  = 12;
const int spi_clock = 13;
const int spi_ss = 6;


//////////////////////////////////////////////////////////////////
// Global constants and defines
//////////////////////////////////////////////////////////////////

int accessory_on_id;
int accessory_on_port;
int accessory_on_timestamp;

// Define two set/clear macros to do PIN manipulation
// way way faster than Arduino's digitalWrite.
// inspired by the the _BV() macro
#define setpin(port, pin) (port) |= (1 << (pin)) 
#define clearpin(port, pin) (port) &= ~(1 << (pin))

// Turnout control below

#define OP_PULSE 0
#define OP_ON 1
#define OP_OFF 2


const int turnout_max   = 16; // 2x 74HC595 + ULN2083A low side driver
const int turnout_banks =  4; // We have 4 banks of 4 turnouts

// In order to simplify PCB layout, I used MC33880 pins out of order,
// so I'm using a static mapping array to remap the pins for both
// turnouts and banks:
// Turnout bank mapping: what pin matches what port
//                  Port:    0    1    2    3    4   5   6   7 
//const byte lowside_map[] = {  7,   3,   2,   4,   7,  1,  0,  5 };
const byte lowside_map[] = {  0,   1,   2,   3,   4,  5,  6,  7 };

// Turnout pinout mapping
//                  Port:    0    1    2    3
//const int highside_map[] = {  1,   0,   2,   3};
const byte highside_map[] = {  0,   1,   2,   3};

// Fault map: for bank 1 to 4 (lowside), a bit in a bank's byte means
//            we have an open circuit.
//    Note: remapped to natural order (or is it? to be confirmed)
byte fault_map[] = {0,0,0,0};

// Default length of Turnout set pulse (in ms):
int turnoutPulse = 20;
// Default maximum "on" time for accessory
int turnoutMaxOn = 2000;

unsigned long last_print;
int updateRate = 500;

//////////////////////////////////////////////////////////////////
// Start of the program
//////////////////////////////////////////////////////////////////

/* Setup everything */
void setup() {

   Serial.begin(9600); // Let's not go too fast, otherwise we'll lose
                       // characters on long JSON input
   
   // Initialise the SPI library
   SPI.setBitOrder(MSBFIRST); // 33880 Uses MSB First transmission
   SPI.begin();
   SPI.setDataMode(SPI_MODE1);
   
   pinMode(spi_ss,OUTPUT);
   digitalWrite(spi_ss,HIGH); // Deselect chips
   delay(3);
   
   // SPI Integrity check: transmit 2 bytes to each chip. 1st received byte is the
   // fault output, 2nd received byte should be same as 1st sent byte
   digitalWrite(spi_ss,LOW);
   byte val = SPI.transfer(0xaa); // Test pattern (10101010)
   Serial.print("1st startup byte (old data highside): ");
   Serial.println(val);
   val = SPI.transfer(0xaa); // All outputs off
   Serial.print("2nd startup byte (old data lowside: ");
   Serial.println(val);
   val = SPI.transfer(0); 
   Serial.print("3rd startup byte (Test hiside, should be 170): ");
   Serial.println(val);
   val = SPI.transfer(0);
   Serial.print("3rd startup byte (Test lowside, should be 170): ");
   Serial.println(val);
   digitalWrite(spi_ss,HIGH);
   
   delay(2000);
   
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
  byte bank = address / turnout_banks;
  byte bankio = 1 << highside_map[bank];
  Serial.println("-----------");
  Serial.print("Bank pin: ");
  Serial.println(bankio);
  
  // Compute the actual I/O we should pulse
  int io = 1 << (lowside_map[address%turnout_banks*2]);
  io = io << port;

    if (op == OP_ON) {
      // Save timestamp & accessory ID:
      accessory_on_id = address;
      accessory_on_port = port;
      accessory_on_timestamp = millis();
    }

   // Enable the accessory bank (highside driver)
   digitalWrite(spi_ss,LOW);
   response = SPI.transfer(bankio); // Highside driver value (bank select)
   response = SPI.transfer(0);      // Lowside: all zeroes for now (all accessories off)
   digitalWrite(spi_ss,HIGH); // Upon transistion to high, fault status is udpated in the
                              // 33880 register: the next two SPI commands will return those,
                              // see below.   
   delay(1); // Required to give the 33880 time to do open circuit fault detection (has to be > 300us)
   // Send pulse (lowside driver)
   digitalWrite(spi_ss,LOW);
   if (op != OP_OFF) {
     Serial.print("Lowside select value: ");
     Serial.println(io);
     response = SPI.transfer(bankio); // Highside driver value
     Serial.print("Highside fault upon bank select: ");
     Serial.println(response,BIN);
     response = SPI.transfer(io);     // Lowside driver value
     // This response value tells up which pins are connected and which are not:
     // a connected pin will be zero, an unconnected one will be 1 ("Open")
     fault_map[bank] = response;
     Serial.print("Lowside fault upon bank select: ");
     Serial.println(response,BIN);
   }
    if (op == OP_PULSE) {
        digitalWrite(spi_ss,HIGH);    // Update outputs + fault status
        delay(turnoutPulse);
        digitalWrite(spi_ss,LOW);
   }
   if (op != OP_ON) {
     response = SPI.transfer(0);      // Switch off Highside
     Serial.print("Highside fault after lowside select: ");
     Serial.println(response,BIN);
     response = SPI.transfer(0);      // Switch off Lowside
     Serial.print("Lowside fault after lowside select: ");
     Serial.println(response,BIN);

   }
   digitalWrite(spi_ss,HIGH);

}


/**
 *  The main loop, which processes incoming data, outputs data
 * and updates the PID loop.
 */
void loop() {
  
    accessoryCommand(0,0,0);
    delay(800);
    accessoryCommand(0,1,0);
    delay(800); 
   accessoryCommand(1,0,0);
    delay(800);
 
}

