train-controller
================

A Z scale model train controller with web interface.

You will find detailed instructions at http://www.aerodynes.org/ . This repository includes both hardware design files and the software you need to build the complete project.

The whole system is working well, and has been running for a long time on an actual layout.

Repository structure:

arduino: arduino sketches for the train controller hardware
hardware: schematics, boards (Eagle)
server: the node.js server that interfaces with the controller and serves the web app

Installation:

Please refer to http://www.aerodynes.org/ for detailed installation instructions. Below is a quick summary:

- Build the cape - Eagle files are included, all components are referenced in the design file, it is fairly straightforward.
- Install the arduino firmware on the cape: you can use the very good "ino" command line interface for doing so.
- Install Ubuntu Linux on your Beaglebone Black
- Install the latest nodejs distribution, and clone this repository
- Install mongodb (Ubuntu package is fine)
- Run "npm install" then "node server.js"
- ... you should be set!

Credits:

Thanks to the creators of the PID and aJson libraries (be sure to use the latest aJson library as I contributed patches to make it more robust).
Thanks to Christophe Coenraets for his great tutorials which were used as a base for the server

License:

All original code is placed under GPLv3 unless stated otherwise, see relevant license files where appropriate.
