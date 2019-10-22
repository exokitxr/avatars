// note: used for packaging sparse ES6 modules that depend on three-ik.js, but do not ship it
import THREE from './ephemeral-three.js';
//export default THREE.IK;// || (THREE.IK = require('three-ik'));
const IK = THREE.IK, IKChain = THREE.IKChain, IKJoint=THREE.IKJoint, IKBallConstraint=THREE.IKBallConstraint, IKHelper=THREE.IKHelper;

const IKHingeConstraint = THREE.IKHingeConstraint;

export {
  IK, IKChain, IKJoint, IKBallConstraint, IKHelper, IKHingeConstraint
};

console.info('ephemeral-three-ik; using global THREE.IK*', typeof IK)
