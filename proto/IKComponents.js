// Rigging components

import { AutoIKChain, walkBoneChain } from './three-ik/AutoIKChain.js';
import { clamp, quadOut, degrees, quatFromDegrees } from './utils.js';
import { RelativeHelper, Inversions } from './experiments.js';
import { NamedJointWrappers } from './Armature.js';

// placeholder base class for ik.components
class Component {
  constructor(rig, options = {}) {
    this.rig = rig;
    this.options = options || {};
    this.enabled = options.enabled !== false;
  }
  tick(time, deltaTime) { }
  preSolve(time, deltaTime) {}
  postSolve(time, deltaTime) {}
  toString() { return `[${this.constructor.name}]`; }
};

class AutoIKComponent extends Component {
  constructor(rig, options) {
    super(rig, options);
    this.options = options;
    this.from = rig.getBone(options.from);
    this.to = rig.getBone(options.to);
    this.target = options.target;
    this.boneChain = walkBoneChain(this.from, this.to);
    this.ik = new AutoIKChain(this.boneChain.lineage, this.target, Object.assign(this.options, {
      preConstrain: (...args) => this.preConstrain(...args),
      postConstrain: (...args) => this.postConstrain(...args),
      backwardConstrain: (...args) => this.backwardConstrain(...args),
      forwardConstrain: (...args) => this.forwardConstrain(...args),
    }));
  }

  backwardConstrain(joint) {}
  forwardConstrain(joint) {}
  preConstrain(joint) {}
  postConstrain(joint) {}

  preSolve(time, deltaTime) {
    this.ik.preSolve(time, deltaTime);
  }
  tick(time, deltaTime) {
    this.ik.tick(time, deltaTime);
  }
  postSolve(time, deltaTime) {
    this.ik.postSolve(time, deltaTime);
    this.rig.config.backpropagate && this.ik.syncTail(time, deltaTime);
  }
};  

export { Component, AutoIKComponent };
// Arms placeholder component

const quaternionZ180 = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0)
);

class Arm extends AutoIKComponent {
  static get version() { return '0.0.0'; }
  constructor(rig, options) {
    super(rig, options);
    // this.from = rig.getBone(options.from);
    // this.to = rig.getBone(options.to);
    // this.target = options.target;
    // this.boneChain = walkBoneChain(this.from, this.to);
    // if (!this.boneChain.valid) throw new Error('invalid Arm bone chain: '+ [options.from, options.to]);
    // this.ik = new AutoIKChain(this.boneChain.lineage, this.target, this.options);
    this.ik.syncTail = () => this.syncTail();
  }
  syncTail() {
    const { tail, target } = this.ik;
    if (!target) throw new Error('!target '+ tail.name);
    tail.parent.updateMatrixWorld(true);
    tail.quaternion.copy(getRelativeRotation(target, tail.parent)).multiply(quaternionZ180)//this._armatureRelative(target).quaternion);//));
    tail.updateMatrixWorld(true);
  }
  // preSolve(time, deltaTime) {
  //     this.ik.tick(time, deltaTime);
  // }
  // tick(time, deltaTime) {
  //   // TODO: attempted "roll" correction to mitigate THREE.IK could go here
  //     //this.ik.tick(time, deltaTime);
  // }
  // postSolve(time, deltaTime) {
  //     this.ik.syncTail(time, deltaTime);
  // }
};

class Arms extends Component {
  static get version() { return '0.0.0'; }
  constructor(rig, options) {
    super(rig, options);
    this.left = new Arm(rig, options.left);
    this.right = new Arm(rig, options.right);
  }
  tick(time, deltaTime) {
      this.left.tick(time, deltaTime);
      this.right.tick(time, deltaTime);
      // TODO: could maybe attempt some "roll" correction here to mitigate THREE.IK effects
  }
  preSolve(time, deltaTime) {
    this.left.preSolve(time, deltaTime);
    this.right.preSolve(time, deltaTime);
  }
  postSolve(time, deltaTime) {
    this.left.postSolve(time, deltaTime);
    this.right.postSolve(time, deltaTime);
  }
}

export { Arm, Arms };


// Feet placeholder component


