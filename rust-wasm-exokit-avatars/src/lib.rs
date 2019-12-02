extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Avatar {
    decapitated: bool,
    springBoneManager: bool, //todo, not a bool
    modelBones: bool // todo, not a bool
}

impl Avatar {

    pub fn undecapitate(&self) {
        if self.decapitated {
            
        }
    }

    pub fn update(&self) {
        let wasDecapitated: bool = self.decapitated;
        if self.springBoneManager && wasDecapitated {
            self.undecapitate();
        }
    }

}