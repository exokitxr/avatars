// Armature.js -- base skeleton abstraction across a well-known joint topology (independent of mesh)

import { _decoupledSkeletonClone } from './utils.js';
import remapJointNames from './remapJointNames.js';
import { SpaceHelper } from './experiments.js';

class Armature {
  static get version() { return '0.0.0a'; }
  constructor(skeleton, options) {
    this.options = options;
    this.skeleton = skeleton;
    this.originalSkeleton = _decoupledSkeletonClone(skeleton, new THREE.Group());
    this.bones = remapJointNames(this.skeleton, options.remapper);
    this.rootBone = this.bones.Hips;
    this.armatureObject = this.rootBone.parent;
    this.bones.Armature = this.bones.Armature || this.armatureObject;
    //this.bones.Armature.rotation.order = 'YXZ';
    this.bones.Hips.rotation.order = 'YXZ';
    this.bones.Head.rotation.order = 'YXZ';

    //this.armatureBone = 
    this.boneNames = Object.keys(this.bones);
    this.metrics = new SkeletonMetrics(skeleton);
    this.backup = _decoupledSkeletonClone(skeleton, new THREE.Group());
    this.backup.metrics = new SkeletonMetrics(this.backup);

    this.virtual = new THREE.Object3D();
    this.virtual.rotation.order = 'YXZ';
    
    const idNames = this.boneNames.reduce((out, x) => {
      out[x.replace(/^(.)(.*)$/, (_, ch, rest) => (ch.toLowerCase()+rest))] = x;
      return out;
    }, {});
    Object.assign(this, new NamedJointWrappers(skeleton, idNames));
  }

  // experimental support for "tearing off" subskeleton chains
  virtualSegment(from, to) {
    var container = {
        name: 'virtualArmatureSegment',
        id: -1,
        uuid: -1,
      __proto__: new THREE.Object3D()
    };
    //var solo = _decoupledSkeletonClone(this.skeleton, new THREE.Group());
    var bc = this.walk(this.get(from), this.get(to));
    if (bc.head.parent) {
      bc.head.parent.getWorldPosition(container.position);
      bc.head.parent.getWorldQuaternion(container.quaternion);
      bc.head.parent.getWorldScale(container.scale);
      container.id = bc.head.parent.id;
      container.uuid = bc.head.parent.uuid;
    }
    var keep = bc.lineage.reduce(function(out, x){ out[x.uuid] = true; return out; }, {});
    //console.info('virtualSegment', keep, bc.lineage);
    var proxies = {};
    var byname = {};
    var vbones = this.skeleton.bones
      .map((x,i)=>{ return byname[x.name] = proxies[x.uuid] = {
        parent: keep[x.parent && x.parent.uuid] ? x.parent : container,
        $boneInverse: this.skeleton.boneInverses[i],
        __proto__: x,
      }})
     .filter((x)=>keep[x.uuid])
     .map((x) => {
       x.parent = proxies[x.parent && x.parent.uuid] || container;
       x.children = x.children.filter((c) => keep[c.uuid]).map((c)=>proxies[c.uuid]);
       if (x.parent === container) container.children.push(x);
       return x;
     })
    var vboneInverses = vbones.map((b)=>b.$boneInverse);
    //console.info('//virtualSegment', vbones.map((x)=>[x.name,x.children.length].join('#')));
    
    return Object.assign(new THREE.Skeleton(vbones, vboneInverses), {
      toString: function() { return `[PartialSkeleton head=${this.head.name} tail=${this.tail.name} bones=${this.bones.length}]`; },
      container: container,
      head: proxies[bc.head.uuid],
      tail: proxies[bc.tail.uuid],
      lineage: bc.lineage.map((x)=>proxies[x.uuid]),
    });
  }

  // helper methods
  get(name) {
    if (typeof name === 'string') return this.bones[name];
    if (name && name.isBone) return name;
    return null;
  }
  inv(name) {
    var i = this.skeleton.bones.indexOf(this.get(name));
    if (~i) { return this.skeleton.boneInverses[i]; }
    return null;
  }
  setInv(name, mat) {
    var i = this.skeleton.bones.indexOf(this.get(name));
    if (!~i) return null;
    this.skeleton.boneInverses[i].copy(mat);
  }
  setUnInv(name, mat) {
    var i = this.skeleton.bones.indexOf(this.get(name));
    if (!~i) return null;
    this.skeleton.boneInverses[i].copy(new THREE.Matrix4().getInverse(mat));
  }
  mat(name) {
    var i = this.skeleton.bones.indexOf(this.get(name));
    if (!~i) return null;
    return new THREE.Matrix4().copy({elements:this.skeleton.boneMatrices.slice(i*16, i*16+16)});
  }
  img(name) {
    var i = this.skeleton.bones.indexOf(this.get(name));
    if (!~i) return null;
    return new THREE.Matrix4().copy({elements:this.skeleton.boneTexture.image.data.slice(i*16, i*16+16)});
  }
  setMat(name, mat) {
    var i = this.skeleton.bones.indexOf(this.get(name));
    if (!~i) return null;
    for (var j=0; j < 16; j++) this.skeleton.boneMatrices[i*16+j] = mat.elements[j];
  }
  setImg(name, mat) {
    var i = this.skeleton.bones.indexOf(this.get(name));
    if (!~i) return null;
    for (var j=0; j < 16; j++) this.skeleton.boneTexture.image.data[i*16+j] = mat.elements[j];
  }
  getLocalRotation(name) {
    var bone = this.get(name);
    var orientation = bone.getWorldQuaternion(new THREE.Quaternion());
    var parentOrientation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    return parentOrientation.inverse().multiply(orientation);
  }
  getBindPose(name) {
    return this.backup[name];
  }
};