class ThreePointIK extends Component {
  constructor(rig, options) {
    options = options || {};
    super(rig, options);

    if (!options.root) throw new Error('missing option .root');
    this.root = new SpaceHelper(options.root);
    ['start','a','b','c','end'].forEach((p)=> {
      var obj = options[p];
      if (!obj) throw new Error('missing option: ' + p);
      this[p] = new RelativeHelper(obj, this.root);
      obj.rotation.order = options.order || 'XYZ';
    });
    this.abcLength = this.c.world.position.sub(this.b.world.position).add(this.b.world.position.sub(this.a.world.position)).length();
    
    this.lastAngle = 0;
    this.scale = options.scale || .5;
    
    this.t = Math.PI*-.7;
    this.s = Math.PI*-.4;
    this.u = Math.PI*.1;
    
    this.output = {
      start: new THREE.Quaternion(),
      mid: new THREE.Quaternion(),
      end: new THREE.Quaternion(),
      get a() { return new THREE.Euler(0,0,0,'XYZ').setFromQuaternion(this.start); },
      get b() { return new THREE.Euler(0,0,0,'XYZ').setFromQuaternion(this.mid); },
      get c() { return new THREE.Euler(0,0,0,'XYZ').setFromQuaternion(this.end); },
    };
    this.output[this.a.object.name] = this.output.start;
    this.output[this.b.object.name] = this.output.mid;
    this.output[this.c.object.name] = this.output.end;
      
    this.alpha = options.alpha || [0,0,0];
  }
  get length() {
    return (this.start.world.position.y-this.end.world.position.y)*this.scale;
  }
  get plength() {
    return this.length/this.abcLength;
  }
  get rotationAngleDegrees() {
    var dist = this.abcLength - this.length;
    return clamp( Math.pow(dist,.5) * -90, -80, 0);
    // return clamp( this.plength * -90, 0, 80) || 0;
  }
  tick(time, deltaTime) {
    var rig = this.rig;
    var rotateAngle = this.rotationAngleDegrees;
    // var rotateAngle = clamp( Math.pow(dist,.5) * -90, -80, 0);
    // if (rig.state.isLaying()) {
    //     rotateAngle = this.lastAngle = -15;
    // }
    // var rotateAngle = this.rotationAngleDegrees;
    //window.config.blah = [this.plength, rotateAngle].map((x)=>x.toFixed(3))+'';
    this._solution((10*this.lastAngle + rotateAngle)/11);
    this.lastAngle = rotateAngle;
  }
  postSolve(time, deltaTime) {
    if (this.alpha[0]) this.a.object.quaternion.slerp(this.rig._initialPoses.quaternions[this.a.object.name], this.alpha[0]||0);
    if (this.alpha[1]) this.b.object.quaternion.slerp(this.rig._initialPoses.quaternions[this.b.object.name], this.alpha[1]||0);
    if (this.alpha[2]) this.c.object.quaternion.slerp(this.rig._initialPoses.quaternions[this.c.object.name], this.alpha[2]||0);
  }
  
  _solution(rotateAngle) {
    var out = this.output;
    var _start = { rotation: out.a }, _end = { rotation: out.b }, _mid = { rotation: out.c };
    
    _start.rotation.x = rotateAngle * THREE.Math.DEG2RAD * 1.5;
    _start.rotation.x += this.s || 0;
    _start.rotation.y = _start.rotation.z = 0;
    _mid.rotation.y = _mid.rotation.z = 0;
    _mid.rotation.x = -_start.rotation.x * 1.5;//-2*rotateAngle * THREE.Math.DEG2RAD;
    _mid.rotation.x += this.t || 0;
    _end.rotation.y = _end.rotation.z = 0;
    _end.rotation.x = -Math.PI/2 - _mid.rotation.x/4;
    _end.rotation.x += this.u || 0;

    out.start.setFromEuler(_start.rotation);//new THREE.Euler(rotateAngle * THREE.Math.DEG2RAD * 1.5 + (this.s || 0), 0, 0));
    out.mid.setFromEuler(_mid.rotation);//new THREE.Euler(out.start.x * 1.5 + (this.t || 0), 0,0));
    out.end.setFromEuler(_end.rotation);//new THREE.Euler(-Math.PI/2 - this.b.rotation.x/4 + (this.u || 0), 0, 0));
    // return out;
    return out;
  }
};

export  { ThreePointIK };

