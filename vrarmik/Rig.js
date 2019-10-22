import {Vector3, Quaternion, GameObject} from './Unity.js';
import {fixSkeletonZForward} from '../proto/three-ik/modified.AxisUtils.js';
import PoseManager from './PoseManager.js';
import ShoulderTransforms from './ShoulderTransforms.js';
import LegsManager from './LegsManager.js';

const poses = {
  hmd: new THREE.Object3D(),
  leftGamepad: new THREE.Object3D(),
  rightGamepad: new THREE.Object3D(),
};

class Rig {
	constructor(model) {
    GameObject.clearAll();

    model.updateMatrixWorld(true);
    let skeleton;
	  model.traverse(o => {
	    if (o.isMesh) {
	      o.frustumCulled = false;
	    }
	    if (o.isSkinnedMesh) {
        if (!skeleton) {
	      	skeleton = o.skeleton;
	      }
	      o.bind(skeleton);
	    }
	  });

	  const tailBones = skeleton.bones.filter(bone => bone.children.length === 0);
	  const _findClosestParentBone = (bone, pred) => {
      for (; bone; bone = bone.parent) {
      	if (pred(bone)) {
          return bone;
      	}
      }
      return null;
	  };
	  const _findFurthestParentBone = (bone, pred) => {
	  	let result = null;
      for (; bone; bone = bone.parent) {
      	if (pred(bone)) {
          result = bone;
      	}
      }
      return result;
	  };
	  const _distanceToParentBone = (bone, parentBone) => {
      for (let i = 0; bone; bone = bone.parent, i++) {
      	if (bone === parentBone) {
          return i;
      	}
      }
      return Infinity;
	  };
	  const _traverseChild = (bone, distance) => {
	  	if (distance <= 0) {
	  		return bone;
	  	} else {
	      for (let i = 0; i < bone.children.length; i++) {
	        const child = bone.children[i];
	        const subchild = _traverseChild(child, distance - 1);
	        if (subchild !== null) {
	        	return subchild;
	        }
	      }
	      return null;
	    }
	  };
	  const _countCharacters = (name, regex) => {
	  	let result = 0;
      for (let i = 0; i < name.length; i++) {
      	if (regex.test(name[i])) {
      		result++;
      	}
      }
      return result;
	  };
	  const _findEye = left => {
	  	const regexp = left ? /l/i : /r/i;
	    const eyeBones = tailBones.map(tailBone => {
        const eyeBone = _findFurthestParentBone(tailBone, bone => /eye/i.test(bone.name) && regexp.test(bone.name.replace(/eye/gi, '')));
        if (eyeBone) {
        	return eyeBone;
        } else {
        	return null;
        }
	    }).filter(spec => spec).sort((a, b) => {
      	const aName = a.name.replace(/shoulder/gi, '');
      	const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i);
      	const bName = b.name.replace(/shoulder/gi, '');
      	const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i);
      	if (!left) {
      	  return aLeftBalance - bLeftBalance;
      	} else {
          return bLeftBalance - aLeftBalance;
      	}
	    });
	    const eyeBone = eyeBones.length > 0 ? eyeBones[0] : null;
	    if (eyeBone) {
	    	return eyeBone;
	    } else {
	    	return null;
	    }
	  };
	  const _findHips = () => {
      return skeleton.bones.find(bone => /hip/i.test(bone.name));
	  };
	  const _findSpine = (chest, hips) => {
      for (let bone = chest; bone; bone = bone.parent) {
        if (bone.parent === hips) {
          return bone;
        }
      }
      return null;
	  };
	  const _findShoulder = left => {
	  	const regexp = left ? /l/i : /r/i;
	    const shoulderBones = tailBones.map(tailBone => {
        const shoulderBone = _findClosestParentBone(tailBone, bone => /shoulder/i.test(bone.name) && regexp.test(bone.name.replace(/shoulder/gi, '')));
        if (shoulderBone) {
          const distance = _distanceToParentBone(tailBone, shoulderBone);
          if (distance >= 3) {
            return {
              bone: shoulderBone,
              distance,
            };
          } else {
          	return null;
          }
        } else {
        	return null;
        }
	    }).filter(spec => spec).sort((a, b) => {
        const diff = b.distance - a.distance;
        if (diff !== 0) {
          return diff;
        } else {
        	const aName = a.bone.name.replace(/shoulder/gi, '');
        	const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i);
        	const bName = b.bone.name.replace(/shoulder/gi, '');
        	const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i);
        	if (!left) {
        	  return aLeftBalance - bLeftBalance;
        	} else {
            return bLeftBalance - aLeftBalance;
        	}
        }
	    });
	    const shoulderBone = shoulderBones.length > 0 ? shoulderBones[0].bone : null;
	    if (shoulderBone) {
	    	return shoulderBone;
	    } else {
	    	return null;
	    }
	  };
	  const _findHand = shoulderBone => _traverseChild(shoulderBone, 3);
	  const _findFoot = left => {
	  	const regexp = left ? /l/i : /r/i;
	    const legBones = tailBones.map(tailBone => {
        const legBone = _findFurthestParentBone(tailBone, bone => /leg/i.test(bone.name) && regexp.test(bone.name.replace(/leg/gi, '')));
        if (legBone) {
          const distance = _distanceToParentBone(tailBone, legBone);
          if (distance >= 2) {
            return {
              bone: legBone,
              distance,
            };
          } else {
          	return null;
          }
        } else {
        	return null;
        }
	    }).filter(spec => spec).sort((a, b) => {
        const diff = b.distance - a.distance;
        if (diff !== 0) {
          return diff;
        } else {
        	const aName = a.bone.name.replace(/leg/gi, '');
        	const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i);
        	const bName = b.bone.name.replace(/leg/gi, '');
        	const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i);
        	if (!left) {
        	  return aLeftBalance - bLeftBalance;
        	} else {
            return bLeftBalance - aLeftBalance;
        	}
        }
	    });
	    const legBone = legBones.length > 0 ? legBones[0].bone : null;
	    if (legBone) {
        const footBone = _traverseChild(legBone, 2);
        return footBone;
	    } else {
	    	return null;
	    }
	  };
	  const Eye_L = _findEye(true);
	  const Eye_R = _findEye(false);
	  const Head = Eye_L.parent;
	  const Neck = Head.parent;
	  const Chest = Neck.parent;
	  const Hips = _findHips();
	  const Spine = _findSpine(Chest, Hips);
	  const Left_shoulder = _findShoulder(true);
	  const Left_wrist = _findHand(Left_shoulder);
	  const Left_elbow = Left_wrist.parent;
	  const Left_arm = Left_elbow.parent;
	  const Right_shoulder = _findShoulder(false);
	  const Right_wrist = _findHand(Right_shoulder);
	  const Right_elbow = Right_wrist.parent;
	  const Right_arm = Right_elbow.parent;
	  const Left_ankle = _findFoot(true);
	  const Left_knee = Left_ankle.parent;
	  const Left_leg = Left_knee.parent;
	  const Right_ankle = _findFoot(false);
	  const Right_knee = Right_ankle.parent;
	  const Right_leg = Right_knee.parent;
	  // console.log('got left hand', {leftEye, rightEye, head, neck, chest, hips, leftHand, leftLowerArm, leftUpperArm, rightHand, rightLowerArm, rightUpperArm, leftFoot, leftKnee, leftLeg, rightFoot, rightKnee, rightLeg});
    const modelBones = {
	    Hips,
	    Spine,
	    Chest,
	    Neck,
	    Head,
	    Eye_L,
	    Eye_R,

	    Left_shoulder,
	    Left_arm,
	    Left_elbow,
	    Left_wrist,
	    Left_leg,
	    Left_knee,
	    Left_ankle,

	    Right_shoulder,
	    Right_arm,
	    Right_elbow,
	    Right_wrist,
	    Right_leg,
	    Right_knee,
	    Right_ankle,
	  };
	  this.modelBones = modelBones;

    const _findArmature = bone => {
      for (; bone; bone = bone.parent) {
        if (!bone.isBone) {
        	return bone;
        }
      }
      return null;
    };
	  const armature = _findArmature(Hips);

	  const eyeDirection = modelBones.Eye_L.getWorldPosition(new Vector3()).sub(modelBones.Head.getWorldPosition(new Vector3()));
	  let flipZ = eyeDirection.z < 0;
    const armatureDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(armature.quaternion);
    const flipY = armatureDirection.z < -0.5;
	  console.log('flip', flipZ, flipY, eyeDirection.toArray().join(','), armatureDirection.toArray().join(','));
	  this.flipZ = flipZ;
	  this.flipY = flipY;

    armature.position.set(0, 0, 0);
    armature.quaternion.set(0, 0, 0, 1);
    armature.scale.set(1, 1, 1);
    armature.updateMatrix();

    const preRotations = {
      Hips: new Quaternion(),
      Left_arm: new Quaternion(),
      Right_arm: new Quaternion(),
    };
    if (flipY) {
      preRotations.Hips.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI/2));
    }
    if (!flipZ) {
    	preRotations.Left_arm.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI*0.25));
    	preRotations.Right_arm.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1),  -Math.PI*0.25));
    } else {
    	preRotations.Hips.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
    }
    for (const k in preRotations) {
      preRotations[k].inverse();
    }
	  fixSkeletonZForward(skeleton.bones[0], {
	    preRotations,
	  });
	  model.traverse(o => {
	    if (o.isSkinnedMesh) {
	      o.bind(skeleton);
	    }
	  });
    if (flipY) {
      ['Hips'].forEach(name => {
        // const userlandBoneName = boneMappings[name];
        const bone = modelBones[name];// skeleton.bones.find(bone => bone.name === userlandBoneName);
        if (bone) {
          bone.quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI/2));
        }
      });
    }
	  if (!flipZ) {
	    ['Left_arm', 'Right_arm'].forEach((name, i) => {
		  	// const userlandBoneName = boneMappings[name];
		    const bone = modelBones[name];// skeleton.bones.find(bone => bone.name === userlandBoneName);
		    if (bone) {
		      bone.quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (i === 0 ? 1 : -1) * Math.PI*0.25));
		    }
		  });
		} else {
		  ['Hips'].forEach(name => {
		  	// const userlandBoneName = boneMappings[name];
		    const bone = modelBones[name];// skeleton.bones.find(bone => bone.name === userlandBoneName);
		    if (bone) {
		      bone.quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
		    }
		  });
		}
	  model.updateMatrixWorld(true);

	  model.traverse(o => {
	    if (o.isSkinnedMesh) {
	      for (const k in modelBones) {
	        if (!modelBones[k].initialQuaternion) {
	          modelBones[k].initialQuaternion = modelBones[k].quaternion.clone();
	        }
	      }
	    }
	  });

	  const _getOffset = (bone, parent = bone.parent) => bone.getWorldPosition(new Vector3()).sub(parent.getWorldPosition(new Vector3()));
	  const _averagePoint = points => {
      const result = new Vector3();
      for (let i = 0; i < points.length; i++) {
        result.add(points[i]);
      }
      result.divideScalar(points.length);
      return result;
	  };
	  const setups = {
	    spine: _getOffset(modelBones.Spine),
	    hips: _getOffset(modelBones.Spine, modelBones.Head),
	    neck: _getOffset(modelBones.Neck),
	    head: _getOffset(modelBones.Head),
	    eyes: _averagePoint([_getOffset(modelBones.Eye_L), _getOffset(modelBones.Eye_R)]),

	    leftShoulder: _getOffset(modelBones.Right_shoulder),
	    leftUpperArm: _getOffset(modelBones.Right_arm),
	    leftLowerArm: _getOffset(modelBones.Right_elbow),
	    leftHand: _getOffset(modelBones.Right_wrist),

	    rightShoulder: _getOffset(modelBones.Left_shoulder),
	    rightUpperArm: _getOffset(modelBones.Left_arm),
	    rightLowerArm: _getOffset(modelBones.Left_elbow),
	    rightHand: _getOffset(modelBones.Left_wrist),

	    leftUpperLeg: _getOffset(modelBones.Right_leg),
	    leftLowerLeg: _getOffset(modelBones.Right_knee),
	    leftFoot: _getOffset(modelBones.Right_ankle),

	    rightUpperLeg: _getOffset(modelBones.Left_leg),
	    rightLowerLeg: _getOffset(modelBones.Left_knee),
	    rightFoot: _getOffset(modelBones.Left_ankle),
	  };

		const rigObject = new GameObject('rig');
		this.poseManager = rigObject.AddComponent(PoseManager);
		this.poseManager.flipZ = flipZ;
		this.poseManager.flipY = flipY;
		this.shoulderTransforms = rigObject.AddComponent(ShoulderTransforms);
		this.legsManager = rigObject.AddComponent(LegsManager);

    this.shoulderTransforms.spine.localPosition = setups.spine;
    this.shoulderTransforms.localPosition = setups.hips;
    this.shoulderTransforms.neck.localPosition = setups.neck;
    this.shoulderTransforms.head.localPosition = setups.head;
    this.shoulderTransforms.eyes.localPosition = setups.eyes;

    this.shoulderTransforms.leftShoulderAnchor.localPosition = setups.leftShoulder;
    this.shoulderTransforms.leftArm.upperArm.localPosition = setups.leftUpperArm;
    this.shoulderTransforms.leftArm.lowerArm.localPosition = setups.leftLowerArm;
    this.shoulderTransforms.leftArm.hand.localPosition = setups.leftHand;

    this.shoulderTransforms.rightShoulderAnchor.localPosition = setups.rightShoulder;
    this.shoulderTransforms.rightArm.upperArm.localPosition = setups.rightUpperArm;
    this.shoulderTransforms.rightArm.lowerArm.localPosition = setups.rightLowerArm;
    this.shoulderTransforms.rightArm.hand.localPosition = setups.rightHand;

    this.legsManager.leftLeg.upperLeg.localPosition = setups.leftUpperLeg;
    this.legsManager.leftLeg.lowerLeg.localPosition = setups.leftLowerLeg;
    this.legsManager.leftLeg.foot.localPosition = setups.leftFoot;

    this.legsManager.rightLeg.upperLeg.localPosition = setups.rightUpperLeg;
    this.legsManager.rightLeg.lowerLeg.localPosition = setups.rightLowerLeg;
    this.legsManager.rightLeg.foot.localPosition = setups.rightFoot;

		this.inputs = {
      hmd: this.poseManager.vrTransforms.head,
			leftGamepad: this.poseManager.vrTransforms.leftHand,
			rightGamepad: this.poseManager.vrTransforms.rightHand,
		};
		this.outputs = {
			eyes: this.shoulderTransforms.eyes,
      head: this.shoulderTransforms.head,
      hips: this.legsManager.hips,
      spine: this.shoulderTransforms.spine,
      chest: this.shoulderTransforms.transform,
      neck: this.shoulderTransforms.neck,
      leftShoulder: this.shoulderTransforms.leftShoulderAnchor,
      leftUpperArm: this.shoulderTransforms.leftArm.upperArm,
      leftLowerArm: this.shoulderTransforms.leftArm.lowerArm,
      leftHand: this.shoulderTransforms.leftArm.hand,
      rightShoulder: this.shoulderTransforms.rightShoulderAnchor,
      rightUpperArm: this.shoulderTransforms.rightArm.upperArm,
      rightLowerArm: this.shoulderTransforms.rightArm.lowerArm,
      rightHand: this.shoulderTransforms.rightArm.hand,
      leftUpperLeg: this.legsManager.leftLeg.upperLeg,
      leftLowerLeg: this.legsManager.leftLeg.lowerLeg,
      leftFoot: this.legsManager.leftLeg.foot,
      rightUpperLeg: this.legsManager.rightLeg.upperLeg,
      rightLowerLeg: this.legsManager.rightLeg.lowerLeg,
      rightFoot: this.legsManager.rightLeg.foot,
		};
		this.modelBoneOutputs = {
	    Hips: this.outputs.hips,
	    Spine: this.outputs.spine,
	    Chest: this.outputs.chest,
	    Neck: this.outputs.neck,
	    Head: this.outputs.head,

	    Left_shoulder: this.outputs.rightShoulder,
	    Left_arm: this.outputs.rightUpperArm,
	    Left_elbow: this.outputs.rightLowerArm,
	    Left_wrist: this.outputs.rightHand,
	    Left_leg: this.outputs.rightUpperLeg,
	    Left_knee: this.outputs.rightLowerLeg,
	    Left_ankle: this.outputs.rightFoot,

	    Right_shoulder: this.outputs.leftShoulder,
	    Right_arm: this.outputs.leftUpperArm,
	    Right_elbow: this.outputs.leftLowerArm,
	    Right_wrist: this.outputs.leftHand,
	    Right_leg: this.outputs.leftUpperLeg,
	    Right_knee: this.outputs.leftLowerLeg,
	    Right_ankle: this.outputs.leftFoot,
	  };

	  GameObject.startAll();
	}
	update() {
	  GameObject.updateAll();

	  for (const k in this.modelBones) {
      const modelBone = this.modelBones[k];
      const modelBoneOutput = this.modelBoneOutputs[k];

      if (k === 'Hips') {
        modelBone.position.copy(modelBoneOutput.position);
      }
      modelBone.quaternion
        .copy(modelBone.initialQuaternion)

      if (['Hips', 'Spine', 'Chest', 'Neck', 'Head'].includes(k)) {
        modelBone.quaternion
          .multiply(modelBoneOutput.localRotation)
      }

      if (['Left_leg'].includes(k)) {
        modelBone.quaternion
          .multiply(modelBoneOutput.localRotation)
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI/2))
      }
      if (['Left_knee'].includes(k)) {
        modelBone.quaternion
          .multiply(modelBoneOutput.localRotation)
          // .premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI))
      }
      if (['Left_ankle'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
          .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI/2))
      }

      if (['Right_leg'].includes(k)) {
        modelBone.quaternion
          .multiply(modelBoneOutput.localRotation)
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI/2))
      }
      if (['Right_knee'].includes(k)) {
        modelBone.quaternion
          .multiply(modelBoneOutput.localRotation)
          // .premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI))
      }
      if (['Right_ankle'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
          .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI/2))
      }

      if (['Left_shoulder'].includes(k)) {
        modelBone.quaternion
          .multiply(modelBoneOutput.localRotation)
      }
      if (['Left_arm'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI/2)) // forward
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI*0.6))
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI/4)) // up
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI/8)) // down
      }
      if (['Left_elbow'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
      }
      if (['Left_wrist'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
          .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (this.flipZ ? -1 : 1) * Math.PI/2)) // center
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI/4)) // up
      }

      if (['Right_shoulder'].includes(k)) {
        modelBone.quaternion
          .multiply(modelBoneOutput.localRotation)
      }
      if (['Right_arm'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI/2)) // forward
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI*0.6))
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI/4)) // up
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI/8)) // down
      }
      if (['Right_elbow'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
      }
      if (['Right_wrist'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
          .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (this.flipZ ? -1 : 1) * -Math.PI/2)) // center
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI/8)) // up
      }
      modelBone.updateMatrixWorld();
    }
	}
}
export default Rig;