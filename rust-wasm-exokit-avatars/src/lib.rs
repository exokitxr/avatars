extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;
use std::time::{SystemTime};
use std::cmp;

#[wasm_bindgen]
pub struct Avatar {
    decapitated: bool,
    springBoneManager: bool, //todo, not a bool
    modelBones: bool, // todo, not a bool
    debugMeshes: bool, // todo, not a bool
    inputs: bool, // todo, not a bool
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
        let wasDecapitated: bool = self.decapitated;
        if self.springBoneManager && wasDecapitated {
            self.undecapitate();
        }

        // todo, not a bool
        let modelScaleFactor: bool = self.inputs.hmd.scaleFactor;
        if modelScaleFactor != self.lastModelScaleFactor {
            self.model.scale.set(modelScaleFactor, modelScaleFactor, modelScaleFactor);
            self.lastModelScaleFactor = modelScaleFactor;

            for springBoneGroup in 0..self.springBoneManager.springBoneList.len() {
                for springBone in 0..springBoneGroup.len() {
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

        for k in 0..self.modelBones.len() {
            // todo assign types
            let modelBone = self.modelBones[k];
            let modelBoneOutput = self.modelBoneOutputs[k];

            if k == "Hips" {
                modelBone.position.copy(modelBoneOutput.position);
            }

            modelBone.quaternion.multiplyQuaternions(modelBoneOutput.quaternion, modelBone.initialQuaternion);

            if k == "Left_ankle" || k == "Right_ankle" {
                modelBone.quaternion.multiply(upRotation);
            }
            else if k == "Left_wrist" {
                modelBone.quaternion.multiply(leftRotation); // center
            }
            else if k == "Right_wrist" {
                modelBone.quaternion.multiply(rightRotation); // center
            }
            modelBone.updateMatrixWorld();

            let now = SystemTime::now();
            let timeDiff = cmp::min(now - self.lastTimeStamp, 1000)
            self.lastTimeStamp = now;

            if self.options.fingers {
                pub fn _processFingerBones(left) {

                }

            }

        }
    }

}