class Foot extends AutoIKComponent {
  static get version() { return '0.0.0'; }
  constructor(rig, options) {
    super(rig, options);
    this.threep = new ThreePointIK(rig, {
      root: rig.armature.armatureObject,
      start: rig.getBone('Hips'),
      end: rig.getBone('Hips').parent,
      c: rig.getBone(this.to),
      b: rig.getBone(this.to.parent),
      a: rig.getBone(this.to.parent.parent),
      alpha: [0,0,.5],
    });
    
    var offset = options.offset || new THREE.Vector3(.1,0,-.01);
    if (/right/i.test(this.to.name)) offset.x *= -1;
    this.offset = this.rig.backup.metrics.bones[this.to.name].localToWorld(offset);
    this.hipsTarget = new RelativeHelper(this.rig.armature.armatureObject, this.to.parent);
    this.lscale = 1.0;
  
  }
  _constrainJoint(joint, eulerCB, options ) {
    options = options || { up: new THREE.Vector3(0,1,0), order: 'XYZ' };
    var to = joint.bone.parent.matrixWorld.clone();
    var from = to.clone().getInverse(to);
    var world = this.rig._initialPoses.worldQuaternions[joint.bone.name].clone();
    var prot = this.rig._initialPoses.worldQuaternions[joint.bone.parent.name].clone();
    //prot.copy(world.clone().inverse().multiply(prot.clone()));
    prot.copy(world.multiply(prot.clone().inverse()));//prot.clone().inverse()));
    //var prot = joint.bone.parent.getWorldQuaternion(new THREE.Quaternion());
    joint._direction.applyQuaternion(prot.clone().inverse());
    var blah = options.up || new THREE.Vector3(0,1,0);
    var quat = new THREE.Quaternion().setFromUnitVectors(blah, joint._direction);
    var tpl = new THREE.Euler(0,0,0, options.order || 'XYZ');
    var euler = tpl.clone().setFromQuaternion(quat);
    var logical = tpl.clone().setFromQuaternion(joint.bone.$relative.quaternion);
    var pose = tpl.clone().setFromQuaternion(this.rig._initialPoses.quaternions[joint.bone.name]);
    eulerCB(euler, { blah, quat, euler, logical, pose, to, from, prot, joint, bone:joint.bone });
    quat.setFromEuler(euler);
    joint._direction.copy(blah.clone().applyQuaternion(quat));
    joint._direction.applyQuaternion(prot.clone()).normalize();
  }
  backwardConstrain(joint) {
    var func = window[joint.bone.name];
    if (func) return this._constrainJoint(joint,func, func);
  }
  get desiredTargetPosition() {
    var off = this.offset.clone();
    if (this.rig.metrics.hips.y < .7) {
      off.x *= this.lscale;
    }
    var p = this.rig.armature.hips.world.position.sub(this.rig.armature.metrics.hipsOffset)
      .add(off.applyQuaternion(this.rig.armature.hips.world.quaternion));
    p.y = Math.max(0, p.y-.9);
    return p;
  }
  get desiredTargetQuaternion() { return this.hipsTarget.world.quaternion.clone().multiply(quatFromDegrees([0,0,0])); }

  preSolve(time, deltaTime) {
    this.threep.preSolve(time, deltaTime);
    if (this.rig.config.backpropagate) {
      this.target.position.lerp(this.desiredTargetPosition,.05);
      this.target.position.y = this.desiredTargetPosition.y;
    }
    super.preSolve(time, deltaTime);
    //this.rig.getIKTarget('RightFoot').position.copy(this.rig.armature.bones.Hips.position.clone().sub(new THREE.Vector3(0,-.5,0)));
  
  }
  tick(time, deltaTime) {
    this.threep.tick(time, deltaTime);
    super.tick(time, deltaTime);
  }
  postSolve(time, deltaTime) {
    this.threep.postSolve(time, deltaTime);
    //super.postSolve(time, deltaTime);
    if (this.rig.config.backpropagate) {
      this.target.quaternion.copy(this.desiredTargetQuaternion);
      this.target.position.lerp(this.desiredTargetPosition,.05);
    }
  }

};

