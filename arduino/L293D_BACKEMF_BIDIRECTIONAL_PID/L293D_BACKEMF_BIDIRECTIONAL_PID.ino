
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
 *       does not put both motor connectors in HiZ at the same time.
 *
 *
 *  In this version, we are able to change the direction but still measure BackEMF
 *  easily, without braking the motor when EN is switched off. The drawback is that we
 *  use an extra EN pin on the L293D.
 */
 
/* We use the Timer1 library to get more options on PWM frequency and interrupts*/
#include "TimerOne.h"
#include "PID_v1.h"

// How the L293D H Bridge is connected to the Arduino
const int fwdpwm = 9;  // Used for PWM, L293D EN1
const int bckpwm = 10; // Used for PWM, L293D EN2
const int pin1a = 2;   // Pin 1A
const int pin4a = 3;   // Pin 4A
const int bemfpin = 0; // Analog0 Pin connected to BEMF measurement point

// Connect GND, VCC1 and VCC2 on the L293D
// Motor connected to Y1 and Y4

const int PWMFREQUENCY = 60; // 60Hz frequency for PWM output.

const int debugpin = 7;

// Direction of the train
#define STOP 0
#define FWD  1
#define BCK  2

// Global variables:
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
int sampleTime = 80; // Lower than 80 is longer than the loop, so the PID calculations
                     // will be wrong, don't go lower than this.


/**
 *   Input : The variable we're trying to control -> Measured speed of the train
 *   Output: The variable that will be adjusted by the pid -> pwm_rate
 * Setpoint: The value we want to Input to maintain -> target_rpm
 */
PID myPID(&measured_rpm, &pwm_rate, &target_rpm,Kp,Ki,Kd, DIRECT);


/* Setup everything so that we can vary using keyboard */
void setup() {

   Serial.begin(9600);
   pinMode(pin1a,OUTPUT);
   pinMode(pin4a,OUTPUT);
   
   pinMode(debugpin,OUTPUT);
   
   Timer1.initialize(1e6/PWMFREQUENCY);
   // enable timer compare interrupt
   TIMSK1 |= (1 << OCIE1A);
   TIMSK1 |= (1 << OCIE1B);
  
   //turn the PID on
   myPID.SetSampleTime(sampleTime);
   myPID.SetOutputLimits(0,850);
   myPID.SetMode(AUTOMATIC);

//   Serial.println("Ready. Use 0-9 to vary speed or f/b for forward/backwards");  
}

/**
 * Read ADC when PWM signal is low in order to measure the
 * motor's back EMF.
 *
 * COMPA is for Pin 9
 */
