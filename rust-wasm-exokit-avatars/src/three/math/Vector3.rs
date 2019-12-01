pub struct Vector3 {
    x: f64,
    y: f64,
    z: f64
}

impl Vector3 {

    pub fn set(&mut self, x: f64, y: f64, z: f64) {
        self.x = x;
        self.y = y;
        self.z = z;
    }

    pub fn setScalar(&mut self, scalar: f64) {
		self.x = scalar;
		self.y = scalar;
		self.z = scalar;
    }

    pub fn setX(&mut self, x: f64) {
        self.x = x;
    }

    pub fn setY(&mut self, y: f64) {
        self.y = y;
    }

    pub fn setZ(&mut self, z: f64) {
        self.z = z;
    }

    pub fn setComponent(&mut self, index: u8, value: f64) {
        match index {
            0 => self.x = value,
            1 => self.y = value,
            2 => self.z = value,
            _ => panic!("Error in : Vector3.setComponent(), index is out of range")
        }
    }

    pub fn getComponent(&mut self, index: u8) -> f64 {
        match index {
            0 => return self.x,
            1 => return self.y,
            2 => return self.z,
            _ => panic!("Error in : Vector3.getComponent(), index is out of range")
        }
    }

    // TODO: Learn how to use objects in Rust. Commented functions use objects as params.

    // pub fn clone(&self, v) {
    //     return
    // }

    // pub fn copy(&self, v) {
    //     return
    // }

    // pub fn add(&self, v, w) {
    //     return
    // }

    // not sure if you can return self like this.
    // pub fn addScalar(&mut self, s: f64) -> self {
    //     self.x += s;
    //     self.y += s;
    //     self.z += s;
    //     return self;
    // }

    // pub fn addVectors(&self, a, b) {
    //     return
    // }

    // pub fn addScaledVectors(&self, v, s) {
    //     return
    // }

    // pub fn sub(&self, v, w) {
    //     return
    // }

    // not sure if can return self like this
    // pub fn subScalar(&mut self, s: f64) -> self {
    //     self.x -= s;
    //     self.y -= s;
    //     self.z -= s;
    //     return self;
    // }

    // pub fn subVectors(&self, a, b) {
    //     return
    // }

    // pub fn multiply(&self, v, w) {
    //     return
    // }

    // not sure if can return self like this
    // pub fn mulitplyScalar(&mut self, scalar: f64) -> self {
    //     self.x *= scalar;
    //     self.y *= scalar;
    //     self.z *= scalar;
    //     return self;
    // }

    // pub fn multiplyVectors(&self, a, b) {
    //     return
    // }

    // not sure what a euler is
    // pub fn applyEuler(&self, euler: ) {
    //     return
    // }

    // pub fn applyAxisAngle(&self, axis, angle) { 
    //     return
    // }

    // needs a type for the param: m, uses a object
    // pub fn applyMatrix3(&mut self, m: ?) -> self{
    //     const x = self.x;
    //     const y = self.y;
    //     const z = self.z;
    //     const e = m.elements;

    //     self.x = e[0] * x + e[3] * y + e[6] * z;
	// 	   self.y = e[1] * x + e[4] * y + e[7] * z;
	// 	   self.z = e[2] * x + e[5] * y + e[8] * z;

    //     return self;
    // }
}

fn main() {
    return
}