class Feet extends Component {
  static get version() { return '0.0.0'; }
  constructor(rig, options) {
    super(rig, options);
    // this.oldfeet = new OldFeet(rig, options);
    this.left = new Foot(rig, options.left);
    this.right = new Foot(rig, options.right);
    this._old = {};
    
    this.standHeight = .8
  }
  get standing() { return this.rig.metrics.hips.y > this.standHeight; }
  _upperLegs(alpha=1.0) {
    this.limit('LeftUpLeg', 'y', 'max');
    this.limit('RightUpLeg', 'y', 'min');
    this.limit('LeftUpLeg', 'z', [-.05,.05]);
    this.limit('RightUpLeg', 'z', [-.05,.05]);
    //this.limit('RightUpLeg', 'z', 0);
     //this.limit('LeftUpLeg', 'z', 0);
     this.limit('LeftLeg', 'z', null);
     this.limit('RightLeg', 'z', null);
    this.rig.poseBones.Hips.updateMatrixWorld(true);
  }
  _middleLegs(alpha=1.0) {
    this.limit('LeftLeg', 'z', null);
    this.limit('RightLeg', 'z', null);
    this.limit('LeftLeg', 'y', null);
    this.limit('RightLeg', 'y', null);
    this.limit('LeftLeg', 'x', 'max');
    this.limit('RightLeg', 'x', 'max');
    // this.limit('RightLeg', 'z', 0);
    // this.limit('LeftLeg', 'z', 0);
    this.rig.poseBones.Hips.updateMatrixWorld(true);
  }
  _lowerLegs(alpha=1.0) {
    this.limit('LeftFoot', 'z', null);
    this.limit('RightFoot', 'z', null);
    this.limit('LeftFoot', 'y', null);
    this.limit('RightFoot', 'y', null);
    this.limit('LeftFoot', 'x', null);
    this.limit('RightFoot', 'x', null);
    this.rig.poseBones.Hips.updateMatrixWorld(true);

  }
  preSolve(time, deltaTime) {
    // this.oldfeet.preSolve(time, deltaTime);
    if (this.rig.metrics.hips.y > .7) {
      this._upperLegs();
      this._middleLegs();
      this._lowerLegs();
    }
    this.left.lscale = this.right.lscale = this._offscale;
    this.left.preSolve(time, deltaTime);
    this.right.preSolve(time, deltaTime);
  }
  tick(time, deltaTime) {
    // this.oldfeet.tick(time, deltaTime);
    this.left.tick(time, deltaTime);
    this.right.tick(time, deltaTime);
  }
  _savecurrent() {
    this._old = {};
    for (var p in this.rig.poseBones) {
      this._old[p] = this.rig.poseBones[p].quaternion.clone();
    }
  }
  restPose(alphas=[1,1,1]) {
    if (!this._old.LeftLeg) return;
    [ this.rig.poseBones.LeftUpLeg, this.rig.poseBones.LeftLeg, this.rig.poseBones.LeftFoot ]
    .forEach((b, i,arr) => {
      b.quaternion.slerp(this._old[b.name], alphas[i]);
    });
    [ this.rig.poseBones.RightUpLeg, this.rig.poseBones.RightLeg, this.rig.poseBones.RightFoot ]
    .forEach((b, i,arr) => {
      b.quaternion.slerp(this._old[b.name], alphas[i]);
    });
  }
  kneelPose(alphas=[1,1,1]) {
    [ this.rig.poseBones.LeftUpLeg, this.rig.poseBones.LeftLeg, this.rig.poseBones.LeftFoot ]
    .forEach((b, i,arr) => {
      //b.rotation.set(0,0,0);
      b.quaternion.slerp(this.left.threep.output[b.name], alphas[i]);
    });
    [ this.rig.poseBones.RightUpLeg, this.rig.poseBones.RightLeg, this.rig.poseBones.RightFoot ]
    .forEach((b, i,arr) => {
      //b.rotation.set(0,0,0);
      b.quaternion.slerp(this.right.threep.output[b.name], alphas[i]);
    });
  }
  get _offscale() { 
    return clamp(this.rig.armature.hips.world.position.y,0.001,1);
    //return clamp((-this.standHeight)/this.standHeight, .01, 1);
  }
  postSolve(time, deltaTime) {
    // this.oldfeet.postSolve(time, deltaTime);
    this.left.postSolve(time, deltaTime);
    this.right.postSolve(time, deltaTime);
    var sk = Math.max(.01,this._offscale);
    if (!sk) debugger;
    //console.info('sk', sk);
    if (this.standing) {
      this.restPose([.01,.01,.01]);
      this._upperLegs(1-sk);
      this._middleLegs(1-sk);
       this._lowerLegs();
    } else {
      this.restPose([.5,.5,.5]);
      this.kneelPose([sk,sk,sk]);
    }
    this._savecurrent();
    
    //this.kneelPose([sk,sk,sk]);
    // this.rig.poseBones.LeftFoot.rotation.z=0;
    // this.rig.poseBones.RightFoot.rotation.z=0;
    // this.rig.poseBones.RightLeg.quaternion.slerp(this.right.threep.output.mid, .5);
  }

  limit(name, axis, mode, order) {
    var active = this.rig.poseBones;
    var old = this.rig._initialPoses.rotations;
    return limit(name, axis, mode, order);
    function limit(name, axis, mode, order) {
      if (order) active[name].rotation.order=order;
      var live = active[name].rotation[axis];
      var rotation = active[name].rotation.clone();
      
      var rest = old[name][axis];
      if (mode === null) {
        rotation[axis] = rest;
      } else if (Array.isArray(mode)) {
        rotation[axis] = clamp(live, rest + mode[0], rest + mode[1]);
        
      } else if (isFinite(mode)) {
        rotation[axis] = mode;//clamp(live, rest + mode[0], rest + mode[1]);
      } else {
        rotation[axis] = Math[mode](live, rest);
      }
      active[name].quaternion.slerp(new THREE.Quaternion().setFromEuler(rotation), .8);
    }
  }
  
}

