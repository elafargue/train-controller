train-controller
================

A Z scale model train controller with web interface

This is a work in progress, and not ready for prime time yet. The Arduino sketch does work fine with manual control, and do limited json output for consumption by a simple node.js server.

Folder layout:

arduino: arduino sketches for the train controller hardware
hardware: schematics, boards (Eagle for now)
server: the node.js server that interfaces with the controller and serves the web app

Credits:

Thanks to the creators of the PID and aJson libraries (a more robust version is included here).
Thanks to Christophe Coenraets for his great tutorials which were used as a base for the server
Debug page (initial version) inspired by http://www.codeproject.com/Articles/389676/Arduino-and-the-Web-using-NodeJS-and-SerialPort2

License:

All original code is placed under GPLv3 unless stated otherwise, see relevant license files where appropriate.
