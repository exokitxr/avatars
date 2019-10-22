// ik.AutoIKChain.js -- extended THREE.IK class supporting automated lineage 

const { IK, IKChain, IKJoint } = THREE;
import { QuaternionIKChain, QuaternionIKJoint } from './QuaternionIK.js';

class AutoIKChain extends IK {
  static get version() { return '0.0.0'; }
  constructor(lineage, target, options) {
    super();
    this.options = options;
    if (!lineage.length) {
      throw new Error('invalid lineage: ' + [lineage, target, options]);
    }
    var constraints = options.constraints || {};
    Object.assign(this, { lineage, options, target}, {
      joints: []
    });
    if (!this.target) {
      throw new Error('no ik target specified: ' + lineage.map((x)=>x.name));
    }
    this.chain = this._traceChain(lineage, target, constraints);
    this.chain.joints.forEach((j) => this.joints.push(this.joints[j.bone.name] = j));
    this.add(this.chain);
    console.log("+ %c%s", 'color: green;', this+'');
  }
  toString() { return `[AutoIKChain ${this.chain.joints.map((x)=>x.bone.name).join(' > ')} << ${this.target.name}]`; }

  preSolve(time, deltaTime) {
    this.solve();
    this.options.preSolve && this.options.preSolve(time, deltaTime);
  }
  tick(time, deltaTime) {
    this.options.tick && this.options.tick(time, deltaTime);
  }
  postSolve(time, deltaTime) {
    this.options.postSolve && this.options.postSolve(time, deltaTime);
  }
  preConstrain(joint, time, deltaTime) {
    return this.options.preConstrain && this.options.preConstrain(joint, time, deltaTime);
  }
  backwardConstrain(joint, time, deltaTime) {
    return this.options.backwardConstrain && this.options.backwardConstrain(joint, time, deltaTime);
  }
  forwardConstrain(joint, time, deltaTime) {
    return this.options.forwardConstrain && this.options.forwardConstrain(joint, time, deltaTime);
  }
  postConstrain(joint, time, deltaTime) {
    return this.options.postConstrain && this.options.postConstrain(joint, time, deltaTime);
  }
  
  get head() { return this.lineage[0]; }
  get tail() { return this.lineage[this.lineage.length-1]; }

  get ikJoints() {
    var ikJoints = [];
    this.joints.forEach((j) => ikJoints.push(ikJoints[j.bone.name]=j));
    return ikJoints;
  }
  
  syncTail() {
    const { tail, target } = this;
    if (!target) throw new Error('!target '+ tail.name);
    tail.parent.updateMatrixWorld(true);
    tail.quaternion.copy(getRelativeRotation(target, tail.parent));//this._armatureRelative(target).quaternion);//));
    tail.updateMatrixWorld(true);
  }

  _traceChain(bones, target, constraints) {
      var chain = new QuaternionIKChain({
        forwardConstrain: (j) => this.forwardConstrain(j),
        backwardConstrain: (j) => this.backwardConstrain(j),
      });
      bones = bones.slice(); // take shallow copy
      var parent;
      while (bones.length) {
        var bone = bones.shift();
        bone.rotation.order = 'XYZ';
        if (this.debug) console.info('chain.add', bone.name, bone.children.length, target);
        var joint = new QuaternionIKJoint(bone, {
          preConstrain: (j)=> this.preConstrain(j),
          postConstrain: (j)=> this.postConstrain(j),
          constraints: constraints[bone.name],
         });//, { constraints: constraints[this.armature.mapper(b.name)] || constraints });
        joint.chain = chain;
        joint.parent = parent;
        if (bones.length) {
          chain.add(joint);
        } else {
          bone.getWorldPosition(target.position);
          chain.add(joint, { target });
        }
        parent = joint;
      }
      if (this.debug) console.info('//chain', chain);
      return chain;
  }
};

class IKArray extends Array {
  constructor(config) { super(); this.config = config; }
  preSolve(time, deltaTime) {
    this.filter((x)=>!x.disabled).forEach((x)=>x.tick(time, deltaTime));
  }
  tick(time, deltaTime) {
    if (this.config.backpropagate) {
      this.filter((x)=>!x.disabled).forEach((x)=>x.syncTail(time, deltaTime));
    }
  }
  postSolve(time, deltaTime) {}
};
//this.iks = new IKArray(this.config);

function walkBoneChain(head, tail) {
    var lineage = [];
    var bone = tail;
    while (bone) {
      lineage.push(bone);
      if (bone === head) break;
      var name = bone.name;
      while (bone && bone.name === name && bone !== head) bone = bone.parent;
    }
    lineage.reverse();
    return {
      toString: function() { return "[BoneChain "+this.lineage.map((x)=>x.name).join(' > ')+"]"; },
      head: head,
      tail: tail,
      lineage: lineage,
      valid: head && tail && lineage[0].name === head.name && lineage[lineage.length-1].name === tail.name,
    };
}

export default AutoIKChain;
export { AutoIKChain, walkBoneChain };
try { Object.assign(self, { AutoIKChain, walkBoneChain }); } catch(e) {}