export { Foot, Feet };

class OldFeet extends Component {
  static get version() { return '0.0.0'; }
  constructor(rig, options) {
    options = options || {};
    options.left = options.left || {};
    options.right = options.right  || {};
    super(rig, options);

    this.leftUpLeg = rig.getBone('LeftUpLeg');
    this.leftLeg = rig.getBone('LeftLeg');
    this.leftFoot = rig.getBone('LeftFoot');
    this.leftIKFoot = rig.getIKTarget(options.left.target || 'LeftFoot');
    this.rightUpLeg = rig.getBone('RightUpLeg');
    this.rightLeg = rig.getBone('RightLeg');
    this.rightFoot = rig.getBone('RightFoot');
    this.rightIKFoot = rig.getIKTarget(options.right.target || 'RightFoot');
    this.hips = rig.getBone('Hips');
    this.ihips = rig.backup.Hips;
    
    this.lastAngle = 0;
    
    this.t = Math.PI*-.7;
    this.s = Math.PI*-.4;
    this.u = Math.PI*.1;
  }
  tick(time, deltaTime) {
    var rig = this.rig;
    var h = rig.$hipsHeight;
    if (!h) h = this.hips.getWorldPosition(new THREE.Vector3()).y;
    var dist = (this.ihips.position.y-h-.05);
    var rotateAngle = clamp( Math.pow(dist,.5) * -90, -80, 0);
    if (rig.state.isLaying()) {
        rotateAngle = this.lastAngle = -15;
    }
    IKSolve.call(this, (10*this.lastAngle + rotateAngle)/11, this.leftUpLeg, this.leftLeg, this.leftFoot, this.leftIKFoot);
    IKSolve.call(this, (10*this.lastAngle + rotateAngle)/11, this.rightUpLeg, this.rightLeg, this.rightFoot, this.rightIKFoot);
    this.lastAngle = rotateAngle;
  }
}

// naive ground=>foot=>hips IK solver
function IKSolve(rotateAngle, _start, _mid, _end ) {
    if (!isNaN(rotateAngle)) {
        _start.rotation.x = rotateAngle * THREE.Math.DEG2RAD * 1.5;
        _start.rotation.x += this.s || 0;
        _start.rotation.y = _start.rotation.z = 0;
        _mid.rotation.y = _mid.rotation.z = 0;
        _mid.rotation.x = -_start.rotation.x * 1.5;//-2*rotateAngle * THREE.Math.DEG2RAD;
        _mid.rotation.x += this.t || 0;
        _end.rotation.y = _end.rotation.z = 0;
        _end.rotation.x = -Math.PI/2 - _mid.rotation.x/4;
        _end.rotation.x += this.u || 0;
    }
}

export { IKSolve, OldFeet };
try { Object.assign(self, { IKSolve, Feet }); } catch(e) {}// Head placeholder component

class Head extends AutoIKComponent {
  static get version() { return '0.0.0'; }
  constructor(rig, options) {
    super(rig, options);
  }
  preSolve(time, deltaTime) {
    super.preSolve(time, deltaTime);
  }
  tick(time, deltaTime) {
      super.tick(time, deltaTime);
  }
  postSolve(time, deltaTime) {
    super.postSolve(time, deltaTime);
  }
};
export { Head };
try { Object.assign(self, { Head }); } catch(e) {}

const Z_AXIS = new THREE.Vector3(0,0,1);
const Y_AXIS = new THREE.Vector3(0,1,0);
const X_AXIS = new THREE.Vector3(1,0,0);
const Y_QUAT = quatFromDegrees([0,180,0]);

function __dir(q, axis=Z_AXIS) { return axis.clone().applyQuaternion(q); }
function __fwdquat(dir, axis=Z_AXIS) {
  return new THREE.Quaternion().setFromUnitVectors(dir, axis);
}
function __twist(a, b) { return Math.abs(180-a.angleTo(b) * THREE.Math.RAD2DEG); }

