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

impl Object3D {
//     // Todo, figure out callbacks in rust, function as param
//     pub fn traverse(&self, callback: String) {
//         callback(self);
//         // use the array size at instance of array param
//         let children = self.children;
//         for i in 0..children.len() {
//             children[i].traverse(callback)
//         }
//     }

    pub fn updateMatrixWorld(&mut self, force: bool) { 
        if self.matrixAutoUpdate {
            self.updateMatrix();
        }
        if self.matrixWorldNeedsUpdate || force {
            if !self.parent {
                self.matrixWorld.copy(self.matrix);
            }
            else {
                self.matrixWorld.multiplyMatrices(self.parent.matrixWorld, self.matrix);
            }
            self.matrixWorldNeedsUpdate = true;
            force = true;
        }
        let children: [i32; 10] = self.children;

        for child in children {
            child.updateMatrixWorld(force);
        }
    }
}

fn main(){
    return
} 