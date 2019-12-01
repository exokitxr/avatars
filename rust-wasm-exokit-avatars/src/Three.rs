// TODO 
// - _Math.generateUUID() for the uuid

pub struct Object3D {
    _object3DId: u32,
    uuid: u16, // todo, not sure what size generateUUID() returns
    name: String,
    r#type: String,
    parent: String, // todo, this is 'null' in JS
    children: [i32; 10], // todo, this needs to be resizable
    up: String, // todo, Object3D.DefaultUp.clone()
    position: String, // todo, new Vector3()
    rotation: String, // todo, new Euler()
    quaternion: String, // todo, new Quaternion()
    scale: String, // todo, new Vector3(1, 1, 1)
    matrix: String, // todo, new Matrix4()
    matrixWorld: String, // todo, new Matrix4()
    matrixAutoUpdate: String, // todo, Object3D.DefaultMatrixAutoUpdate
    matrixWorldNeedsUpdate: bool,
    layers: String, // todo, new Layers()
    visible: bool,
    castShadow: bool,
    receiveShadow: bool,
    frustumCulled: bool,
    renderOrder: u32,
    userData: String // todo, the is a '{}' in JS
}

fn main(){

}