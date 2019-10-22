// ---------------------------------------------------------------------------
// SpaceHelpers.js -- interim "frame of reference" helpers
// NOTE: these helpers are only meant to be used while bootstrapping initial algorithmic code
//  (as stable algorithms are found they should be optimized to use raw THREE constructs instead)

class WorldHelper {
  constructor(object) {
    this.object = object;
    this._quat = new THREE.Quaternion();
    this._vec3 = new THREE.Vector3();
    this._euler = new THREE.Euler(0,0,0,'XYZ');
    this._mat4 = new THREE.Matrix4();
  }
  toString() { return `[WorldHelper pos=${this.position} rot=${this.degrees}]`; }
  get scale() { return this.object.getWorldScale(this._vec3); }
  get position() { return this.object.getWorldPosition(this._vec3); }
  get quaternion() { return this.object.getWorldQuaternion(this._quat); }
  get rotation() { return this._euler.setFromQuaternion(this.quaternion); }
  get degrees() { return this._vec3.copy(this.rotation).multiplyScalar(THREE.Math.RAD2DEG); }
  get order() { return this._euler.order; }
  get direction() { return this.object.getWorldDirection(this._vec3); }
  get length() { return this.object.position.length(); }

  get matrixInverse() { return this._mat4.getInverse(this.object.matrixWorld); }
 
  get parentWorldQuaternion() { return this.object.parent ? this.object.parent.getWorldQuaternion(this._quat) : new THREE.Quaternion(); }
  get parentWorldPosition() { return this.object.parent ? this.object.parent.getWorldPosition(this._vec3) : new THREE.Vector3(); }
  get parentWorldDirection() { return this.object.parent ? this.object.parent.getWorldDirection(this._vec3) : new THREE.Vector3(0,1,0); }
  get parentWorldScale() { return this.object.parent ? this.object.parent.getWorldScale(this._vec3) : new THREE.Vector3(1,1,1); }

  get dir() { return this._vec3.set( 0, 0, -1 ).applyQuaternion( this.quaternion ); }
  dirTo(other) {
      return this._vec3.set(0,0,1).applyQuaternion(
        other.getWorldQuaternion(this._quat).clone().inverse().multiply(this.quaternion.clone())
      );
  }
  quatTo(other) { return this._quat.setFromUnitVectors(this.dirTo(other).clone(), this._vec3.set(0,0,1)); }
  twistTo(other) {
    return Math.abs(180-this.quaternion.clone().angleTo(this.quatTo(other).clone()) * THREE.Math.RAD2DEG);
  }
};

class LocalHelper {
  constructor(object, order) {
    this.object = object;
    this._euler = new THREE.Euler(0,0,0,'XYZ');
    if (order) this._euler.order = order;
    this._vec3 = new THREE.Vector3();
    this._vec3.toString = () => "("+this._vec3.toArray().map((x)=>x.toFixed(1))+")"+this._euler.order;
    this._quat = new THREE.Quaternion();
    this._mat4 = new THREE.Matrix4();
  }
  toString() { return `[LocalHelper pos=${this.position} rot=${this.degrees}]`; }
  copy(v) {
    if (v instanceof THREE.Quaternion) this.object.quaternion.copy(v);
    else if (v instanceof THREE.Euler) this.object.quaternion.setFromEuler(v);
    else if (Array.isArray(v)) {
      this.object.quaternion.setFromEuler(Object.assign(this._euler, this._vec3.fromArray(v).multiplyScalar(THREE.Math.DEG2RAD)));
    }
    else throw new Error('.copy: unknown value: ' + v);
    return this;
  }
  get scale() {  return this._vec3.copy(this.object.scale); }
  get position() {  return this._vec3.copy(this.object.position); }
  get rotation() { return this._euler.copy(this.object.rotation); }
  get quaternion() { return this._quat.copy(this.object.quaternion); }
  get degrees() { return this._vec3.copy(this.object.rotation).multiplyScalar(THREE.Math.RAD2DEG); }
  get order() { return this._euler.order; }
  get direction() {
    //return this._vec3.set(0,0,1).applyQuaternion(this.object.quaternion);//getWorldQuaternion(this._quat));
    var direction = this.object.getWorldDirection(this._vec3).clone();
    if (this.object.parent) {
      const inverseParent = this._mat4.getInverse(this.object.parent.matrixWorld);
      return direction.transformDirection(inverseParent);
    }
    return direction;
  }
  get length() { return this.object.position.length(); }

  get dir() { return this._vec3.set( 0, 0, -1 ).applyQuaternion( this.quaternion ); }

