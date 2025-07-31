# MJ Game

This repository contains all the source code for the **Musical Juggling Game**, a game designed to help you learn musical juggling patterns more easily.

The goal is to make the musical learning process more accessible through the use of virtual immersive environments.

This project was developed as part of the doctoral thesis of [Léo Kulinski](https://github.com/kunchtler): *"Jonglerie Musicale, de la modélisation combinatoire à l’assistance à la création artistique"*.

It was initially developed by [Kylian Richard](https://github.com/Kylian2) during his IUT internship.

The project relies on the [Musical Juggling Library](https://github.com/kunchtler/mj-lib), developed by Léo, as its main dependency.

## Key Features

* Catch & toss detection
* Trajectory preview
* In-game tutorials to understand the gameplay
* 2-ball and 3-ball demonstration patterns
* Movement handling (horizontal, vertical, rotation)
  *— To be improved: we need to determine the best approach between `xrOrigin` and `XRReferenceSpace`*
* Hand tracking for controller-free play
  *— Some bugs still occur and need to be fixed*
* Time control UI
* Simulation settings integrated into the time control UI

## Technologies Used

This project is developed using **WebXR** to ensure compatibility with as many VR headsets as possible via their web browsers. It is built with the **React Three Fiber** framework.

To run immersive experiences in web browsers, a secure environment (HTTPS) must be set up.

You can find the [documentation](https://github.com/Kylian2/mj-doc) written during development, which gathers various WebXR-specific features and technical solutions to common issues (e.g., movement handling, hand tracking).
