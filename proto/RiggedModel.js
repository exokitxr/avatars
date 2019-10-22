// RiggedModel.js -- extended IK Rig class with SkinnedMesh retargeting support

import { fixSkeletonZForward } from './three-ik/modified.AxisUtils.js';
import { clamp, getRelativeRotation, extractSkeleton, quatFromDegrees } from './utils.js';
import { BindPoseExtractor, RelativeHelper, SpaceHelper } from './experiments.js';
import { Armature } from './Armature.js';
import {
  Head, Hips, OldFeet, Feet as Feet2, Shoulders, Arms, RigState
} from './IKComponents.js';

console.table && console.table({
  RigState: RigState.version,
  Armature: Armature.version,
  Head: Head.version,
  Hips: Hips.version,
  Feet: Feet.version,
  Shoulders: Shoulders.version,
  Arms: Arms.version,
});

// Rig.js == base rigging class that comprehends joints across an Armature and helps coordinates IK integration
class Rig {
  static get version() { return '0.0.1'; }

  constructor(skeleton, options, targets) {
    options = options || {};
    this.skeleton = skeleton;
    this.state = new RigState(this, 'standing');
    this.options = options;
    this.targets = targets || options.targets || { empty: true };
    this.config = Object.assign(options.config||{}, Object.assign({
      ik: true,
      backpropagate: true,
      grounding: true,
    }, options.config || {}));
    console.info('RIG', Rig.version, this.config);
    this.chains = options.chains || {};
    this.constraints = options.constraints || Rig.DefaultConstraints;

    this.armature = new Armature(this.skeleton, options);
    this.armature.armatureObject.updateMatrixWorld(true);
    this.armature.armatureObject.matrixAutoUpdate=false;
    this.armature.hips.matrixAutoUpdate=false;
    this.Armature = new SpaceHelper(this.armature.armatureObject);

    //skeleton.pose();
    //skeleton.calculateInverses();
    //skeleton.update();
    this.metrics = this.armature.metrics;
    this.backup = this.armature.backup;
    this.poseBones = this.armature.bones;

    this.scale = this.backup.metrics.scale;
    
    this.head = new Head(this, { from: 'Neck', to: 'Head', target: this.targets.Head });
    if (0) {
      this.feet = new OldFeet(this, {
        left: { name: 'LeftFoot', target: this.targets.LeftFoot },
        right: { name: 'RightFoot', target: this.targets.RightFoot },
      });
    } else {
      this.feet = new Feet2(this, {
        left: { from: 'LeftUpLeg', to: 'LeftFoot', target: this.targets.LeftFoot },
        right: { from: 'RightUpLeg', to: 'RightFoot', target: this.targets.RightFoot },
      });
    }
    this.hips = new Hips(this);
    this.shoulders = new Shoulders(this);
    this.arms = new Arms(this, {
      left: { from: 'LeftArm', to: 'LeftHand', target: this.targets.LeftHand },
      right: { from: 'RightArm', to: 'RightHand', target: this.targets.RightHand },
    });
    
    this.sync = {
      enabled: true,
      postSolve: (time, deltaTime) => {
        // coordinate world <=> armature <=> hips space
        this.syncReferenceFrames(time, deltaTime);
      },
    };
  }
  get components() { return [ this.head, this.hips, this.shoulders, this.arms, this.feet, this.state, this.sync ]; }
  get activeComponents() { return this.components.filter((x)=>x.enabled); }

