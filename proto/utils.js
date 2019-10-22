// armature.utils.js -- misc rig/skeleton helper utilities

const version = '0.0.0a';

export {
    version,
    _decoupledSkeletonClone,
    extractSkeleton,
    clamp,
    getRelativeRotation,
    eulerFromDegrees,
    quatFromDegrees,
    degrees,
    setQuaternionFromDirection,
    quadOut,
};

try { Object.assign(self, {
    version,
    _decoupledSkeletonClone,
      getRootBones,
    extractSkeleton,
    clamp,
    getRelativeRotation,
    eulerFromDegrees,
    quatFromDegrees,
    degrees,
    setQuaternionFromDirection,
    quadOut,
}); } catch(e) {}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function quadOut(t) { return t * (2 - t); }
function eulerFromDegrees(arr, order) {
  arr = arr.map((x) => THREE.Math.DEG2RAD * x);
  return new THREE.Euler(arr[0], arr[1], arr[2], order);
}

degrees._euler = new THREE.Euler;
function degrees(rot, order) {
  var e = degrees._euler;
  if (order) e.order = order;
  if (rot instanceof THREE.Quaternion)
    e.setFromQuaternion(rot);
  else
    e.copy(rot);

  var out = new THREE.Vector3(e).multiplyScalar(THREE.Math.RAD2DEG);
  out.toEuler = function(order) {
    var e = degrees._euler.clone();
    if (order) e.order = order;
    return e.setFromQuaternion(this.toQuaternion());
  };
  out.toQuaternion = function() {
    var e = degrees._euler;
    e.x = this.x * THREE.Math.DEG2RAD;
    e.y = this.y * THREE.Math.DEG2RAD;
    e.z = this.z * THREE.Math.DEG2RAD;
    return new THREE.Quaternion().setFromEuler(e);
  };
  return out;
}

function quatFromDegrees(arr, order) {
  if (arr instanceof THREE.Quaternion) return arr;
  var euler = eulerFromDegrees(arr, order);
  return Object.assign(new THREE.Quaternion().setFromEuler(euler), { $order : euler.order });
}

function getRelativeRotation(child, parent) {
    //var a = new THREE.Quaternion(), b = new THREE.Quaternion();
    const inverseParent = new THREE.Matrix4().getInverse(parent.matrixWorld);
    return new THREE.Quaternion().setFromRotationMatrix(inverseParent.multiply(child.matrixWorld));
    //return parent.getWorldQuaternion(a).inverse().multiply(child.getWorldQuaternion(b));
}

function extractSkeleton(model) {
    // if (model.children.length === 1 && model.children[0].type === 'Object3D') {
    //     model = model.children[0];
    // }
    var group = model;//model.children.find((x)=>x.type === 'Group') || model;
    var meshes=[];
    model.traverse((x)=>x.type === 'SkinnedMesh'&&meshes.push(x));
    // some GLTFs parse with partial armatures on submeshes; this attempts to find the most complete skeleton available
    var mesh = meshes.sort((a,b)=>{ a=a.skeleton.bones.length; b=b.skeleton.bones.length; return a < b ? -1 : a > b ? 1 : 0 }).reverse()[0];
    var skeleton = mesh.skeleton;
    var rootBone = skeleton.bones.filter((x)=>/Hips/.test(x.name))[0];
    return {
        group: group,
        mesh: mesh,
        meshes: meshes,
        skeleton: mesh.skeleton,
        rootBone: rootBone,
        __proto__: model,
    };
};

function getRootBone(skeleton) {
  return getRootBones(skeleton)[0];
}
function getRootBones(skeleton) {
  return skeleton.bones.filter((x)=>(!x.parent || !x.parent.isBone));
}
// TODO: check if THREE.examples.SkeletonUtils offers a way to clone (functional) skeleton copies
function _decoupledSkeletonClone(skeleton, container) {
    var backup = skeleton.clone();
    var old2new = {};
    backup.bones = backup.bones.map((x)=>{
        var bone = backup[x.name] = x.clone(false);
        bone.$parent = (x.parent&&x.parent.name);
        bone.$$children = x.children.map((x)=>x.uuid);
        bone.$children = x.children.map((x)=>x.name);
        bone.$$uuid = x.$uuid || x.uuid;
        bone.$uuid = x.uuid;
        old2new[x.uuid] = bone;
        return bone;
    });
    //console.info('old2new', old2new)
    backup.bones.forEach((x) => {
      x.children = x.$$children.map((oldid) => {
        if (!old2new[oldid]) throw new Error('!old2new'+[oldid, x.name]);
        return old2new[oldid];
      });
    });
    container.name = container.name || 'skeleton-clone';
    var armature = getRootBone(skeleton).parent;
    container.scale.copy(armature.scale);
    container.position.copy(armature.position);
    container.quaternion.copy(armature.quaternion);
    backup.$getBoneByUUID = function($uuid) { return this.bones.filter((x)=>x.$uuid === $uuid)[0]; };
    backup.bones.forEach((x) => { x.parent = (backup[x.$parent] || container); });
    backup.pose();
    backup.bones.forEach((x) => backup[x.name].updateMatrix());
    backup.update();
    return backup;
}

// THREE.IK.utils.setQuaternionFromDirection
/**
 * Takes a direction vector and an up vector and sets
 * `target` quaternion to the rotation. Similar to THREE.Matrix4's
 * `lookAt` function, except rather than taking two Vector3 points,
 * we've already calculaeld the direction earlier so skip the first half.
 *
 * @param {THREE.Vector3} direction
 * @param {THREE.Vector3} up
 * @param {THREE.Quaternion} target
 */
 const t1 = new THREE.Vector3();
 const t2 = new THREE.Vector3();
 const t3 = new THREE.Vector3();
 const m1 = new THREE.Matrix4();

function setQuaternionFromDirection(direction, up, target) {
  const x = t1;
  const y = t2;
  const z = t3;
  const m = m1;
  const el = m1.elements;

  z.copy(direction);
  x.crossVectors(up, z);

  if (x.lengthSq() === 0) {
    // parallel
    if (Math.abs(up.z) === 1) {
      z.x += 0.0001;
    } else {
      z.z += 0.0001;
    }
    z.normalize();
    x.crossVectors(up, z);
  }

  x.normalize();
  y.crossVectors(z, x);

  el[ 0 ] = x.x; el[ 4 ] = y.x; el[ 8 ] = z.x;
  el[ 1 ] = x.y; el[ 5 ] = y.y; el[ 9 ] = z.y;
  el[ 2 ] = x.z; el[ 6 ] = y.z; el[ 10 ] = z.z;

  return target.setFromRotationMatrix(m);
}

// const flipY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), THREE.Math.degToRad(180));
// const flipX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), THREE.Math.degToRad(180));
// const flipZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), THREE.Math.degToRad(180));
// const rot90Xn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), THREE.Math.degToRad(-90));
// const rot90X = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), THREE.Math.degToRad(90));
// const rot90Y = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), THREE.Math.degToRad(90));
// const rot90Yn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), THREE.Math.degToRad(-90));
// const rot90Z = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), THREE.Math.degToRad(90));
// const rot90Zn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), THREE.Math.degToRad(-90));
// export { flipX, flipY, flipZ }

