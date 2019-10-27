import {Vector3, Quaternion, GameObject} from './Unity.js';
import {fixSkeletonZForward} from '../proto/three-ik/modified.AxisUtils.js';
import PoseManager from './PoseManager.js';
import ShoulderTransforms from './ShoulderTransforms.js';
import LegsManager from './LegsManager.js';

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
	constructor(model) {
    GameObject.clearAll();

    model.updateMatrixWorld(true);
    const skinnedMeshes = [];
	  model.traverse(o => {
	    if (o.isMesh) {
	      o.frustumCulled = false;
	    }
	    if (o.isSkinnedMesh) {
        skinnedMeshes.push(o);
	    }
	  });
    skinnedMeshes.sort((a, b) => b.skeleton.bones.length - a.skeleton.bones.length);
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
        return Eye_L.getWorldPosition(new Vector3())
          .add(Eye_R.getWorldPosition(new Vector3()))
          .divideScalar(2);
      } else {
        const neckToHeadDiff = Head.getWorldPosition(new Vector3()).sub(Neck.getWorldPosition(new Vector3()));
        if (neckToHeadDiff.z < 0) {
          neckToHeadDiff.z *= -1;
        }
        return Head.getWorldPosition(new Vector3()).add(neckToHeadDiff);
      }
    };
    const eyeDirection = _getEyePosition().sub(Head.getWorldPosition(new Vector3()));
	  let flipZ = eyeDirection.z < 0;
    const armatureDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(armature.quaternion);
    const flipY = armatureDirection.z < -0.5;
    const legDirection = new Vector3(0, 0, -1).applyQuaternion(Left_leg.getWorldQuaternion(new Quaternion()).premultiply(armature.quaternion.clone().inverse()));
    const flipLeg = legDirection.y < 0.5;
    const scaleFactor = Head.getWorldPosition(new Vector3())
      .distanceTo(Left_ankle.getWorldPosition(new Vector3())) / Math.abs(armature.scale.y) > 100 ? 100 : 1;
	  console.log('flip', flipZ, flipY, scaleFactor, eyeDirection.toArray().join(','), armatureDirection.toArray().join(','));
	  this.flipZ = flipZ;
	  this.flipY = flipY;
    this.flipLeg = flipLeg;
    this.scaleFactor = scaleFactor;

    const armatureQuaternion = armature.quaternion.clone();
    const armatureMatrixInverse = new THREE.Matrix4().getInverse(armature.matrixWorld);
    const armatureScale = armature.scale.clone();
    armature.position.set(0, 0, 0);
    armature.quaternion.set(0, 0, 0, 1);
    armature.scale.set(1, 1, 1).divideScalar(this.scaleFactor);
    armature.updateMatrix();

    const hairBones = tailBones.filter(bone => /hair/i.test(bone.name)).map(bone => {
      for (; bone; bone = bone.parent) {
        if (bone.parent === Head) {
          return bone;
        }
      }
      return null;
    }).filter(bone => bone);
    hairBones.forEach(rootHairBone => {
      rootHairBone.traverse(hairBone => {
        hairBone.length = hairBone.position.length();
        hairBone.worldParentOffset = hairBone.getWorldPosition(new Vector3()).sub(hairBone.parent.getWorldPosition(new Vector3())).divide(armatureScale);
        hairBone.initialWorldQuaternion = hairBone.getWorldQuaternion(new Quaternion());
        hairBone.velocity = new Vector3();
        if (hairBone !== rootHairBone) {
          hairBone._updateMatrixWorld = hairBone.updateMatrixWorld;
          hairBone.updateMatrixWorld = () => {};
        }
      });
    });
    this.hairBones = hairBones;

    const preRotations = {};
    const _ensurePrerotation = k => {
      const boneName = modelBones[k].name;
      if (!preRotations[boneName]) {
        preRotations[boneName] = new Quaternion();
      }
      return preRotations[boneName];
    };
    if (flipY) {
      ['Hips'].forEach(k => {
        _ensurePrerotation(k).premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI/2));
      });
    }
    if (!flipZ) {
    	// preRotations.Left_arm.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI*0.25));
    	// preRotations.Right_arm.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1),  -Math.PI*0.25));
      // preRotations.Upper_armL.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI*0.25));
      // preRotations.Upper_armR.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1),  -Math.PI*0.25));
    } else {
      ['Hips'].forEach(k => {
        _ensurePrerotation(k).premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
      });
    }
    if (flipLeg) {
      ['Left_leg', 'Right_leg'].forEach(k => {
        _ensurePrerotation(k).premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI/2));
      });
    }

    const qr = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (flipZ ? -1 : 1) * -Math.PI/2)
      .premultiply(
        new Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
          new Vector3(0, 0, 0),
          Right_elbow.getWorldPosition(new Vector3()).applyMatrix4(armatureMatrixInverse)
            .sub(Right_arm.getWorldPosition(new Vector3()).applyMatrix4(armatureMatrixInverse))
            .applyQuaternion(armatureQuaternion),
          new Vector3(0, 1, 0),
        ))
      );
    const qr2 = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (flipZ ? -1 : 1) * -Math.PI/2)
      .premultiply(
        new Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
          new Vector3(0, 0, 0),
          Right_wrist.getWorldPosition(new Vector3()).applyMatrix4(armatureMatrixInverse)
            .sub(Right_elbow.getWorldPosition(new Vector3()).applyMatrix4(armatureMatrixInverse))
            .applyQuaternion(armatureQuaternion),
          new Vector3(0, 1, 0),
        ))
      );
    const ql = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (flipZ ? -1 : 1) * Math.PI/2)
      .premultiply(
        new Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
          new Vector3(0, 0, 0),
          Left_elbow.getWorldPosition(new Vector3()).applyMatrix4(armatureMatrixInverse)
            .sub(Left_arm.getWorldPosition(new Vector3()).applyMatrix4(armatureMatrixInverse))
            .applyQuaternion(armatureQuaternion),
          new Vector3(0, 1, 0),
        ))
      );
    const ql2 = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (flipZ ? -1 : 1) * Math.PI/2)
      .premultiply(
        new Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
          new Vector3(0, 0, 0),
          Left_wrist.getWorldPosition(new Vector3()).applyMatrix4(armatureMatrixInverse)
            .sub(Left_elbow.getWorldPosition(new Vector3()).applyMatrix4(armatureMatrixInverse))
            .applyQuaternion(armatureQuaternion),
          new Vector3(0, 1, 0),
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

    _ensurePrerotation('Left_leg').premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0),  -Math.PI/2));
    _ensurePrerotation('Right_leg').premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0),  -Math.PI/2));

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
        modelBones[name].quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI/2));
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
		    modelBones[name].quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
		  });
		}
    // if ((preRotations.Right_arm && preRotations.Right_arm.applied) || (preRotations.Upper_armR && preRotations.Upper_armR.applied)) {
      modelBones.Right_arm.quaternion.premultiply(qr.clone().inverse());
      modelBones.Right_elbow.quaternion
        .premultiply(qr)
        .premultiply(qr2.clone().inverse());
      modelBones.Left_arm.quaternion.premultiply(ql.clone().inverse());
      modelBones.Left_elbow.quaternion
        .premultiply(ql)
        .premultiply(ql2.clone().inverse());
      console.log('log yes', flipZ, flipY, flipLeg);
    /* } else {
      console.log('log no', flipZ, flipY, flipLeg);
    } */
	  model.updateMatrixWorld(true);

    for (let i = 0; i < skeleton.bones.length; i++) {
      const bone = skeleton.bones[i];
      if (!bone.initialQuaternion) {
        bone.initialQuaternion = bone.quaternion.clone();
      }
    }

	  const _getOffset = (bone, parent = bone.parent) => bone.getWorldPosition(new Vector3()).sub(parent.getWorldPosition(new Vector3()));
	  const _averagePoint = points => {
      const result = new Vector3();
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
	    eyes: eyePosition.clone().sub(Head.getWorldPosition(new Vector3())),

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
		this.poseManager.flipY = flipY;
		this.shoulderTransforms = rigObject.AddComponent(ShoulderTransforms);
		this.legsManager = rigObject.AddComponent(LegsManager);

    this.shoulderTransforms.spine.localPosition = setups.spine;
    this.shoulderTransforms.transform.localPosition = setups.chest;
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

    this.height = eyePosition.sub(_averagePoint([modelBones.Left_ankle.getWorldPosition(new Vector3()), modelBones.Right_ankle.getWorldPosition(new Vector3())])).y;
    this.shoulderWidth = modelBones.Left_arm.getWorldPosition(new Vector3()).distanceTo(modelBones.Right_arm.getWorldPosition(new Vector3()));
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
    this.lastTimestamp = Date.now();

	  GameObject.startAll();
	}
	update() {
// return;
	  GameObject.updateAll();

	  for (const k in this.modelBones) {
      const modelBone = this.modelBones[k];
      const modelBoneOutput = this.modelBoneOutputs[k];

      if (k === 'Hips') {
        modelBone.position.copy(modelBoneOutput.position).multiplyScalar(this.scaleFactor);
      }
      modelBone.quaternion
        .copy(modelBone.initialQuaternion)

      if (['Hips', 'Spine', 'Chest', 'Neck', 'Head'].includes(k)) {
        modelBone.quaternion
          .premultiply(modelBoneOutput.localRotation)
      }
      /* if (k === 'Hips') {
        modelBone.quaternion
          .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI))
      } */

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
          .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI/2)) // center
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
          .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI/2)) // center
          // .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI/8)) // up
      }
      modelBone.updateMatrixWorld();
    }

    const now = Date.now();
    const timeDiff = Math.min(now - this.lastTimestamp, 1000);
    this.lastTimestamp = now;
    const _processHairBone = (hairBone, children) => {
      const p = new Vector3().setFromMatrixPosition(hairBone.matrixWorld);

      for (let i = 0; i < children.length; i++) {
        const childHairBone = children[i];

        const px = new Vector3().setFromMatrixPosition(childHairBone.matrixWorld);
        const hairDistance = px.distanceTo(p);
        const hairDirection = px.clone().sub(p).normalize();

        if (hairDistance > childHairBone.length * 2) {
          px.copy(p).add(hairDirection.clone().multiplyScalar(childHairBone.length * 2));
        }

        const l = childHairBone.velocity.length();
        if (l > 0.05) {
          childHairBone.velocity.multiplyScalar(0.05/l);
        }

        childHairBone.velocity.add(hairDirection.clone().multiplyScalar(-(hairDistance - childHairBone.length) * 0.1 * timeDiff/32));
        childHairBone.velocity.add(new Vector3(0, -9.8, 0).multiplyScalar(0.0002 * timeDiff/32));
        childHairBone.velocity.add(childHairBone.worldParentOffset.clone().applyQuaternion(this.modelBones.Hips.quaternion).multiplyScalar(0.03 * timeDiff/32));
        childHairBone.velocity.lerp(new Vector3(), 0.2 * timeDiff/32);

        const p2 = px.clone().add(childHairBone.velocity.clone().multiplyScalar(1));
        const q2 = childHairBone.initialWorldQuaternion.clone().premultiply(
          new Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(
            new Vector3(0, 0, 0),
            hairDirection,
            new Vector3(0, 0, -1).applyQuaternion(this.modelBones.Hips.quaternion),
          ))
        );
        const s2 = new Vector3(1, 1, 1);
        childHairBone.matrixWorld.compose(p2, q2, s2);
        _processHairBone(childHairBone, childHairBone.children);
      }
    };
    _processHairBone(this.modelBones.Head, this.hairBones);
	}
}
export default Rig;