  execute(method, ...args) {
    return this.activeComponents.map((component)=> (component[method] && component[method](...args)));
  }
  tick(time, deltaTime) {
    this.feet.enabled = this.config.grounding;
    //this.hips.enabled = this.config.fallback;
    if (this.config.ik) {
      for (const method of ['preSolve', 'tick', 'postSolve']) {
        this.execute(method, time, deltaTime);
      }
    }
  }
  syncReferenceFrames(time, deltaTime) {
    // FIXME: this ~works but Armature vs. hips vs. head compete and sometimes spaz out
    var p = this.armature.virtual.position;
    //console.info(p)
    //var tmp = this.armature.virtual.rotation.clone();
    this.Armature.position.set(p.x,0,p.z);
    var core = this.armature.armatureObject;
    var hips = this.armature.hips;
    var tmp = this.armature.virtual.rotation.clone();
    var b = core.quaternion.clone().inverse();
    tmp.x = tmp.z = 0;
    //tmp.y *= -1;
    core.rotation.copy(tmp);
    hips.quaternion.slerp(hips.quaternion.multiply(b.multiply(core.quaternion)), 1);
    hips.updateMatrix(true);
    hips.updateMatrixWorld(true);
    core.updateMatrix(true);
    core.updateMatrixWorld(true);
  }

  // _armatureRelative(thing) {
  //   var relative = new THREE.Object3D();
  //   relative.position.copy(this.$armature.worldToLocal(thing.getWorldPosition(new THREE.Vector3())));
  //   relative.quaternion.copy(this.$armature.world.quatTo(thing));
  //   relative.parent = this.$armature.object;
  //   return relative;
  // }

  getBone(name) { return this.armature.get(name); }
  getIKTarget(name) { return typeof name === 'string' ? this.targets[name] : name; }

  get iks() {
    return this.components.reduce((iks, c) => {
      return iks.concat([c.ik, c.left && c.left.ik, c.right && c.right.ik].filter((x)=>(x && x instanceof AutoIKChain)));
    }, []);
    }
  get ikJoints() {
    var ikJoints = [];
    this.iks.forEach((ik) => {
      ik && ik.joints && ik.joints.forEach((j) => {
        ikJoints.push(ikJoints[j.bone.name]=j);
      });
    });
    return ikJoints;
  }
};

export { Rig };

// ----------------------------------------------------------------------------

class RiggedModel extends Rig {
  static get version() { return '0.0.1b'; }
  static get DefaultTargets() { return [
    'Head', 'LeftHand', 'RightHand', 'Hips', 'LeftFoot', 'RightFoot'
  ]; }
  constructor(model, options) {
    options = options || {};
    options.targets = options.targets || createInternalIKTargets(
      RiggedModel.DefaultTargets, { $internal: true }
    );
    var base = extractSkeleton(model, options)
    super(base.skeleton, options);
    this.base = base;
    this.model = model;
    this.options = options;
    this.preRotations = this.options.preRotations || {};
    this.exclude = this.options.exclude || [];
    this.group = this.options.group || new THREE.Group();
    this.group.name = this.group.name || "(rebound-skeleton-group)";

    // ======== debug ========
    this.scene = this.debug = window.scene || (top.window.DEBUG && top.window.DEBUG.local('scene')); // TODO: remove
    if (this.debug && this.scene) {
      this.scene.add(this.boundsHelper = new THREE.BoxHelper( this.Armature.object, 0x003300 ));
      this.boundsHelper.parent = this.Armature.object;
    }
    // ======== /debug ========

    //model.updateMatrixWorld(true);
    //this._rebind()
    this._retargetSkeleton();
    this._rebindMeshes();
    this._reparentMeshes();

    this._initialPoses = new BindPoseExtractor(this.skeleton);
    this.armature.bones.toArray().map((bone)=> {
      bone.$relative = new RelativeHelper(bone.parent, bone, 'XYZ');
      Object.defineProperty(bone, 'logicalRotation', { 
        get: function() { return this.$relative.degrees; },
      });
    });
    this._initialPoses.logicalRotations = this.armature.bones.toArray().reduce((out, bone) => {
      out[bone.name] = bone.logicalRotation.clone(); return out;
    }, {});

    if (this.debug) {
      console.table(this._dbg_meshStats);
      console.table(this._dbg_rigStats);
    }
  }

  tick(time, deltaTime) {
    super.tick(time, deltaTime);
    // debugging
    if (window.poses) {
      Object.keys(window.poses).filter((name)=> this.poseBones[name])
        .forEach((name) => window.poses[name] = this.poseBones[name].logicalRotation);
    }
  }

