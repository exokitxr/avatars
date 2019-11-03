import {fixSkeletonZForward} from '../proto/three-ik/modified.AxisUtils.js';
import PoseManager from './PoseManager.js';
import ShoulderTransforms from './ShoulderTransforms.js';
import LegsManager from './LegsManager.js';

const zeroVector = new THREE.Vector3();
const upRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2);
const leftRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2);
const rightRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/2);

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();

const _localizeMatrixWorld = bone => {
  bone.matrix.copy(bone.matrixWorld);
  if (bone.parent) {
    bone.matrix.premultiply(new THREE.Matrix4().getInverse(bone.parent.matrixWorld));
  }
  bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);

  for (let i = 0; i < bone.children.length; i++) {
    _localizeMatrixWorld(bone.children[i]);
  }
};
const _findBoneDeep = (bones, boneName) => {
  for (let i = 0; i < bones.length; i++) {
    const bone = bones[i];
    if (bone.name === boneName) {
      return bone;
    } else {
      const deepBone = _findBoneDeep(bone.children, boneName);
      if (deepBone) {
        return deepBone;
      }
    }
  }
  return null;
};
const _copySkeleton = (src, dst) => {
  for (let i = 0; i < src.bones.length; i++) {
    const srcBone = src.bones[i];
    const dstBone = _findBoneDeep(dst.bones, srcBone.name);
    dstBone.matrixWorld.copy(srcBone.matrixWorld);
  }

  const armature = dst.bones[0].parent;
  _localizeMatrixWorld(armature);

  dst.calculateInverses();
};

