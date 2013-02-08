train-controller
================

A Z scale model train controller with web interface

This is a work in progress, and not ready for prime time yet. The Arduino sketches do work fine with manual control, and do limited json output for consumption by a simple node.js server.

Folder layout:

arduino: arduino sketches for the train controller hardware
hardware: schematics, boards (Eagle for now)
server: the node.js server that interfaces with the controller and serves the web app
poc: a smaller node.js interface for initial debugging