  get worldQuaternion() { return this.object.getWorldQuaternion(this._quat); }
  get worldPosition() { return this.object.getWorldPosition(this._vec3); }
  get worldDirection() { return this.object.getWorldDirection(this._vec3); }
  get worldScale() { return this.object.getWorldScale(this._vec3); }

  cascadeRotation(rot, scope) {
    this.copy(rot);
    scope = scope || {};
    const RESETQUAT = new THREE.Quaternion();
    const Y_AXIS = new THREE.Vector3(0,1,0);
    var tripped = false;
    updateTransformations(this.object, getOriginalWorldPositions(this.object, {}), scope.directions || {}, scope.preRotations || {});
    function getOriginalWorldPositions(rootBone, worldPos) {
      var rootBoneWorldPos = rootBone.getWorldPosition(new THREE.Vector3())
      worldPos[rootBone.id] = [rootBoneWorldPos];
      rootBone.children.forEach((child) => {
        getOriginalWorldPositions(child, worldPos)
      })
      return worldPos;
    }
    function updateTransformations(parentBone, worldPos, averagedDirs, preRotations) {
        var averagedDir = averagedDirs[parentBone.id] || averagedDirs[parentBone.name];
        var preRot = preRotations[parentBone.id] || preRotations[parentBone.name];
        if (averagedDir) {
          if (Array.isArray(averagedDir)) averagedDir = new THREE.Vector3().fromArray(averagedDir);
            parentBone.quaternion.copy(RESETQUAT);
            parentBone.updateMatrixWorld();
            setQuaternionFromDirection(parentBone.worldToLocal(averagedDir.clone()).normalize(), Y_AXIS, parentBone.quaternion)
            tripped = true;
        }
        if (preRot) {
          parentBone.quaternion.multiply(quatFromDegrees(preRot));
          tripped = true;
        }
        parentBone.updateMatrixWorld();

        //set child bone position relative to the new parent matrix.
        parentBone.children.forEach((childBone) => {
          var childBonePosWorld = worldPos[childBone.id][0].clone();
          parentBone.worldToLocal(childBonePosWorld);
          childBone.position.copy(childBonePosWorld);
        });

        parentBone.children.forEach((childBone) => {
          updateTransformations(childBone, worldPos, averagedDirs, preRotations);
        });
    }
  }  
};

// class SpaceHelper {
// 	constructor(object) {
//     this.object = object;
//     this.world = new WorldHelper(object);
//     this.local = new LocalHelper(object);
//   }
// };
function SpaceHelper(object) {
  if (!object) {
    throw new Error('SpaceHelper ctor -- null object');
  }
  return Object.defineProperties(Object.assign(object, {
    world: new WorldHelper(object),
    local: new LocalHelper(object),
    setWorldPosition: function(nv) {
      this.object.position.copy(this.object.parent ? this.object.parent.worldToLocal(nv) : nv);
      this.object.updateMatrixWorld(true);
      return this;
    },
    lerpWorldPosition: function(nv, alpha=1.0) {
      this.object.position.lerp(this.object.parent ? this.object.parent.worldToLocal(nv) : nv, alpha);
      return this;
    },
  }), {
    object: { writable: true, value: object },
    absDupe: { writable: true, value: function() {
      var o = new THREE.Object3D();
      o.position.copy(this.world.position);
      o.quaternion.copy(this.world.quaternion);
      o.scale.copy(this.world.scale);
      return o;
    }},
    degrees: { configurable: true, enumerable: true, get: function() { return this.local.degrees; } },
  });
}

class RelativeHelper {
  constructor(object, reference, order) {
    this.object = object;
    this.reference = reference || object.parent;
    this.world = new WorldHelper(object),
    this.origin = new WorldHelper(reference);
    this.local = this;
    this._euler = object.rotation.clone();
    if (order) this._euler.order = order;
    this._vec3 = new THREE.Vector3();
    this._vec3.toString = () => "("+this._vec3.toArray().map((x)=>x.toFixed(1))+")"+this._euler.order;
    this._quat = new THREE.Quaternion();
  }
  toString() { return `[RelativeHelper pos=${this.position} rot=${this.degrees}]`; }
  get uglyhack() {
    function absDupe(world) {
      var o = new THREE.Object3D();
      o.position.copy(world.position);
      o.quaternion.copy(world.quaternion);
      o.scale.copy(world.scale);
      return o;
    }
    var self = absDupe(this.world);
    var ref = absDupe(this.origin);
    self.parent = ref;
    return self;
  }
  get position() { return this.origin.position.sub(this.world.position); }
  get quaternion() { return this.origin.quaternion.inverse().multiply(this.world.quaternion); }
  getWorldQuaternion(target) { return target.copy(this.world.quaternion); }
  get rotation() { return this._euler.setFromQuaternion(this.quaternion); }
  get degrees() { return this._vec3.copy(this.rotation).multiplyScalar(THREE.Math.RAD2DEG); }
  get order() { return this._euler.order; }
  get length() { return this.position.length(); }

