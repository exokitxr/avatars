import {Helpers} from './Unity.js';

const stepTime = 50;
const stepHeight = 0.1;
const stepMinDistance = 0.7;
const stepMaxDistance = 2.5;
const stepRestitutionDistance = 1;
const minStepDistanceTimeFactor = 0.1;
const minHmdVelocityTimeFactor = 0.01;
const velocityRestitutionFactor = 15;

const zeroVector = new THREE.Vector3();
const oneVector = new THREE.Vector3(1, 1, 1);
const identityRotation = new THREE.Quaternion();
const downHalfRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);
const upHalfRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2);
const downQuarterRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/4);

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
const localMatrix3 = new THREE.Matrix4();

const _mod = (a, n) => (a % n + n) % n;
const _angleDiff = (targetA, sourceA) => {
  let a = targetA - sourceA;
  a = _mod((a + Math.PI), Math.PI*2) - Math.PI;
  return a;
};

class Leg {
  constructor(left) {
  	this.transform = new THREE.Object3D();
    this.upperLeg = new THREE.Object3D();
    this.lowerLeg = new THREE.Object3D();
    this.foot = new THREE.Object3D();
    this.foot.stickTransform = new THREE.Object3D();
    this.foot.startTransform = new THREE.Object3D();
    this.foot.endTransform = new THREE.Object3D();
    this.foot.startHmdFloorTransform = new THREE.Object3D();
    this.foot.startTimestamp = Date.now();

    this.transform.add(this.upperLeg);
    this.upperLeg.add(this.lowerLeg);
    this.lowerLeg.add(this.foot);

    this.upperLegLength = 0;
    this.lowerLegLength = 0;
    this.legLength = 0;

    this.left = left;

    this.standing = true;
    this.stepping = false;
    this.balance = 1;
  }

  Start() {
  	// this.foot.stickTransform.position.copy(this.foot.position);
    this.upperLegLength = this.lowerLeg.position.length();
    this.lowerLegLength = this.foot.position.length();
    this.legLength = this.upperLegLength + this.lowerLegLength;
  }

  Update() {
    if (this.standing || this.stepping) {
      const footPosition = localVector.copy(this.foot.stickTransform.position);
      // footPosition.y = 0;
	    const upperLegPosition = Helpers.getWorldPosition(this.upperLeg, localVector2);

      const footRotation = this.foot.stickTransform.quaternion;

	    const hypotenuseDistance = this.upperLegLength;
	    const verticalDistance = Math.abs(upperLegPosition.y) / 2;
      const offsetDistance = hypotenuseDistance > verticalDistance ? Math.sqrt(hypotenuseDistance*hypotenuseDistance - verticalDistance*verticalDistance) : 0;

      const lowerLegPosition = localVector4.copy(upperLegPosition).add(footPosition).divideScalar(2)
        .add(
        	localVector5.copy(footPosition).sub(upperLegPosition)
		        .cross(localVector6.set(1, 0, 0).applyQuaternion(footRotation))
		        .normalize()
        		.multiplyScalar(offsetDistance)
        );

      this.upperLeg.quaternion.setFromRotationMatrix(
	      localMatrix.lookAt(
	        zeroVector,
	        localVector5.copy(upperLegPosition).sub(lowerLegPosition),
	        localVector6.set(0, 0, 1).applyQuaternion(footRotation)
	      )
	    )
	      .multiply(downHalfRotation)
	      .premultiply(Helpers.getWorldQuaternion(this.transform, localQuaternion).inverse());
	    Helpers.updateMatrixMatrixWorld(this.upperLeg);

	    this.lowerLeg.quaternion.setFromRotationMatrix(
	      localMatrix.lookAt(
	        zeroVector,
	        localVector5.copy(lowerLegPosition).sub(footPosition),
	        localVector6.set(0, 0, 1).applyQuaternion(footRotation)
	      )
	    )
	      .multiply(downHalfRotation)
	      .premultiply(Helpers.getWorldQuaternion(this.upperLeg, localQuaternion).inverse());
	    Helpers.updateMatrixMatrixWorld(this.lowerLeg);

      // this.lowerLeg.position = lowerLegPosition;

      // this.foot.position = footPosition;
      this.foot.quaternion.copy(footRotation)
        .multiply(downHalfRotation)
        .premultiply(Helpers.getWorldQuaternion(this.lowerLeg, localQuaternion).inverse());
      Helpers.updateMatrixMatrixWorld(this.foot);
      // this.foot.stickTransform.position = footPosition;
    } else {
    	this.upperLeg.quaternion.slerp(identityRotation, 0.1);
    	this.lowerLeg.quaternion.slerp(identityRotation, 0.1);
    	this.foot.quaternion.slerp(downQuarterRotation, 0.1);
    	this.transform.updateMatrixWorld(true);
    }
	}

