extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Avatar {
    decapitated: bool,
    springBoneManager: bool, //todo, not a bool
    modelBones: bool, // todo, not a bool
    debugMeshes: bool, // todo, not a bool
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
    }

}