class Hips extends Component {
  static get version() { return '0.0.0'; }
  constructor(rig, options) {
    options = options || {};
    super(rig, options);
    this.scene = this.debug = window.scene || (top.window.DEBUG && top.window.DEBUG.local('scene')); // TODO: remove
    this.options = options;
    if (options.followArms !== false) options.followArms = false;
    this.right = new NamedJointWrappers(rig, {
      shoulder: 'RightShoulder',
      arm: 'RightArm',
      foreArm: 'RightForeArm',
      hand: 'RightHand',
    });
    this.left = new NamedJointWrappers(rig, {
      shoulder: 'LeftShoulder',
      arm: 'LeftArm',
      foreArm: 'LeftForeArm',
      hand: 'LeftHand',
    });
    Object.assign(this, new NamedJointWrappers(rig, {
      head: 'Head',
      hips: 'Hips',
      spine: 'Spine',
      spine1: 'Spine1',
      neck: 'Neck',
    }));
    this.Armature = new SpaceHelper(rig.getBone('Hips').parent);

    this.hipsIK = new SpaceHelper(rig.getIKTarget('Hips'));
    this.headIK = new SpaceHelper(rig.getIKTarget('Head'));

    this.laybones = ['Spine','Spine1','Neck'].map((x)=>this.rig.getBone(x)).filter(Boolean);
    this.initial = undefined;//this.capture();
    this.state = undefined;
    
    this.minHeight = .25;
    this.minMovement = .05;
    
    this.hipsLockDegrees = 30;
    this.armLength = rig.backup.metrics.armLength;

    var pose = this.rig.armature.backup;
    var live = this.rig.armature.bones;

    this.centerInversions = {
      hips: new Inversions(pose.Hips, live.Head),
    };
    this.leftInversions = {
      upLeg: new Inversions(pose.Hips, live.LeftUpLeg),
      leg: new Inversions(pose.LeftUpLeg, live.LeftLeg),
    };
    this.rightInversions = {
      upLeg: new Inversions(pose.Hips, live.RightUpLeg),
      leg: new Inversions(pose.RightUpLeg, live.RightLeg),
    };
  }
  preSolve(time, deltaTime) {  }
  postSolve(time, deltaTime) {
    //this.debugOutput = this.centerInversions.hips+'';
  }
  capture() {
    return this.laybones.map((bone) => bone.quaternion.clone());
  }
  restore() {
    var initial = this.initial;
    this.initial = undefined;
    if (initial) {
      this.laybones.map((bone,i) => bone.quaternion.copy(initial[i]));
      //this.rig.skeleton.pose();
    }
  }
  tick(time, deltaTime, source) {
    return this._fallback(time, deltaTime, source || this.rig.targets);
  }
  
  get armsForwardDirection() {
    var dir = this.armsDirection;
    dir.y = 0;
    if (dir.z > 0) dir.z *= -1;
    return dir.normalize();
  }
  get armsForwardQuaternion() { return __fwdquat(this.armsForwardDirection, Z_AXIS); }
  get leftArmDir() { return this._bodyRelative(this.left.hand).position; }
  get rightArmDir() { return this._bodyRelative(this.right.hand).position; }
  get armsDirection() {
    var l = this.leftArmDir;
    var r = this.rightArmDir;
    this.debugOutput = l;
    return l.add(r).multiplyScalar(.5).normalize();
  }
  get relativeHeadQuaternion() { return this.relativeHeadIK.quaternion }
  get relativeDesiredDirection() { 
    var dir = __dir(this.options.followArms ?
        this.relativeHeadQuaternion.slerp(this.armsForwardQuaternion,.5) : 
        this.relativeHeadQuaternion);
    dir.y = 0;
    return dir.normalize();
  }
  get relativeDesiredQuaternion() { 
    return __fwdquat(this.relativeDesiredDirection, Z_AXIS).multiply(quatFromDegrees([0,0,0]));
  }

  _relativeTo(thing, a = this.Armature, flip) {
    var relative = new THREE.Object3D();
    relative.position.copy(a.worldToLocal(thing.getWorldPosition(new THREE.Vector3())));
    relative.quaternion.copy(a.world.quatTo(thing));
    if (flip) relative.quaternion.multiply(flip);
    relative.parent = a.object;
    return relative;
  }
  _armatureRelative(thing, a = this.Armature, flip) { return this._relativeTo(thing, a, flip); }
  _bodyRelative(thing, a = this.hips) { return this._relativeTo(thing, a); }

  get relativeHeadIK() { return this._armatureRelative(this.headIK); }