class Rig {
	constructor(model, options = {}) {
    this.model = model;
    this.options = options;

    model.updateMatrixWorld(true);
    const skinnedMeshes = [];
	  model.traverse(o => {
	    if (o.isSkinnedMesh) {
        skinnedMeshes.push(o);
	    }
	  });
    skinnedMeshes.sort((a, b) => b.skeleton.bones.length - a.skeleton.bones.length);
    this.skinnedMeshes = skinnedMeshes;

    const skeletonSkinnedMesh = skinnedMeshes.find(o => o.skeleton.bones[0].parent) || null;
    const skeleton = skeletonSkinnedMesh && skeletonSkinnedMesh.skeleton;
    if (skeleton) {
      skeletonSkinnedMesh.bind(skeleton);
    }
    const poseSkeletonSkinnedMesh = skeleton ? skinnedMeshes.find(o => o.skeleton !== skeleton && o.skeleton.bones.length >= skeleton.bones.length) : null;
    const poseSkeleton = poseSkeletonSkinnedMesh && poseSkeletonSkinnedMesh.skeleton;
    if (poseSkeleton) {
      _copySkeleton(poseSkeleton, skeleton);
      poseSkeletonSkinnedMesh.bind(skeleton);
    }

    const _getTailBones = skeleton => {
      const result = [];
      const _recurse = bones => {
        for (let i = 0; i < bones.length; i++) {
          const bone = bones[i];
          if (bone.children.length === 0) {
            if (!result.includes(bone)) {
              result.push(bone);
            }
          } else {
            _recurse(bone.children);
          }
        }
      };
      _recurse(skeleton.bones);
      return result;
    };
	  const tailBones = _getTailBones(skeleton);
    // const tailBones = skeleton.bones.filter(bone => bone.children.length === 0);
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
    const _findClosestChildBone = (bone, pred) => {
      const _recurse = bone => {
        if (pred(bone)) {
          return bone;
        } else {
          for (let i = 0; i < bone.children.length; i++) {
            const result = _recurse(bone.children[i]);
            if (result) {
              return result;
            }
          }
          return null;
        }
      }
      return _recurse(bone);
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
    const _findHead = () => {
      const headBones = tailBones.map(tailBone => {
        const headBone = _findFurthestParentBone(tailBone, bone => /head/i.test(bone.name));
        if (headBone) {
          return headBone;
        } else {
          return null;
        }
      }).filter(bone => bone);
      const headBone = headBones.length > 0 ? headBones[0] : null;
      if (headBone) {
        return headBone;
      } else {
        return null;
      }
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
	  const _findHand = shoulderBone => _findClosestChildBone(shoulderBone, bone => /hand|wrist/i.test(bone.name));
	  const _findFoot = left => {
	  	const regexp = left ? /l/i : /r/i;
	    const legBones = tailBones.map(tailBone => {
        const footBone = _findFurthestParentBone(tailBone, bone => /foot|ankle/i.test(bone.name) && regexp.test(bone.name.replace(/foot|ankle/gi, '')));
        if (footBone) {
          const legBone = _findFurthestParentBone(footBone, bone => /leg|thigh/i.test(bone.name) && regexp.test(bone.name.replace(/leg|thigh/gi, '')));
          if (legBone) {
            const distance = _distanceToParentBone(footBone, legBone);
            if (distance >= 2) {
              return {
                footBone,
                distance,
              };
            } else {
            	return null;
            }
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
        	const aName = a.footBone.name.replace(/foot|ankle/gi, '');
        	const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i);
        	const bName = b.footBone.name.replace(/foot|ankle/gi, '');
        	const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i);
        	if (!left) {
        	  return aLeftBalance - bLeftBalance;
        	} else {
            return bLeftBalance - aLeftBalance;
        	}
        }
	    });
	    const footBone = legBones.length > 0 ? legBones[0].footBone : null;
	    if (footBone) {
        return footBone;
	    } else {
	    	return null;
	    }
	  };
	  const Eye_L = _findEye(true);
	  const Eye_R = _findEye(false);
	  const Head = _findHead();
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
    const modelBones = {
	    Hips,
	    Spine,
	    Chest,
	    Neck,
	    Head,
	    /* Eye_L,
	    Eye_R, */

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
    /* for (const k in modelBones) {
      if (!modelBones[k]) {
        console.warn('missing bone', k);
      }
    } */

    const _findArmature = bone => {
      for (; bone; bone = bone.parent) {
        if (!bone.isBone) {
        	return bone;
        }
      }
      return null;
    };
	  const armature = _findArmature(Hips);

    const _getEyePosition = () => {
      if (Eye_L && Eye_R) {
        return Eye_L.getWorldPosition(new THREE.Vector3())
          .add(Eye_R.getWorldPosition(new THREE.Vector3()))
          .divideScalar(2);
      } else {
        const neckToHeadDiff = Head.getWorldPosition(new THREE.Vector3()).sub(Neck.getWorldPosition(new THREE.Vector3()));
        if (neckToHeadDiff.z < 0) {
          neckToHeadDiff.z *= -1;
        }
        return Head.getWorldPosition(new THREE.Vector3()).add(neckToHeadDiff);
      }
    };
    // const eyeDirection = _getEyePosition().sub(Head.getWorldPosition(new Vector3()));
    const leftArmDirection = Left_wrist.getWorldPosition(new THREE.Vector3()).sub(Head.getWorldPosition(new THREE.Vector3()));
	  const flipZ = leftArmDirection.x < 0;//eyeDirection.z < 0;
    const armatureDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(armature.quaternion);
    const flipY = armatureDirection.z < -0.5;
    const legDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(Left_leg.getWorldQuaternion(new THREE.Quaternion()).premultiply(armature.quaternion.clone().inverse()));
    const flipLeg = legDirection.y < 0.5;
	  console.log('flip', flipZ, flipY, flipLeg);
	  this.flipZ = flipZ;
	  this.flipY = flipY;
    this.flipLeg = flipLeg;

    const armatureQuaternion = armature.quaternion.clone();
    const armatureMatrixInverse = new THREE.Matrix4().getInverse(armature.matrixWorld);
    const armatureScale = armature.scale.clone();
    armature.position.set(0, 0, 0);
    armature.quaternion.set(0, 0, 0, 1);
    this.armatureScaleFactor = Head.getWorldPosition(new THREE.Vector3())
      .distanceTo(Left_ankle.getWorldPosition(new THREE.Vector3()))
      / Math.abs(armature.scale.y) > 100 ? 100 : 1;
    armature.scale.set(1, 1, 1).divideScalar(this.armatureScaleFactor);
    armature.updateMatrix();

    const hairBones = tailBones.filter(bone => /hair/i.test(bone.name)).map(bone => {
      for (; bone; bone = bone.parent) {
        if (bone.parent === Head) {
          return bone;
        }
      }
      return null;
    }).filter(bone => bone);
    if (options.hair) {
      hairBones.forEach(rootHairBone => {
        rootHairBone.traverse(hairBone => {
          hairBone.length = hairBone.position.length();
          hairBone.worldParentOffset = hairBone.getWorldPosition(new THREE.Vector3()).sub(hairBone.parent.getWorldPosition(new THREE.Vector3())).divide(armatureScale);
          hairBone.initialWorldQuaternion = hairBone.getWorldQuaternion(new THREE.Quaternion());
          hairBone.velocity = new THREE.Vector3();
          if (hairBone !== rootHairBone) {
            hairBone._updateMatrixWorld = hairBone.updateMatrixWorld;
            hairBone.updateMatrixWorld = () => {};
          }
        });
      });
    }
    this.hairBones = hairBones;

    const _findFinger = (r, left) => {
      const fingerTipBone = tailBones
        .filter(bone => r.test(bone.name) && _findClosestParentBone(bone, bone => bone === modelBones.Left_wrist || bone === modelBones.Right_wrist))
        .sort((a, b) => {
          const aName = a.name.replace(r, '');
          const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i);
          const bName = b.name.replace(r, '');
          const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i);
          if (!left) {
            return aLeftBalance - bLeftBalance;
          } else {
            return bLeftBalance - aLeftBalance;
          }
        });
      const fingerRootBone = fingerTipBone.length > 0 ? _findFurthestParentBone(fingerTipBone[0], bone => r.test(bone.name)) : null;
      return fingerRootBone;
    };
    const fingerBones = {
      left: {
        thumb: _findFinger(/thumb/gi, true),
        index: _findFinger(/index/gi, true),
        middle: _findFinger(/middle/gi, true),
        ring: _findFinger(/ring/gi, true),
        little: _findFinger(/little/gi, true) || _findFinger(/pinky/gi, true),
      },
      right: {
        thumb: _findFinger(/thumb/gi, false),
        index: _findFinger(/index/gi, false),
        middle: _findFinger(/middle/gi, false),
        ring: _findFinger(/ring/gi, false),
        little: _findFinger(/little/gi, false) || _findFinger(/pinky/gi, false),
      },
    };
    this.fingerBones = fingerBones;

    const preRotations = {};
    const _ensurePrerotation = k => {
      const boneName = modelBones[k].name;
      if (!preRotations[boneName]) {
        preRotations[boneName] = new THREE.Quaternion();
      }
      return preRotations[boneName];
    };
    if (flipY) {
      ['Hips'].forEach(k => {
        _ensurePrerotation(k).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2));
      });
    }
    if (flipZ) {
      ['Hips'].forEach(k => {
        _ensurePrerotation(k).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
      });
    }
    if (flipLeg) {
      ['Left_leg', 'Right_leg'].forEach(k => {
        _ensurePrerotation(k).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2));
      });
    }

    const qrArm = flipZ ? Left_arm : Right_arm;
    const qrElbow = flipZ ? Left_elbow : Right_elbow;
    const qrWrist = flipZ ? Left_wrist : Right_wrist;
    const qr = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/2)
      .premultiply(
        new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          qrElbow.getWorldPosition(new THREE.Vector3()).applyMatrix4(armatureMatrixInverse)
            .sub(qrArm.getWorldPosition(new THREE.Vector3()).applyMatrix4(armatureMatrixInverse))
            .applyQuaternion(armatureQuaternion),
          new THREE.Vector3(0, 1, 0),
        ))
      );
    const qr2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/2)
      .premultiply(
        new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          qrWrist.getWorldPosition(new THREE.Vector3()).applyMatrix4(armatureMatrixInverse)
            .sub(qrElbow.getWorldPosition(new THREE.Vector3()).applyMatrix4(armatureMatrixInverse))
            .applyQuaternion(armatureQuaternion),
          new THREE.Vector3(0, 1, 0),
        ))
      );
    const qlArm = flipZ ? Right_arm : Left_arm;
    const qlElbow = flipZ ? Right_elbow : Left_elbow;
    const qlWrist = flipZ ? Right_wrist : Left_wrist;
    const ql = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2)
      .premultiply(
        new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          qlElbow.getWorldPosition(new THREE.Vector3()).applyMatrix4(armatureMatrixInverse)
            .sub(qlArm.getWorldPosition(new THREE.Vector3()).applyMatrix4(armatureMatrixInverse))
            .applyQuaternion(armatureQuaternion),
          new THREE.Vector3(0, 1, 0),
        ))
      );
    const ql2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2)
      .premultiply(
        new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          qlWrist.getWorldPosition(new THREE.Vector3()).applyMatrix4(armatureMatrixInverse)
            .sub(qlElbow.getWorldPosition(new THREE.Vector3()).applyMatrix4(armatureMatrixInverse))
            .applyQuaternion(armatureQuaternion),
          new THREE.Vector3(0, 1, 0),
        ))
      );

    _ensurePrerotation('Right_arm')
      .multiply(qr.clone().inverse());
    _ensurePrerotation('Right_elbow')
      .multiply(qr.clone())
      .premultiply(qr2.clone().inverse());
    _ensurePrerotation('Left_arm')
      .multiply(ql.clone().inverse());
    _ensurePrerotation('Left_elbow')
      .multiply(ql.clone())
      .premultiply(ql2.clone().inverse());

    _ensurePrerotation('Left_leg').premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0),  -Math.PI/2));
    _ensurePrerotation('Right_leg').premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0),  -Math.PI/2));

    for (const k in preRotations) {
      preRotations[k].inverse();
    }
	  fixSkeletonZForward(armature.children[0], {
	    preRotations,
	  });
	  model.traverse(o => {
	    if (o.isSkinnedMesh) {
	      o.bind(skeleton);
	    }
	  });
    if (flipY) {
      ['Hips'].forEach(name => {
        modelBones[name].quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2));
      });
    }
	  if (!flipZ) {
	    /* ['Left_arm', 'Right_arm'].forEach((name, i) => {
		    const bone = modelBones[name];
		    if (bone) {
		      bone.quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (i === 0 ? 1 : -1) * Math.PI*0.25));
		    }
		  }); */
		} else {
		  ['Hips'].forEach(name => {
		    modelBones[name].quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
		  });
		}
    modelBones.Right_arm.quaternion.premultiply(qr.clone().inverse());
    modelBones.Right_elbow.quaternion
      .premultiply(qr)
      .premultiply(qr2.clone().inverse());
    modelBones.Left_arm.quaternion.premultiply(ql.clone().inverse());
    modelBones.Left_elbow.quaternion
      .premultiply(ql)
      .premultiply(ql2.clone().inverse());
	  model.updateMatrixWorld(true);

    for (let i = 0; i < skeleton.bones.length; i++) {
      const bone = skeleton.bones[i];
      if (!bone.initialQuaternion) {
        bone.initialQuaternion = bone.quaternion.clone();
      }
    }

	  const _getOffset = (bone, parent = bone.parent) => bone.getWorldPosition(new THREE.Vector3()).sub(parent.getWorldPosition(new THREE.Vector3()));
	  const _averagePoint = points => {
      const result = new THREE.Vector3();
      for (let i = 0; i < points.length; i++) {
        result.add(points[i]);
      }
      result.divideScalar(points.length);
      return result;
	  };
    const eyePosition = _getEyePosition();
	  const setups = {
	    spine: _getOffset(modelBones.Spine),
	    chest: _getOffset(modelBones.Chest, modelBones.Spine),
	    neck: _getOffset(modelBones.Neck),
	    head: _getOffset(modelBones.Head),
	    eyes: eyePosition.clone().sub(Head.getWorldPosition(new THREE.Vector3())),

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

		this.poseManager = new PoseManager(this);
		this.shoulderTransforms = new ShoulderTransforms(this);
		this.legsManager = new LegsManager(this);

    this.shoulderTransforms.spine.position.copy(setups.spine);
    this.shoulderTransforms.transform.position.copy(setups.chest);
    this.shoulderTransforms.neck.position.copy(setups.neck);
    this.shoulderTransforms.head.position.copy(setups.head);
    this.shoulderTransforms.eyes.position.copy(setups.eyes);

    this.shoulderTransforms.leftShoulderAnchor.position.copy(setups.leftShoulder);
    this.shoulderTransforms.leftArm.upperArm.position.copy(setups.leftUpperArm);
    this.shoulderTransforms.leftArm.lowerArm.position.copy(setups.leftLowerArm);
    this.shoulderTransforms.leftArm.hand.position.copy(setups.leftHand);

    this.shoulderTransforms.rightShoulderAnchor.position.copy(setups.rightShoulder);
    this.shoulderTransforms.rightArm.upperArm.position.copy(setups.rightUpperArm);
    this.shoulderTransforms.rightArm.lowerArm.position.copy(setups.rightLowerArm);
    this.shoulderTransforms.rightArm.hand.position.copy(setups.rightHand);

    this.legsManager.leftLeg.upperLeg.position.copy(setups.leftUpperLeg);
    this.legsManager.leftLeg.lowerLeg.position.copy(setups.leftLowerLeg);
    this.legsManager.leftLeg.foot.position.copy(setups.leftFoot);

    this.legsManager.rightLeg.upperLeg.position.copy(setups.rightUpperLeg);
    this.legsManager.rightLeg.lowerLeg.position.copy(setups.rightLowerLeg);
    this.legsManager.rightLeg.foot.position.copy(setups.rightFoot);

    this.shoulderTransforms.hips.updateMatrixWorld();

    this.height = eyePosition.sub(_averagePoint([modelBones.Left_ankle.getWorldPosition(new THREE.Vector3()), modelBones.Right_ankle.getWorldPosition(new THREE.Vector3())])).y;
    this.shoulderWidth = modelBones.Left_arm.getWorldPosition(new THREE.Vector3()).distanceTo(modelBones.Right_arm.getWorldPosition(new THREE.Vector3()));
    this.leftArmLength = this.shoulderTransforms.leftArm.armLength;
    this.rightArmLength = this.shoulderTransforms.rightArm.armLength;

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

    this.audioContext = null;
    this.volume = 0;
    this.setMicrophoneMediaStream(options.microphoneMediaStream, {
      muted: options.muted,
    });

    this.lastTimestamp = Date.now();

    this.shoulderTransforms.Start();
    this.legsManager.Start();
	}
	update() {
// return;

    this.shoulderTransforms.Update();
    this.legsManager.Update();

	  for (const k in this.modelBones) {
      const modelBone = this.modelBones[k];
      const modelBoneOutput = this.modelBoneOutputs[k];

      if (k === 'Hips') {
        modelBone.position.copy(modelBoneOutput.position).multiplyScalar(this.armatureScaleFactor);
      }
      modelBone.quaternion.multiplyQuaternions(modelBoneOutput.quaternion, modelBone.initialQuaternion)

      if (k === 'Left_ankle' || k === 'Right_ankle') {
        modelBone.quaternion.multiply(upRotation);
      } else if (k === 'Left_wrist') {
        modelBone.quaternion.multiply(leftRotation); // center
      } else if (k === 'Right_wrist') {
        modelBone.quaternion.multiply(rightRotation); // center
      }
      modelBone.updateMatrixWorld();
    }

    const now = Date.now();
    const timeDiff = Math.min(now - this.lastTimestamp, 1000);
    this.lastTimestamp = now;

    if (this.options.fingers) {
      const _processFingerBones = left => {
        const fingerBones = left ? this.fingerBones.left : this.fingerBones.right;
        const gamepadInput = left ? this.inputs.rightGamepad : this.inputs.leftGamepad;
        for (const k in fingerBones) {
          const fingerBone = fingerBones[k];
          if (fingerBone) {
            let setter;
            if (k === 'thumb') {
              setter = (q, i) => q.setFromAxisAngle(localVector.set(0, left ? 1 : -1, 0), gamepadInput.grip * Math.PI*(i === 0 ? 0.125 : 0.25));
            } else if (k === 'index') {
              setter = (q, i) => q.setFromAxisAngle(localVector.set(0, 0, left ? -1 : 1), gamepadInput.pointer * Math.PI*0.5);
            } else {
              setter = (q, i) => q.setFromAxisAngle(localVector.set(0, 0, left ? -1 : 1), gamepadInput.grip * Math.PI*0.5);
            }
            let index = 0;
            fingerBone.traverse(subFingerBone => {
              setter(subFingerBone.quaternion, index++);
            });
          }
        }
      };
      _processFingerBones(true);
      _processFingerBones(false);
    }

    if (this.options.hair) {
      const hipsRotation = this.modelBones.Hips.quaternion;
      const scale = localVector.setFromMatrixScale(this.modelBones.Head.matrixWorld);;
      const _processHairBone = (hairBone, children) => {
        const p = localVector2.setFromMatrixPosition(hairBone.matrixWorld);

        for (let i = 0; i < children.length; i++) {
          const childHairBone = children[i];

          const px = localVector3.setFromMatrixPosition(childHairBone.matrixWorld);
          const hairDistance = px.distanceTo(p);
          const hairDirection = localVector4.copy(px).sub(p).normalize();

          const hairLength = childHairBone.length * scale.y;

          if (hairDistance > hairLength * 2) {
            px.copy(p).add(localVector5.copy(hairDirection).multiplyScalar(hairLength * 2));
          }

          const l = childHairBone.velocity.length();
          if (l > 0.05) {
            childHairBone.velocity.multiplyScalar(0.05/l);
          }

          childHairBone.velocity.add(localVector5.copy(hairDirection).multiplyScalar(-(hairDistance - hairLength) * 0.1 * timeDiff/32));
          childHairBone.velocity.add(localVector5.set(0, -9.8, 0).multiply(scale).multiplyScalar(0.0002 * timeDiff/32));
          childHairBone.velocity.add(localVector5.copy(childHairBone.worldParentOffset).multiply(scale).applyQuaternion(hipsRotation).multiplyScalar(0.03 * timeDiff/32));
          childHairBone.velocity.lerp(zeroVector, 0.2 * timeDiff/32);

          const p2 = localVector5.copy(px).add(childHairBone.velocity);
          const q2 = localQuaternion.multiplyQuaternions(
            localQuaternion2.setFromRotationMatrix(localMatrix.lookAt(
              zeroVector,
              hairDirection,
              localVector6.set(0, 0, -1).applyQuaternion(hipsRotation),
            )),
            childHairBone.initialWorldQuaternion
          );
          childHairBone.matrixWorld.compose(p2, q2, scale);
        }
        for (let i = 0; i < children.length; i++) {
          const childHairBone = children[i];
          _processHairBone(childHairBone, childHairBone.children);
        }
      };
      _processHairBone(this.modelBones.Head, this.hairBones);
    }

    if (this.options.visemes) {
      const aaValue = Math.min(this.volume * 10, 1);
      const blinkValue = (() => {
        const nowWindow = now % 2000;
        if (nowWindow >= 0 && nowWindow < 100) {
          return nowWindow/100;
        } else if (nowWindow >= 100 && nowWindow < 200) {
          return 1 - (nowWindow-100)/100;
        } else {
          return 0;
        }
      })();
      this.skinnedMeshes.forEach(o => {
        const {morphTargetDictionary, morphTargetInfluences} = o;
        if (morphTargetDictionary && morphTargetInfluences) {
          let aaMorphTargetIndex = morphTargetDictionary['vrc.v_aa'];
          if (aaMorphTargetIndex === undefined) {
            aaMorphTargetIndex = morphTargetDictionary['morphTarget26'];
          }
          if (aaMorphTargetIndex !== undefined) {
            morphTargetInfluences[aaMorphTargetIndex] = aaValue;
          }

          let blinkLeftMorphTargetIndex = morphTargetDictionary['vrc.blink_left'];
          if (blinkLeftMorphTargetIndex === undefined) {
            blinkLeftMorphTargetIndex = morphTargetDictionary['morphTarget16'];
          }
          if (blinkLeftMorphTargetIndex !== undefined) {
            morphTargetInfluences[blinkLeftMorphTargetIndex] = blinkValue;
          }

          let blinkRightMorphTargetIndex = morphTargetDictionary['vrc.blink_right'];
          if (blinkRightMorphTargetIndex === undefined) {
            blinkRightMorphTargetIndex = morphTargetDictionary['morphTarget17'];
          }
          if (blinkRightMorphTargetIndex !== undefined) {
            morphTargetInfluences[blinkRightMorphTargetIndex] = blinkValue;
          }
        }
      });
    }
	}

  async setMicrophoneMediaStream(microphoneMediaStream, options = {}) {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      setTimeout(() => {
        this.volume = 0;
      });
    }
    if (microphoneMediaStream) {
      const audio = document.createElement('audio');
      audio.srcObject = microphoneMediaStream;
      audio.muted = true;
      this.audioContext = new AudioContext();
      const mediaStreamSource = this.audioContext.createMediaStreamSource(microphoneMediaStream);

      await this.audioContext.audioWorklet.addModule('vrarmik/audio-volume-worklet.js');
      const audioWorkletNode = new AudioWorkletNode(this.audioContext, 'volume-processor');
      if (options.muted === false) {
        audioWorkletNode.port.postMessage(JSON.stringify({
          method: 'muted',
          muted: false,
        }));
      }
      audioWorkletNode.port.onmessage = e => {
        this.volume = this.volume*0.8 + e.data*0.2;
      };
      mediaStreamSource.connect(audioWorkletNode).connect(this.audioContext.destination);
    }
  }
}
export default Rig;