	isStanding() {
		return Helpers.getWorldPosition(this.upperLeg, localVector).y <= this.legLength;
	}
}

class LegsManager {
	constructor(rig) {
    this.hips = rig.shoulderTransforms.hips;
    this.leftLeg = new Leg(true);
    this.hips.add(this.leftLeg.transform);
    this.rightLeg = new Leg(false);
    this.hips.add(this.rightLeg.transform);

    this.rig = rig;
    this.poseManager = rig.poseManager;

    this.legSeparation = 0;
    this.hmdVelocity = new THREE.Vector3();
    this.lastHmdPosition = new THREE.Vector3();
  }

  Start() {
  	this.legSeparation = Helpers.getWorldPosition(this.leftLeg.upperLeg, localVector)
  	  .distanceTo(Helpers.getWorldPosition(this.rightLeg.upperLeg, localVector2));
  	this.lastHmdPosition.copy(this.poseManager.vrTransforms.head.position);
  	this.leftLeg.Start();
  	this.rightLeg.Start();
  }

	Update() {
		Helpers.updateMatrixWorld(this.leftLeg.transform);
		Helpers.updateMatrixWorld(this.leftLeg.upperLeg);
		Helpers.updateMatrixWorld(this.leftLeg.lowerLeg);
		Helpers.updateMatrixWorld(this.leftLeg.foot);

    Helpers.updateMatrixWorld(this.rightLeg.transform);
		Helpers.updateMatrixWorld(this.rightLeg.upperLeg);
		Helpers.updateMatrixWorld(this.rightLeg.lowerLeg);
		Helpers.updateMatrixWorld(this.rightLeg.foot);

    const velocityLearningFactor = 0.1;
		this.hmdVelocity.multiplyScalar(1-velocityLearningFactor)
		  .add(localVector.copy(this.poseManager.vrTransforms.head.position).sub(this.lastHmdPosition).multiplyScalar(velocityLearningFactor));
		this.lastHmdPosition.copy(this.poseManager.vrTransforms.head.position);
		// console.log('v', this.hmdVelocity.toArray().join(','));

	  this.leftLeg.standing = this.leftLeg.isStanding();
	  if (this.leftLeg.stepping && !this.leftLeg.standing) {
      this.leftLeg.stepping = false;
	  }
	  this.rightLeg.standing = this.rightLeg.isStanding();
	  if (this.rightLeg.stepping && !this.rightLeg.standing) {
      this.rightLeg.stepping = false;
	  }

    const hipsFloorPosition = localVector.copy(this.hips.position);
    hipsFloorPosition.y = 0;
    const hipsFloorEuler = localEuler.setFromQuaternion(this.hips.quaternion, 'YXZ');
    hipsFloorEuler.x = 0;
    hipsFloorEuler.z = 0;
    const planeMatrix = localMatrix.compose(hipsFloorPosition, localQuaternion.setFromEuler(hipsFloorEuler), oneVector);
    const planeMatrixInverse = localMatrix2.getInverse(planeMatrix);

    const fakePosition = localVector2;
    const fakeScale = localVector3;

    const leftFootPosition = localVector4;
    const leftFootRotation = localQuaternion;
    localMatrix3.compose(this.leftLeg.foot.stickTransform.position, this.leftLeg.foot.stickTransform.quaternion, oneVector)
      .premultiply(planeMatrixInverse)
      .decompose(leftFootPosition, leftFootRotation, fakeScale);

    const rightFootPosition = localVector5;
    const rightFootRotation = localQuaternion2;
    localMatrix3.compose(this.rightLeg.foot.stickTransform.position, this.rightLeg.foot.stickTransform.quaternion, oneVector)
      .premultiply(planeMatrixInverse)
      .decompose(rightFootPosition, rightFootRotation, fakeScale);

    // rotation

    if (this.leftLeg.standing) {
      const leftFootEuler = localEuler.setFromQuaternion(leftFootRotation, 'YXZ');
      leftFootEuler.x = 0;
	    leftFootEuler.z = 0;
    	if (leftFootEuler.y < -Math.PI*0.15) {
    		leftFootEuler.y = -Math.PI*0.15;
    	}
    	if (leftFootEuler.y > Math.PI*0.15) {
    		leftFootEuler.y = Math.PI*0.15;
    	}
    	localMatrix3.compose(zeroVector, localQuaternion3.setFromEuler(leftFootEuler), oneVector)
	      .premultiply(planeMatrix)
	      .decompose(fakePosition, this.leftLeg.foot.stickTransform.quaternion, fakeScale);
    } else {
    	Helpers.getWorldQuaternion(this.leftLeg.foot, this.leftLeg.foot.stickTransform.quaternion)
    	  .multiply(upHalfRotation);
    }
    if (this.rightLeg.standing) {
	    const rightFootEuler = localEuler.setFromQuaternion(rightFootRotation, 'YXZ');
	    rightFootEuler.x = 0;
	    rightFootEuler.z = 0;
    	if (rightFootEuler.y < -Math.PI*0.15) {
    		rightFootEuler.y = -Math.PI*0.15;
    	}
    	if (rightFootEuler.y > Math.PI*0.15) {
    		rightFootEuler.y = Math.PI*0.15;
    	}
    	localMatrix3.compose(zeroVector, localQuaternion3.setFromEuler(rightFootEuler), oneVector)
	      .premultiply(planeMatrix)
	      .decompose(fakePosition, this.rightLeg.foot.stickTransform.quaternion, fakeScale);
	  } else {
      Helpers.getWorldQuaternion(this.rightLeg.foot, this.rightLeg.foot.stickTransform.quaternion)
        .multiply(upHalfRotation);
	  }

	  // position

    if (!this.leftLeg.stepping && !this.rightLeg.stepping && this.leftLeg.standing && this.rightLeg.standing) {
    	let leftStepDistance = 0;
    	let leftStepAngleDiff = 0;
	    if (this.leftLeg.standing) {
	    	const leftDistance = Math.sqrt(leftFootPosition.x*leftFootPosition.x + leftFootPosition.z*leftFootPosition.z);
				const leftAngleDiff = _angleDiff(Math.PI/2, Math.atan2(leftFootPosition.z, leftFootPosition.x));
				if (leftDistance < this.legSeparation*stepMinDistance) {
					leftStepDistance = this.legSeparation*stepMinDistance - leftDistance;
				} else if (leftDistance > this.legSeparation*stepMaxDistance) {
					leftStepDistance = this.legSeparation*stepMaxDistance - leftDistance;
				}
				if (leftAngleDiff > -Math.PI*0.3) {
					leftStepAngleDiff = _angleDiff(leftAngleDiff, -Math.PI*0.3);
				} else if (leftAngleDiff < -Math.PI/2-Math.PI*0.3) {
					leftStepAngleDiff = _angleDiff(leftAngleDiff, -Math.PI/2-Math.PI*0.3);
				}
			}
			let rightStepDistance = 0;
    	let rightStepAngleDiff = 0;
			if (this.rightLeg.standing) {
				const rightDistance = Math.sqrt(rightFootPosition.x*rightFootPosition.x + rightFootPosition.z*rightFootPosition.z);
				const rightAngleDiff = _angleDiff(Math.PI/2, Math.atan2(rightFootPosition.z, rightFootPosition.x));
		    if (rightDistance < this.legSeparation*stepMinDistance) {
		    	rightStepDistance = this.legSeparation*stepMinDistance - rightDistance;
		    } else if (rightDistance > this.legSeparation*3) {
		    	rightStepDistance = this.legSeparation*stepMaxDistance - rightDistance;
		    }
		    if (rightAngleDiff < Math.PI*0.3) {
		    	rightStepAngleDiff = _angleDiff(rightAngleDiff, Math.PI*0.3);
		    } else if (rightAngleDiff > Math.PI/2+Math.PI*0.3) {
					rightStepAngleDiff = _angleDiff(rightAngleDiff, Math.PI/2+Math.PI*0.3);
				}
			}
			if (leftStepDistance !== 0 || rightStepDistance !== 0 || leftStepAngleDiff !== 0 || rightStepAngleDiff !== 0) {
				const _stepLeg = leg => {
          const footDistance = this.legSeparation*stepRestitutionDistance;//Math.min(Math.max(leftStepDistance, this.legSeparation*0.7), this.legSeparation*1.4);

					leg.foot.startTransform.position.copy(leg.foot.stickTransform.position);
	        // leg.foot.startTransform.quaternion.copy(leg.foot.stickTransform.quaternion);

				   leg.foot.endTransform.position.copy(hipsFloorPosition)
					  .add(localVector6.set((leg.left ? -1 : 1) * footDistance, 0, 0).applyQuaternion(leg.foot.stickTransform.quaternion))
					  .add(localVector6.set(this.hmdVelocity.x, 0, this.hmdVelocity.z).multiplyScalar(velocityRestitutionFactor));
				  // leg.foot.endTransform.quaternion.copy(this.rightLeg.foot.stickTransform.quaternion);

				  leg.foot.startHmdFloorTransform.position.set(this.poseManager.vrTransforms.head.position.x, 0, this.poseManager.vrTransforms.head.position.z);

          leg.foot.stepHeight = stepHeight * this.rig.height;
          leg.foot.startTimestamp = Date.now();
	        leg.stepping = true;
				};
        if (
        	Math.abs(leftStepDistance*this.leftLeg.balance) > Math.abs(rightStepDistance*this.rightLeg.balance) ||
        	(
        		Math.abs(leftStepDistance*this.leftLeg.balance) === Math.abs(rightStepDistance*this.rightLeg.balance) &&
        		Math.abs(leftStepAngleDiff*this.leftLeg.balance) > Math.abs(rightStepAngleDiff*this.rightLeg.balance)
        	)
        ) {
        	_stepLeg(this.leftLeg);
          this.leftLeg.balance = 0;
          this.rightLeg.balance = 0;
        } else {
        	_stepLeg(this.rightLeg);
        	this.rightLeg.balance = 0;
          this.leftLeg.balance = 1;
        }
			} else {
				this.leftLeg.balance = 1;//Math.min(this.leftLeg.balance + 0.1, 1);
				this.rightLeg.balance = 1;//Math.min(this.rightLeg.balance + 0.1, 1);
			}
		}

    if (this.leftLeg.stepping) {
			const now = Date.now();
			const scaledStepTime = stepTime
			  / Math.max(
			  	localVector.set(this.poseManager.vrTransforms.head.position.x, 0, this.poseManager.vrTransforms.head.position.z)
			  	  .distanceTo(this.leftLeg.foot.startHmdFloorTransform.position),
			  	minStepDistanceTimeFactor
			  )
			  // / Math.max(localVector2.set(this.hmdVelocity.x, 0, this.hmdVelocity.z).length(), minHmdVelocityTimeFactor);
      const stepFactor = Math.min(Math.max((now - this.leftLeg.foot.startTimestamp) / scaledStepTime, 0), 1);
      const xzStepFactor = Math.min(stepFactor * 2, 1);

      this.leftLeg.foot.stickTransform.position.copy(this.leftLeg.foot.startTransform.position)
        .lerp(this.leftLeg.foot.endTransform.position, xzStepFactor)
        .add(localVector2.set(0, Math.sin(stepFactor*Math.PI) * this.leftLeg.foot.stepHeight, 0));
      // this.leftLeg.foot.stickTransform.quaternion.copy(this.leftLeg.foot.startTransform.quaternion).slerp(this.leftLeg.foot.endTransform.quaternion, stepFactor);

      if (stepFactor >= 1) {
      	this.leftLeg.stepping = false;
      }
		} else if (!this.leftLeg.standing) {
			Helpers.getWorldPosition(this.leftLeg.foot, this.leftLeg.foot.stickTransform.position);
		  this.leftLeg.foot.stickTransform.position.y = 0;
		}
		if (this.rightLeg.stepping) {
			const now = Date.now();
			const scaledStepTime = stepTime
			  / Math.max(
			  	localVector.set(this.poseManager.vrTransforms.head.position.x, 0, this.poseManager.vrTransforms.head.position.z)
			  	  .distanceTo(this.rightLeg.foot.startHmdFloorTransform.position),
			  	minStepDistanceTimeFactor
			  )
			  // / Math.max(localVector.set(this.hmdVelocity.x, 0, this.hmdVelocity.z).length(), minHmdVelocityTimeFactor);
      const stepFactor = Math.min(Math.max((now - this.rightLeg.foot.startTimestamp) / scaledStepTime, 0), 1);
      const xzStepFactor = Math.min(stepFactor * 2, 1);

      this.rightLeg.foot.stickTransform.position.copy(this.rightLeg.foot.startTransform.position)
        .lerp(this.rightLeg.foot.endTransform.position, xzStepFactor)
        .add(localVector.set(0, Math.sin(stepFactor*Math.PI) * this.rightLeg.foot.stepHeight, 0));
      // this.rightLeg.foot.stickTransform.quaternion.copy(this.rightLeg.foot.startTransform.quaternion).slerp(this.rightLeg.foot.endTransform.quaternion, stepFactor);

      if (stepFactor >= 1) {
      	this.rightLeg.stepping = false;
      }
		} else if (!this.rightLeg.standing) {
      Helpers.getWorldPosition(this.rightLeg.foot, this.rightLeg.foot.stickTransform.position);
			this.rightLeg.foot.stickTransform.position.y = 0;
		}

		this.leftLeg.Update();
		this.rightLeg.Update();
  }
}

export default LegsManager;