  get dir() { return this._vec3.set( 0, 0, -1 ).applyQuaternion( this.quaternion ); }
  
  rotateXdegrees(deg) { return this.rotate_degrees(deg, 'x') }
  rotateYdegrees(deg) { return this.rotate_degrees(deg, 'y') }
  rotateZdegrees(deg) { return this.rotate_degrees(deg, 'z') }
  rotate_degrees(deg, axis) {
    var e = new THREE.Euler();
    e[axis] = deg * THREE.Math.DEG2RAD;
    var rot = new THREE.Quaternion().setFromEuler(e);
    // var o = this.origin.quaternion;
    // var w = this.world.quaternion;
    var l = this.local.quaternion; // <-- we're working in this
    var r = this.object.quaternion; // <-- we want this
    var l2r = l.clone().inverse().multiply(r);
    return rot.multiply(l).multiply(l2r);
    //return l2r.multiply(rel);
    //return irot.multiply(krot.inverse()).multiply(rot).inverse();
  }
};

class BindPoseExtractor {
  constructor(skeleton) {
    this.skeleton = skeleton;

    this.quaternions = skeleton.bones.reduce((out, bone) => {
      out[bone.name] = bone.quaternion.clone(); return out;
    }, {});
    this.worldQuaternions = skeleton.bones.reduce((out, bone) => {
      out[bone.name] = bone.getWorldQuaternion(new THREE.Quaternion()); return out;
    }, {});
    this.worldPositions = skeleton.bones.reduce((out, bone) => {
      out[bone.name] = bone.getWorldPosition(new THREE.Vector3()); return out;
    }, {});
    this.rotations = skeleton.bones.reduce((out, bone) => {
      out[bone.name] = bone.rotation.clone(); return out;
      //out[bone.name].order = 'XYZ';
    }, {});
    this.planes = skeleton.bones.reduce((out, bone) => {
      out[bone.name] = this.getPlane(bone); return out;
    }, {});
  }
  _getJointTriplet(bone) {
    bone = typeof bone === 'string' ? this.skeleton.getBoneByName(bone) : bone;
    return bone ? [bone.parent, bone, bone.children[0]] : [];
  }
  getTripletWorldPoints(bone) {
    var abc = this._getJointTriplet(bone).filter(Boolean);
    return abc.length === 3 ? abc.map((x)=>x.getWorldPosition(new THREE.Vector3())): null;
  }
  getPlane(bone) {
    var abc = this.getTripletWorldPoints(bone);
    return abc && Object.assign(new THREE.Plane().setFromCoplanarPoints(abc[0], abc[1], abc[2]), { bones: this._getJointTriplet(bone) });
  }
};

class Inversions {
  constructor(from, to, orders={ x: 'XYZ', y: 'YXZ', z: 'ZYX' }) {
    this.from = from;
    this.to = to;
    this._x = new RelativeHelper(to, from, orders.x);
    this._y = new RelativeHelper(to, from, orders.y);
    this._z = new RelativeHelper(to, from, orders.z);
  }
  toString() { return `[Inversion X=${this.x.toFixed(1)} Y=${this.y.toFixed(1)} Z=${this.z.toFixed(1)}]`; }
  nudgeDegrees(axis, deg) { this['_'+axis].object.quaternion.copy(this['_'+axis]['rotate'+axis.toUpperCase()+'degrees'](deg)); }
  get X() { return this._x.degrees; }
  get Y() { return this._y.degrees; }
  get Z() { return this._z.degrees; }
  get x() { return this.X.x; }
  get y() { return this.Y.y; }
  get z() { return this.Z.z; }
  
  constrainMax(axis, inv = 1) {
    var ta = this[axis];
    if (ta > 0) this.nudgeDegrees(axis, inv * ta);
  }
  constrainMin(axis, inv = -1) {
    var ta = this[axis];
    if (ta < 0) this.nudgeDegrees(axis, inv * ta);
  }
  recenter(axis, inv = -1) {
    this.nudgeDegrees(axis, inv * this[axis]);
  }
  // limit(axis, min, max) {
  //   var ta = this[axis];
  //   //if (ta > max) this.nudgeDegrees(axis, -ta);
  //   if (ta > 0) this.nudgeDegrees(axis, -ta);
  // 
  // }
};


export { LocalHelper, WorldHelper, SpaceHelper };
export { Inversions, BindPoseExtractor, RelativeHelper };

try { Object.assign(self, { LocalHelper, WorldHelper, SpaceHelper }); } catch(e) {}

