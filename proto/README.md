2019.10.06 IK Avatar Project -- Rough Perspective / Technical Overview for project follow-up discussions

## IK ARMATURE PREPROCESSING LAYERS
* PreRotations: { input: [ manually defined ], output: [ quats by bone name ] }
* Model Sanitize: { input: [ arbitrary GLTFs, PreRotations ], output: [ normalized Skeleton, captured SkinnedMeshes ] }
* Bindpose Grab: { input: [ normalized Skeleton ], output: [ decoupled Skeleton clone ] }
* Metrics: { input: [ decoupled Skeleton clone ], output: [ canonical Skeleton metrics ] }
* Joint Re-Rolling: { input: [ normalized Skeleton, PreRotations, patches ], output: [ Armature (standardized Skeleton) ] }
* Rigged Model: { 
  input: [ Armature, SkinnedMeshes, Metrics, PreRotations ],
  output: [ re-bound SkinnedMeshes, rigged Armature ],
}

## MISC
* Recording Playback: { input: [ json mocap ], output: [ simulated trackers ] }

## GAME LOOP PROCESSING:
* Armature: {
  input: [ world pos/rot, Hips >> descendent rel poses ],
  output: [ absolute bone matrices ]
}
* Tracker Mapping: { input: [ abs trackers, Armature ], output: [ abs trackers, Camera > Head remap ] } }
* IK: { input: [ abs trackers, Armature ], output: [ Armature, virtual trackers ] } }
* Space Mapping: {
    input: [ head-space, world-space, hips-space, rig-space ],
    output: [ world-space, Armature-space ]
}
* Renderer: { input: { composed RiggedModel }, output: [ trigger next IK update ] }

Note:
  **head-space**: root space from perspective of WebVR inputs (subspaces" Camera, HMD, Head, mid-Eye point)
  **world-space**: root space from perspective of THREE.js scene
  **hips-space**: root space from perspective of Armature (note: *all* joints are descended from Hips!)
  **rig-space**: root space from perspective of the "model" (ie: feet typically at zero, Y-up)