ISR(TIMER1_COMPA_vect){
  if (current_direction != FWD)
    return;
  if (!bitRead(PINB,1))
  { // Only trigger when output goes low
      delayMicroseconds(1300); // Wait for the filter curve to be past us.
      digitalWrite(debugpin,HIGH); // Just a debug signal for my scope to check
                                   // how long it takes for the loop below to complete
      // Now read our analog pin (average over several samples, it is very noisy):
      int bemf = analogRead(bemfpin);
      for (int i=0; i<14;i++) {
         bemf += analogRead(bemfpin);
      }
      ring_buffer[idx] = bemf/25; // No overflow to fear, analog read is 0-1023.
      idx = (idx+1)%BUFFER_SIZE;
      digitalWrite(debugpin,LOW); // debug signal for my scope
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
      digitalWrite(debugpin,HIGH);
      int bemf = analogRead(bemfpin);
      for (int i=0; i<14;i++) {
         bemf += analogRead(bemfpin);
      }
      ring_buffer[idx] = bemf/25;
      idx = (idx+1)%BUFFER_SIZE;
      digitalWrite(debugpin,LOW);
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
    avg += ring_buffer[i];
  }
  avg = avg/BUFFER_SIZE;
  // TODO: check whether this is really necessary or whether this
  // is counter productive
  return map(avg, 0, 120, 0, 800);
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
 * Output data in json format for graphing in a web page
 * through a simple node.js pipe
 */
void debug() {
  Serial.print("{ \"bemf\":\"");
 Serial.print(measured_rpm);
 Serial.print("\", \"target\":\"");
 Serial.print(target_rpm);
 Serial.print("\", \"Kp\":\"");
 Serial.print(Kp);
 Serial.print("\", \"Ki\":\"");
 Serial.print(Ki);
 Serial.print("\", \"Kd\":\"");
 Serial.print(Kd);
 Serial.print("\", \"rate\":\"");
 Serial.print(pwm_rate);
 Serial.print("\", \"sample\":\"");
 Serial.print(sampleTime);
 Serial.println("\"}");
}

void loop() {
 if (Serial.available()) {
  char ch = Serial.read(); 
  if(ch >= '0' && ch <= '9') {
    target_rpm = map(ch, '0', '9', 0, 750);
//    myPID.SetMode(MANUAL);
//    pwm_rate = target_rpm;
//    pwm(pwm_rate);
//    myPID.SetMode(AUTOMATIC);
  }
  else if (ch == 's') {
    sampleTime -= 10;
    myPID.SetSampleTime(sampleTime);
  }
  else if (ch == 'S') {
    sampleTime += 10;
       myPID.SetSampleTime(sampleTime);
  }

  else if (ch == 'p') {
   Kp -= 0.01;
   myPID.SetTunings(Kp,Ki,Kd);
   }
  else if (ch == 'P') {
   Kp += 0.01;
   myPID.SetTunings(Kp,Ki,Kd);
  }
  else if (ch == 'i') {    
   Ki -= 0.01; 
   myPID.SetTunings(Kp,Ki,Kd);
  }
  else if (ch == 'I') {
   Ki += 0.01;     
   myPID.SetTunings(Kp,Ki,Kd);
  }
    else if (ch == 'd') {
    Kd -= 0.01; 
   myPID.SetTunings(Kp,Ki,Kd);
  }
  else if (ch == 'D') {
   Kd += 0.01; 
   myPID.SetTunings(Kp,Ki,Kd);
  }
  else if (ch == 'f' && current_direction != FWD) {
    current_direction = FWD;
  //  Serial.println("Forward");
    // Setup L293D as follows:
    // - Y1: High/HiZ dependingon EN1 (PWM)
    // - Y2: Low (gnd)
    digitalWrite(pin1a,HIGH);
    digitalWrite(pin4a,LOW);
    Timer1.disablePwm(bckpwm);
    digitalWrite(bckpwm,HIGH);
    Timer1.pwm(fwdpwm,pwm_rate);
  }
    else if (ch == 'b' && current_direction != BCK) {
    current_direction = BCK;
//    Serial.println("Backwards");
    // Setup L293D as follows:
    // - Y2: High/HiZ dependingon EN2 (PWM)
    // - Y1: Low (gnd)
    digitalWrite(pin1a,LOW);
    digitalWrite(pin4a,HIGH);
    Timer1.disablePwm(fwdpwm);
    digitalWrite(fwdpwm, HIGH);
    Timer1.pwm(bckpwm,pwm_rate);
  }
 }
 measured_rpm = moving_avg();
 myPID.Compute();
//  pid();
 pwm(pwm_rate);

  debug(); 
 
}

/*
boolean pid() {
  double input = measured_rpm;
   unsigned long now = millis();
   unsigned long timeChange = (now - lastTime);
   if(timeChange>=sampleTime)
   {

      double error = target_rpm - input;
      ITerm+= (Ki * error);
      if(ITerm > outMax) ITerm= outMax;
      else if(ITerm < outMin) ITerm= outMin;
      double dInput = (input - lastInput);
 
  Serial.print(measured_rpm);
 Serial.print(" - ");
 Serial.print(target_rpm);
 Serial.print(" - ");
 Serial.print(error);
 Serial.print(" - ");
 Serial.println(pwm_rate);
*/
 
      /*Compute PID Output*/

/*      double output = Kp * error + ITerm- Kd * dInput;      
	  if(output > outMax) output = outMax;
      else if(output < outMin) output = outMin;
	  pwm_rate = output; 
*/
      /*Remember some variables for next time*/
/*
lastInput = input;
      lastTime = now;
	  return true;
   }
   else return false;

}
*/
