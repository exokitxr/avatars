// TODO: 
// - Implment THREE.Object3D() constructor for struct
// - add upperArm to transform, add lowerArm to upperArm, add hand to lowerArm 
// - export this code for use in lib.rs


// String type is just place holder for learning things

#[derive(Debug)] // used to pretty print things
pub struct ArmTransforms {
    transform: String,
    upperArm: String,
    lowerArm: String,
    hand: String
}

pub fn main() { 
    let arm = ArmTransforms { 
        transform: String::from("Transformers"),
        upperArm: String::from("Upper Arm"),
        lowerArm: String::from("Lower Arm"),
        hand: String::from("Hand")   
    };
    println!("{:?}", arm);
}