export { Armature };
try { Object.assign(self, { Armature }); } catch(e) {}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// NamedJointWrappers.js -- wraps a set of skeleton joints with SpaceHelper instances

class NamedJointWrappers {
	constructor(skeleton, map, biasmap) {
    if (skeleton.skeleton) skeleton = skeleton.skeleton;
    biasmap = biasmap || {};
    this.keys = Object.keys(map);
		for (var name in map) {
			var boneName = map[name];
      if (boneName === 'Armature') {
        this[name] = new SpaceHelper(skeleton.getBoneByName('Hips').parent, { boneName: boneName });
      } else {
        this[name] = new SpaceHelper(skeleton.getBoneByName(boneName), { boneName: boneName });
      }
      this[name].bias = biasmap[name] || biasmap[boneName];
		}
	}
  toString() { return `[NamedJointWrappers ${this.keys}]`; }
};

export { NamedJointWrappers };
try { Object.assign(self, { NamedJointWrappers }); } catch(e) {}

// ---------------------------------------------------------------------------
// SkeletonMetrics.js -- calculates various metrics about a given THREE Skeleton

class SkeletonMetrics {
  static get version() { return '0.0.0'; }
  get scale() {
    return this.eyeHeight/1.6 * this.bones.Hips.parent.scale.x;
  }
  constructor(skeleton) {
    this.skeleton = skeleton;
    this.bones = this.skeleton.bones.reduce((out, b) => {
      out[b.name] = b;
      return out;
    }, {});
    this.boneNames = this.skeleton.bones.map((b)=>b.name);
  }
  get(name, fallback) {
    var b = name instanceof THREE.Bone ? name : this.bones[name] || this.bones[fallback];
    if (!b) throw new Error('!b:'+[name,fallback||'']);
    return b;
  }

  _pos(bone, target) { return bone.getWorldPosition(target); }
  _rot(bone, target) { return bone.getWorldQuaternion(target); }
  pos(name, fallback) {
    return this._pos(this.get(name, fallback), new THREE.Vector3());
  }
  rot(name, fallback) {
    return this._rot(this.get(name, fallback), new THREE.Quaternion());
  }
  centroid(names) {
    var center = new THREE.Vector3();
    for (let name of names) center.add(this.pos(name));
    return center.divideScalar(names.length);
  }
  // maybe LeftToeBase? or if lowest joint in skeleton is epsilon of zero, take feet to be at zero?
  get feet() { return this.pos('LeftFoot').add(this.pos('RightFoot')).multiplyScalar(.5); }
  get midEyes() { return this.pos('LeftEye').add(this.pos('RightEye')).multiplyScalar(.5); }
  get midHead() {
    var pt = this.pos('LeftEye').add(this.pos('RightEye')).multiplyScalar(.5);
    pt.z = this.pos('Head').z;
    return pt;
  }

  get headTop() { return this.pos('HeadTop_End', 'Head'); }
  get headPivot() { return this.pos('Head'); }
  get head() { return this.pos('Head'); }
  get hips() { return this.pos('Hips'); }

  get armLength() { return this.pos('LeftShoulder').sub(this.pos('LeftHand')).length(); }
  get legLength() { return this.pos('LeftUpLeg').sub(this.pos('LeftToeBase', 'LeftFoot')).length(); }

  get eyesOffset() { return this.midEyes.sub(this.headPivot); }
  get headOffset() { return this.midHead.sub(this.midEyes); }
  get cameraOffset() { return this.midEyes.sub(this.head); }
  get hipsOffset() { return this.midEyes.sub(this.hips); }

  //get height() { return this.headTop.y; }
  get lowestBone() { return this._mmbone(this.bones.Hips, -1).bone; }
  get highestBone() { return this._mmbone(this.bones.Hips, 1).bone; }
  _mmbone(root, dir) {
    var out = {
      root: root,
      dir: dir,
      bone: null,
      pos: dir < 0 ? new THREE.Vector3(Infinity, Infinity, Infinity) : new THREE.Vector3(-Infinity, -Infinity, -Infinity),
    };
    root.traverse((b)=> {
      var pt = this.pos(b);
      var better = dir < 0 ? (pt.y < out.pos.y) : (pt.y > out.pos.y);
      if (better) {
        out.bone = b;
        out.pos.copy(pt);
      }
    });
    return out;
  }

  get height() { return this.headTop.distanceTo(this.feet); }
  get eyeHeight() { return this.midEyes.distanceTo(this.feet); }

  get altitude() { return this.hips.y; }

  relativeTo(bone, names) {
    names = names || this.boneNames;
    var bones = names.map((x) => this.get(x));
    var inv = new THREE.Matrix4().getInverse(bone.matrixWorld);
    return bones.reduce((out, bone) => {
      out[bone.name] = this.pos(bone).applyMatrix4(inv);
      return out;
    }, {});
  }
};

export { SkeletonMetrics };

try { Object.assign(self, { SkeletonMetrics }); } catch(e) {}
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