  get relativeDesiredHipsQuaternion() {
    var hh = this._bodyRelative(this.hips, this.head).quaternion.clone();
    var tmp = new THREE.Euler(0,0,0,'YXZ').setFromQuaternion(hh);
    tmp.x = 0;
    tmp.z = 0;
    //tmp.y *= -1;
    return new THREE.Quaternion().setFromEuler(tmp);
  }
  get localDesiredHipsQuaternion() {
    return this.relativeDesiredHipsQuaternion.multiply(quatFromDegrees([180,180,0]));
  }
  set debugOutput(nv) {
    if (!this.debug) return;
    try {
      if (typeof window === 'object' && window.debugOutElement) window.debugOutElement.innerText = nv+'';
    } catch(e) {}
  }
  //plump() { return this.rig.backup.metrics.head.y; }
  _fallback(time, deltaTime, source) {

    if (this.debug && this.scene && !this.xx) {
      this.xx = new THREE.AxesHelper();
      this.scene.add(this.xx);
      this.xx.parent = this.Armature.object;
    }
    if (this.xx) {
      this.xx.position.copy(this.armsForwardDirection);//this.relativeDesiredDirection.multiplyScalar(-1));
      this.xx.quaternion.copy(this.relativeDesiredQuaternion);
    }

    var rig = this.rig;
    var dts = clamp(clamp(deltaTime, 1e-6, .2) * 60, 0.01, 1); // relative to 60fps
    var plumb = new THREE.Vector3(0, this.relativeHeadIK.position.y - this.rig.backup.metrics.hipsOffset.y, 0);
    this.hips.position.lerp(plumb, .5 * dts);
    this.hips.quaternion.slerp(this.localDesiredHipsQuaternion, .5 * dts);//this.Armature.world.quaternion.inverse().multiply(this.hipsIK.quaternion),.15);//this.Armature.quaternion.clone().inverse())


    this.hipsIK.position.lerp(this.Armature.localToWorld(plumb.clone()), 1 * dts);
    this.hipsIK.quaternion.slerp(this.relativeDesiredHipsQuaternion, 1 * dts);

    this.rig.armature.virtual.quaternion.copy(this.headIK.world.quaternion.clone().multiply(this.hipsIK.quaternion.clone().inverse()));
    this.rig.armature.virtual.position.copy(this.headIK.world.position);//.clone().inverse()));


    //this.debugOutput = glm.quat(this.relativeDesiredQuaternion);
  }
  
};

export { Hips };

const DefaultBias = {
  right: {
    shoulder: [-30,-120,0],
    arm: [-15,-0,-30],
    foreArm: [-15,-0,-30],
  },
  left: {
    shoulder: [30,120,0],
    arm: [15,0,-30],
    foreArm: [15,0,-30],
  },
};

const negateXY = new THREE.Vector3(-1,-1,1);

class Shoulders extends Component {
  static get version() { return '0.0.0'; }
  constructor(rig, options) {
    options = options || {};
    super(rig, options);

    // FIXME: still being worked on; disabled since broken in current state
    this.enabled = false;

    this.options = options;
    this.bias = options.bias || Shoulders.DefaultBias;
    this._left = rig.getBone('LeftShoulder');
    this._right = rig.getBone('RightShoulder');
    Object.assign(this, new NamedJointWrappers(rig, {
      spine: 'Spine1',
    }));
    this.right = new NamedJointWrappers(rig, {
      shoulder: 'RightShoulder',
      arm: 'RightArm',
      foreArm: 'RightForeArm',
      hand: 'RightHand',
    }, this.bias.right);
    this.left = new NamedJointWrappers(rig, {
      shoulder: 'LeftShoulder',
      arm: 'LeftArm',
      foreArm: 'LeftForeArm',
      hand: 'LeftHand',
    }, this.bias.left);

    this.ease = quadOut;
    this.armLength = rig.backup.metrics.armLength;
  }

  tick(time, deltaTime) {
    if (!this.enabled) return false;
    if (this.debug) console.info('shoulders', time, deltaTime);
    if (this.debug && window.config) window.config.blah = this+'';
    var fraction = 0.15;
    this._tick(this.right, time, deltaTime, .01 + Math.min(1, fraction + this.rightCorrectionFactor)/5);
    this._tick(this.left, time, deltaTime, .01 + Math.min(1, fraction + this.leftCorrectionFactor)/5);
  }

  _deltaSpine(thing) {
    return thing.world.position
      .sub(this.spine.world.position)
      .applyQuaternion(this.spine.world.quaternion.inverse())
      .divideScalar(this.armLength);
  }
  get rightAmount() { return this._deltaSpine(this.right.hand).multiply(negateXY); }
  get leftAmount() { return this._deltaSpine(this.left.hand); }
  toString() {
    var ra = this.leftAmount;
    return [
      this.left.arm.degrees.x, 
      this.left.shoulder.degrees.x, 
      glm.vec3(this.leftAmount)+'',
      ra.x > .4 ? 'ok' : 'cross',
      this.rightCorrectionFactor,
    ].map((x)=>(isFinite(x)?x.toFixed(1):x))+'';
    return [
      this.right.arm.degrees.x, 
      this.right.shoulder.degrees.x, 
      glm.quat(this.rightArmDesired)+'',
      ra.x > .4 ? 'ok' : 'cross',
      this.rightCorrectionFactor,
    ].map((x)=>(isFinite(x)?x.toFixed(1):x))+'';
  }
  _isFrontSideCenter(forwardAmount) {
    return forwardAmount.x > 0.05 && Math.abs(forwardAmount.y) < .25 && forwardAmount.z > .05;
  }
  _getCorrectionFactor(forwardAmount) {
    if (this._isFrontSideCenter(forwardAmount)) return 0;
    return (1-Math.max(0,this.ease(forwardAmount.x+(Math.abs(forwardAmount.y)<.2?.5:0))));
    
  }
  get rightCorrectionFactor() { return this._getCorrectionFactor(this.rightAmount); }
  get leftCorrectionFactor() { return this._getCorrectionFactor(this.leftAmount); }