  repose() {
    this.skeleton.pose();
    this.skeleton.calculateInverses();
    this.skeleton.update();
  }

  _parseRotationPatches(patchset) {
    const order = 'YXZ';
    var bones = this.armature.bones;
    var rotations = {};
    for (var p in patchset) {
      var rot = patchset[p].rotation || patchset[p];
      if (rot && isFinite(rot[0])) {
        var bone = bones[p];
        if (bone) {
          bone.$preRotation = rotations[bone.id] = quatFromDegrees(rot, order);
        } else console.warn('rotpatch: no bone named: '+p);
      } else console.warn('rotpatch: invalid rotation: '+[p, JSON.stringify(rot)]);
    }
    return rotations;
  }

  _retargetSkeleton() {
    var flip = this.preRotations.Armature;
    if (flip) {
      console.info('preRotating Armature...', flip);
      this.armature.armatureObject.quaternion.multiply(quatFromDegrees(flip.rotation || flip, 'YXZ'));
    }
    return fixSkeletonZForward(this.armature.rootBone, {
      preRotations: this._parseRotationPatches(this.preRotations),
      exclude: this.exclude,
    });
  }
  
  _rebindMeshes() {
    this.base.meshes.forEach((x) => x.bind(this.skeleton, this.bindMatrix));
  }

  _reparentMeshes(group = this.group) {
    // add meshes
    this.base.meshes.forEach((x) => group.add(x));
    // add internally-created IK targets
    for (var p in this.targets) {
      this.targets[p].$internal && group.add(this.targets[p]);
    }
    // recalculate overall bounds
    this.boundingBox = new THREE.Box3().setFromObject(this.group);
    return group;
  }

  // ========== debug helpers ======= 
  // produces { boneName: { preRotation, bindRotation }, ... }
  get _dbg_rigStats() {
    function xyzdeg(quat = new THREE.Quaternion(), order = 'YXZ') {
      if (!quat) return "n/a";
      var e = new THREE.Euler(0,0,0,order||quat.$order).setFromQuaternion(quat);
      return '['+e.toArray().slice(0,3).map((x)=>( x*THREE.Math.RAD2DEG ).toFixed(3)).join(', ')+']';//' // applied '+e.order;
    }
    return ['Armature', 'Hips','Head','LeftHand','RightHand'].reduce((stats, name) => {
      var bone = this.armature.bones[name];
      stats[name] = {
        //name: name,
        preRotation: xyzdeg(bone.$preRotation),
        bindRotation: xyzdeg(bone.quaternion),
      };
      return stats;
    }, {});
  }
  // produces { meshName: { #bones, #verts, bounds }, ... }
  get _dbg_meshStats() {
    return this.base.meshes.reduce((stats, x) => {
      var weights = x.geometry && x.geometry.attributes.skinWeight;
      var bounds = new THREE.Box3().setFromObject(x).getSize(new THREE.Vector3()).toArray().map((x)=>x.toFixed(1));
      stats[x.name || x.uuid] = {
        bones: x.skeleton && x.skeleton.bones.length,
        'weighted verts': (weights&&weights.count),
        bounds: '< '+bounds.join(', ')+' >',
      };
      return stats;
    }, {});
  }

  // toJSON() {
  //   return {
  //     type: 'rigged-model',
  //     bones: this.skeleton.bones.map((b) => {
  //       return {
  //         uuid: b.uuid,
  //         name: b.name,
  //         matrix: b.matrix,
  //         children: b.children.map((b) => b.uuid),
  //       };
  //     }),
  //     boneInverses: worker.skeleton.boneInverses,
  //   };
  // }

};

function createInternalIKTargets(names, props) {
  return names.reduce((out, c) => {
    out[c] = new THREE.Object3D();
    out[c].name = 'iktarget:' + c;
    Object.assign(out[c], props);
    return out;
  }, {});
}

export { RiggedModel, createInternalIKTargets };
try { Object.assign(window, { RiggedModel, createInternalIKTargets }); } catch (e) {}

