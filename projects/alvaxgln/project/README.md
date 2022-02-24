# Final Project: Connectivity Regularization

An algorithm, that uses local edge operations and angle based smoothing.
A detailed explanation is given in this paper: https://www.researchgate.net/publication/221316520_Explicit_Surface_Remeshing

**To run (node.js required):**
* Open terminal
* Navigate to the project folder
* Run npm install
* Run npm start

**Explanation of GUI:**
* Regularization:
    + Long/Short Edges: Toggles the step of the algorithm, that deals with "long" and "short" edges
    + Drifting Edges: Toggles the step of the algorithm, that deals with "drifting" edges
* Smoothing:
    + Intensity: Determines the intensity of the angle based smoothing
    + Rounds: Determines how many rounds of smoothing are applied with each smooth step
    + Initial smooth step: Toggles whether an inital smooth step is applied to the whole mesh
    + Intermediate smooth step: Toggles whether a smooth step is applied to the whole mesh between "Long/Short Edges" and "Drifting Edges"

Link to the Video Presentation:
https://www.youtube.com/watch?v=-01tQyUI47A
