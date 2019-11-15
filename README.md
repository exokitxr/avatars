# Exokit Avatars

<p align="center">
  <a href="https://github.com/exokitxr/exokit/releases"><img src="https://img.shields.io/github/downloads/exokitxr/exokit/total.svg"></a>
  <a href="https://www.npmjs.com/package/exokit"><img src="https://img.shields.io/npm/v/exokit.svg"></a>
  <a href="https://travis-ci.org/modulesio/exokit-windows"><img src="https://travis-ci.org/modulesio/exokit-windows.svg?branch=master"></a>
  <a href="https://ci.appveyor.com/project/modulesio/exokit-windows"><img src="https://ci.appveyor.com/api/projects/status/32r7s2skrgm9ubva?svg=true"></a>  
  <a href="https://twitter.com/exokitxr"><img src="https://img.shields.io/twitter/follow/exokitxr.svg?style=social"></a>
</p>

<div align="center">
  <a href="https://exokit.org">Site</a>
  &mdash;
  <a href="https://exokit.org/docs/">Docs</a>
  &mdash;
  <a href="https://discordapp.com/invite/Apk6cZN">Discord</a>
  &mdash;
  <a href="https://twitter.com/exokitxr">Twitter</a>
  &mdash;
  <a href="http://eepurl.com/dFiLMz">Email List</a>
</div>

<a href="https://youtu.be/cd_DEwCDF6U"><img alt="Hands Reality Tab" target="_blank" src="https://user-images.githubusercontent.com/6926057/68093240-89482400-fe61-11e9-84b0-365002f64f84.gif" height="190" width="32%"></a>
<a href="https://youtu.be/b-UKSg0QCRE"><img alt="Live Reload Magic Leap" target="_blank" src="https://user-images.githubusercontent.com/6926057/68093243-8e0cd800-fe61-11e9-8e7b-d2440c4f622b.gif" height="190" width="32%"></a>
<a href="https://youtu.be/O1xA1r5SZUM"><img alt="Tutorial Reality Tab" target="_blank" src="https://user-images.githubusercontent.com/6926057/68093247-9238f580-fe61-11e9-9276-9e2584382d41.gif" height="190" width="32%"></a>

The only web-based avatar system you need.

- Loads GLB, FBX, VRChat, VRoid, .unitypackage humanoid
- Auto-detects rigs, height, orientation
- World scale matching
- HMD + gamepads input
- Bones orientation output
- Arms, legs inverse kinematics
- Walking kinematics
- Face animation (visemes) with microphone
- Hair/clothing animation

## How it works

```
import './three.js';
import Avatar from 'https://avatars.exokit.org/avatars.js';

const avatar = new Avatar(model, { // model is THREE.Mesh, can use https://github.com/exokitxr/model-loader
  // all options are optional

  // animate fingers
  fingers: true,

  // animate hair
  hair: true,

  // remove head for first person
  decapitate: false,

  // animate visemes (blink, mouth, etc.)
  visemes: true,
  // navigator.mediaDevices.getUserMedia({audio: true}); // microphone input for visemes
  microphoneMediaStream,
  // false to passthrough microphone audio
  muted: true,

  // add debug bone geometry
  debug: true,
});

avatar.setMicrophoneMediaStream(microphoneMediaStream); // set microphoneMediaStream separately

function animate() {
  const now = Date.now();
  avatar.inputs.hmd.position.set(1.5 + Math.sin((now%2000)/2000*Math.PI*2)*0.5); // or, get pose from WebXR
  avatar.leftGamepad.hmd.position.copy(avatar.inputs.hmd.position).add(new THREE.Vector3(0.2, -0.3, -0.3));
  avatar.leftGamepad.pointer = 0.5; // for finger animation
  avatar.leftGamepad.grip = 1;
  avatar.rightGamepad.hmd.position.copy(avatar.inputs.hmd.position).add(new THREE.Vector3(-0.2, -0.3, -0.3));

  avatar.update();

  requestAnimationFrame(animate);
}
animate();
```