  _tick(right, time, deltaTime, fraction) {
    var dts = clamp(clamp(deltaTime, 1e-6, .2) * 60, 0, 1); // relative to 60fps
    var fdts = Math.max(.01, fraction * dts);
    //return;
    right.shoulder.quaternion.slerp(quatFromDegrees(right.shoulder.bias), fdts);
    fdts /= 2;
    right.arm.quaternion.slerp(quatFromDegrees(right.arm.bias), fdts);
    fdts /= 2;
    right.foreArm.quaternion.slerp(quatFromDegrees(right.foreArm.bias), fdts);
    right.foreArm.degrees.z = ((1-fdts) * right.foreArm.degrees.z + fdts * right.foreArm.bias[2]||0);

    if (this.locked) {
      right.foreArm.object.quaternion.copy(quatFromDegrees(right.foreArm.bias));
      right.arm.object.quaternion.copy(this.quatFromDegrees(right.arm.bias));
      right.shoulder.object.quaternion.copy(quatFromDegrees(right.shoulder.bias));
    }
    right.shoulder.object.updateMatrixWorld(true);
    // rightArm.object.quaternion.copy(rightArmDesired);
    // right.object.quaternion.copy(rightDesired);
    
  }
  
  get rightArmDesired() {
    // this.right.quaternion.slerp(quatFromDegrees(this.rightBias), fraction * dts);
    // this.rightArm.quaternion.slerp(quatFromDegrees(this.rightArmBias), fraction * dts);
    // if (fraction === 1) {
    //   this.right.quaternion.slerp(quatFromDegrees(this.rightBias), fraction * dts);
    //   this.rightArm.quaternion.slerp(quatFromDegrees(this.rightArmBias), fraction * dts);
    // }
    // if (this.rightBias.z) this.right.degrees.z = this.rightBias.z;
    //if (this.rightAggression)
    return quatFromDegrees(this.right.arm.bias);
  }
};

Shoulders.DefaultBias = DefaultBias;
export { Shoulders };


class RigState extends Component {
  static get version() { return '0.0.0'; }
  constructor(rig, initialState) {
    super(rig);
    this.state = initialState;
    this.$state = this.state;
    this.layHeight = .2;
  }
  tick(time, deltaTime) { }
  
  getNaturalHipsHeight() { return this.rig.backup.meta.hipsHeight; }
  getHipsHeight() { return this.rig.metrics.hipsHeight; }
  _pos(name) { return this.rig.getBone(name).getWorldPosition(new THREE.Vector3()); }
  _rot(name) { return this.rig.getBone(name).getWorldQuaternion(new THREE.Quaternion()); }
  _fwd(name) { return new THREE.Vector3(1, 0, 0).applyQuaternion(this._rot(name)); }
  getHandDisposition(hand) {
    var dir = this._pos('Spine1').sub(this._pos(hand)).normalize();
    var fwd = this._fwd('Spine1');
    return glm.degrees(glm.vec3(new THREE.Euler(0, 0, 0, 'ZXY').setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(dir, fwd))));
  }
  getAltitude() {
    //var standing = (this.getHipsHeight() / this.getNaturalHipsHeight());
    var standing = this.rig.metrics.altitude;
    return clamp(standing, -2, 2) * 100;
  }
  isKneeling() { return false; this.$state === 'kneeling' || this.isCrouching() || this.getAltitude() < 30; }
  isCrouching() { return false; this.$state === 'crouching' || this.isLaying() || this.getAltitude() < 10; }
  isLaying() { return false;this.$state === 'laying' || this.rig.metrics.altitude < this.layHeight; }
  getState() {
    return this.isLaying() ? 'laying' :
      this.isCrouching() ? 'crouching' :
      this.isKneeling() ? 'kneeling' : 'standing';
  }
  toString() {
    return this.getState();
  }
};

export { RigState };

