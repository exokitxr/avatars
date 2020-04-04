extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;
use std::time::{SystemTime};
use std::cmp;

struct Options {
    fingers: bool
}

struct ModelBoneOutputs {
    quaternion: f64,
    position: f64
}

struct Hmd {
    scaleFactor: f64
}

struct Inputs {
    hmd: Hmd
}

struct Model {
    scale: f64
}

struct SpringBoneManager {
    springBoneList: [i64; 10]
}

struct ModelBones {
    quaternion: f64
}

#[wasm_bindgen]
pub struct Avatar {
    decapitated: bool,
    modelBones: ModelBones,
    modelBoneOutputs: [i64; 19],
    debugMeshes: bool, // todo, not a bool
    options: Options,
    lastTimeStamp: std::time::SystemTime,
    inputs: Inputs,
    lastModelScaleFactor: f64,
    model: Model,
    springBoneManager: SpringBoneManager
}

impl Avatar {

    pub fn undecapitate(&mut self) {
    //     if self.decapitated {
    //         self.modelBones.head.traverse( Fn(String) {
    //             o.position.copy(o.savedPosition);
    //             o.matrixWorld.copy(o.savedMatrixWorld);
    //         });
    //         if self.debugMeshes {
    //             // need to add traits to debugMeshes
    //             self.debugMeshes.eyes.mesh.visible = true;
    //             self.debugMeshes.head.visible = true;
    //         }
    //         self.decapitated = false
    //     }
    }

    pub fn update(&mut self) {
        if self.decapitated {
            self.undecapitate();
        }

        // todo, not a bool
        let modelScaleFactor = self.inputs.hmd.scaleFactor;
        if modelScaleFactor != self.lastModelScaleFactor {
            self.model.scale.set(modelScaleFactor, modelScaleFactor, modelScaleFactor);
            self.lastModelScaleFactor = modelScaleFactor;

            for springBoneGroup in &self.springBoneManager.springBoneList {
                for springBone in &springBoneGroup {
                    springBone._worldBoneLength = springBone.bone
                    // not sure if chaining is allowed in rust
                    .localToWorld(localVector.copy(springBone._initialLocalChildPosition))
                    .sub(springBone._worldPosition)
                    .length();
                }
            }
        }

        self.shoulderTransforms.Update();
        self.legsManager.Update();

        for modelBone in &self.modelBones {
            let modelBoneOutput = self.modelBoneOutputs[modelBone];

            if modelBone == "Hips" {
                modelBone.position.copy(modelBoneOutput.position);
            }

            modelBone.quaternion.multiplyQuaternions(modelBoneOutput.quaternion, modelBone.initialQuaternion);

            if modelBone == "Left_ankle" || modelBone == "Right_ankle" {
                modelBone.quaternion.multiply(upRotation);
            }
            else if modelBone == "Left_wrist" {
                modelBone.quaternion.multiply(leftRotation); // center
            }
            else if modelBone == "Right_wrist" {
                modelBone.quaternion.multiply(rightRotation); // center
            }
            modelBone.updateMatrixWorld();

            let now = SystemTime::now();
            let timeDiff = cmp::min(now - self.lastTimeStamp, 1000);
            self.lastTimeStamp = now;

            if self.options.fingers {
                pub fn _processFingerBones() {
                    return
                }

            }

        }
    }

}