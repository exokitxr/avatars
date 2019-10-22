// QuaternionIK.js [wip] initial plumbing/cloning to add constraint integration points to THREE.IK
// in terms that maintain better quaternion distributions down joint chains

const { IK, IKChain, IKJoint } = THREE;
export { QuaternionIKChain, QuaternionIKJoint };

class QuaternionIKChain extends IKChain {
  constructor(options) {
    super();
    options = options || {};
    this.options = options;
    console.info('QuaternionIKChain', options)
  }
  _forward() {
    // Copy the origin so the forward step can use before `_backward()`
    // modifies it.
    this.origin.copy(this.base._getWorldPosition());

    // Set the effector's position to the target's position.

    if (this.target) {
      this._targetPosition.setFromMatrixPosition(this.target.matrixWorld);
      this.effector._setWorldPosition(this._targetPosition);
    }
    else if (!this.joints[this.joints.length - 1]._isSubBase) {
      // If this chain doesn't have additional chains or a target,
      // not much to do here.
      return;
    }

    // Apply sub base positions for all joints except the base,
    // as we want to possibly write to the base's sub base positions,
    // not read from it.
    for (let i = 1; i < this.joints.length; i++) {
      const joint = this.joints[i];
      if (joint._isSubBase) {
        joint._applySubBasePositions();
      }
    }

    for (let i = this.joints.length - 1; i > 0; i--) {
      const joint = this.joints[i];
      const prevJoint = this.joints[i - 1];
      this.options.forwardConstrain && this.options.forwardConstrain(joint);
      const direction = prevJoint._getWorldDirection(joint);

      const worldPosition = direction.multiplyScalar(joint.distance).add(joint._getWorldPosition());

      // If this chain's base is a sub base, set it's position in
      // `_subBaseValues` so that the forward step of the parent chain
      // can calculate the centroid and clear the values.
      // @TODO Could this have an issue if a subchain `x`'s base
      // also had its own subchain `y`, rather than subchain `x`'s
      // parent also being subchain `y`'s parent?
      if (prevJoint === this.base && this.base._isSubBase) {
        this.base._subBasePositions.push(worldPosition);
      } else {
        prevJoint._setWorldPosition(worldPosition);
      }
    }
  }
  _backward() {
    // If base joint is a sub base, don't reset it's position back
    // to the origin, but leave it where the parent chain left it.
    if (!this.base._isSubBase) {
      this.base._setWorldPosition(this.origin);
    }

    for (let i = 0; i < this.joints.length - 1; i++) {
      const joint = this.joints[i];
      const nextJoint = this.joints[i + 1];
      const jointWorldPosition = joint._getWorldPosition();

      const direction = nextJoint._getWorldDirection(joint);
      joint._setDirection(direction);

      joint._applyConstraints();

      this.options.backwardConstrain && this.options.backwardConstrain(joint);

      joint.options.postConstrain && joint.options.postConstrain(joint);
      direction.copy(joint._direction);

      // Now apply the world position to the three.js matrices. We need
      // to do this before the next joint iterates so it can generate rotations
      // in local space from its parent's matrixWorld.
      // If this is a chain sub base, let the parent chain apply the world position
      if (!(this.base === joint && joint._isSubBase)) {
        joint._applyWorldPosition();
      }

      nextJoint._setWorldPosition(direction.multiplyScalar(nextJoint.distance).add(jointWorldPosition));

      // Since we don't iterate over the last joint, handle the applying of
      // the world position. If it's also a non-effector, then we must orient
      // it to its parent rotation since otherwise it has nowhere to point to.
      if (i === this.joints.length - 2) {
        if (nextJoint !== this.effector) {
          nextJoint._setDirection(direction);
        }
        nextJoint._applyWorldPosition();
      }
    }

    return this._getDistanceFromTarget();
  }
  
};

class QuaternionIKJoint extends IKJoint {
  constructor(bone, options) {
    super(bone, options);
    this.options = options;
    this.options.up = new THREE.Vector3(-1,0,0);
  }
  transformPoint(vector, matrix, target) {
    const e = matrix.elements;
  
    const x = (vector.x * e[0]) + (vector.y * e[4]) + (vector.z * e[8]) + e[12];
    const y = (vector.x * e[1]) + (vector.y * e[5]) + (vector.z * e[9]) + e[13];
    const z = (vector.x * e[2]) + (vector.y * e[6]) + (vector.z * e[10]) + e[14];
    const w = (vector.x * e[3]) + (vector.y * e[7]) + (vector.z * e[11]) + e[15];
    target.set(x / w, y / w, z / w);
  }
  
  // _getWorldDirection(joint) {
  //   return new Vector3().subVectors(this._getWorldPosition(), joint._getWorldPosition()).normalize();
  // }

  _applyWorldPosition() {

    var Vector3 = THREE.Vector3, Matrix4 = THREE.Matrix4, Y_AXIS = new THREE.Vector3(0,1,0)
    //console.info('_applyWorldPosition', this.bone.name);
    let direction = new Vector3().copy(this._direction);
    
    let position = new Vector3().copy(this._getWorldPosition());
    
    //var outputQuaternion = 
    const parent = this.bone.parent;
    
    if (parent) {
      this._updateMatrixWorld();
      let inverseParent = new Matrix4().getInverse(this.bone.parent.matrixWorld);
      this.transformPoint(position, inverseParent, position);
      this.bone.position.copy(position);
    
      this._updateMatrixWorld();
    
      this._worldToLocalDirection(direction);
      this.updateBoneQuaternion(direction, this.options.up || Y_AXIS, this.bone.quaternion);
    } else {
      this.bone.position.copy(position);
    }
    
    // Update the world matrix so the next joint can properly transform
    // with this world matrix
    this.bone.updateMatrix();
    this._updateMatrixWorld();
  }
  updateBoneQuaternion(direction, up, quat) {
    setQuaternionFromDirection(direction, up, quat);
  }
};
