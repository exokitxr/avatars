import {Vector3, Quaternion, Transform, GameObject, Mathf} from './Unity.js';
import ShoulderTransforms from './ShoulderTransforms.js';
import VRTrackingReferences from './VRTrackingReferences.js';
import PoseManager from './PoseManager.js';
import VectorHelpers from './Utils/VectorHelpers.js';

const z180Quaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);

class ShoulderPoser
	{
		constructor(rig, shoulder) {
			this.shoulder = shoulder;
			this.poseManager = rig.poseManager;
			this.vrTrackingReferences = this.poseManager.vrTransforms;
			this.avatarTrackingReferences = this.poseManager.avatarVrTransforms;

      // this.headNeckDirectionVector = new Vector3(1.0894440904962721e-10, -0.06860782711996793, -0.0006757629250115499).normalize();
			// this.headNeckDistance = 0.06861115505261682;
			// this.neckShoulderDistance = new Vector3(3.122724301363178e-10, -0.1953215129534993, 0.02834002902116923);

			this.maxDeltaHeadRotation = 80;

			this.distinctShoulderRotationLimitForward = 33;

			this.distinctShoulderRotationLimitBackward = 0;

			this.distinctShoulderRotationLimitUpward = 33;
			this.distinctShoulderRotationMultiplier = 30;

	  	this.rightRotationStartHeight = 0;
			this.rightRotationHeightFactor = 142;
			this.rightRotationHeadRotationFactor = 0.3;
			this.rightRotationHeadRotationOffset = -20;

			this.startShoulderDislocationBefore = 0.005;

			this.ignoreYPos = true;
		  this.autoDetectHandsBehindHead = true;
			this.clampRotationToHead = true;
		  this.enableDistinctShoulderRotation = true;
			this.enableShoulderDislocation = true;


			this.handsBehindHead = false;

			this.clampingHeadRotation = false;
			this.shoulderDislocated = false;
			this.shoulderRightRotation;

			// this.lastAngle = Vector3.zero;

			this.leftShoulderAnkerStartLocalPosition = new Vector3();
			this.rightShoulderAnkerStartLocalPosition = new Vector3();
		}

		Start() {
			this.leftShoulderAnkerStartLocalPosition = this.shoulder.transform.InverseTransformPoint(this.shoulder.leftShoulderAnchor.position);
			this.rightShoulderAnkerStartLocalPosition =
				this.shoulder.transform.InverseTransformPoint(this.shoulder.rightShoulderAnchor.position);
		}

		/* onCalibrate()
		{
			this.shoulder.leftArm.setArmLength((avatarTrackingReferences.leftHand.position - this.shoulder.leftShoulderAnchor.position)
				.magnitude);
			this.shoulder.rightArm.setArmLength((avatarTrackingReferences.rightHand.position - this.shoulder.rightShoulderAnchor.position)
				.magnitude);
		} */

		Update()
		{
      this.updateHips();

			// this.shoulder.transform.rotation = Quaternion.identity;
			// this.positionShoulder();
			this.rotateShoulderUpBase();
			this.rotateShoulderRightBase();

			if (this.enableDistinctShoulderRotation)
			{
				this.rotateLeftShoulder();
				this.rotateRightShoulder();
			}

			/* if (this.enableShoulderDislocation)
			{
				this.clampShoulderHandDistance();
			}
			else
			{
				this.shoulder.leftArm.transform.localPosition = Vector3.zero;
				this.shoulder.rightArm.transform.localPosition = Vector3.zero;
			} */

			this.updateNeck();

			// Debug.DrawRay(this.shoulder.transform.position, this.shoulder.transform.forward);
		}

		updateHips() {
		  const hmdPosition = this.vrTrackingReferences.head.position;
		  const hmdRotation = this.vrTrackingReferences.head.rotation;
      hmdRotation.multiply(z180Quaternion);
      const hmdEuler = new THREE.Euler().setFromQuaternion(hmdRotation, 'YXZ');
      hmdEuler.x = 0;
      hmdEuler.z = 0;
      const hmdFlatRotation = new Quaternion().setFromEuler(hmdEuler);

      const headPosition = hmdPosition.clone().add(this.shoulder.eyes.localPosition.multiplyScalar(-1).applyQuaternion(hmdRotation));
		  const neckPosition = headPosition.clone().add(this.shoulder.head.localPosition.multiplyScalar(-1).applyQuaternion(hmdRotation));
		  const chestPosition = neckPosition.clone().add(this.shoulder.neck.localPosition.multiplyScalar(-1).applyQuaternion(hmdFlatRotation));
		  const spinePosition = chestPosition.clone().add(this.shoulder.transform.localPosition.multiplyScalar(-1).applyQuaternion(hmdFlatRotation));
		  const hipsPosition = spinePosition.clone().add(this.shoulder.spine.localPosition.multiplyScalar(-1).applyQuaternion(hmdFlatRotation));

      this.shoulder.hips.localPosition = hipsPosition;
      this.shoulder.hips.localRotation = hmdFlatRotation;
      // this.shoulder.spine.rotation = hmdFlatRotation;
      // this.shoulder.transform.localRotation = new Quaternion();
		}

		updateNeck() {
			// const hmdPosition = this.vrTrackingReferences.head.position;
			const hmdRotation = this.vrTrackingReferences.head.rotation;
		  hmdRotation.multiply(z180Quaternion);
      const hmdFlatEuler = new THREE.Euler().setFromQuaternion(hmdRotation, 'YXZ');
      hmdFlatEuler.x = 0;
      hmdFlatEuler.z = 0;
      const hmdFlatRotation = new Quaternion().setFromEuler(hmdFlatEuler);
      const hmdUpEuler = new THREE.Euler().setFromQuaternion(hmdRotation, 'YXZ');
      hmdUpEuler.y = 0;
      const hmdUpRotation = new Quaternion().setFromEuler(hmdUpEuler);

      this.shoulder.neck.localRotation = hmdFlatRotation.clone().premultiply(this.shoulder.transform.rotation.inverse());
      this.shoulder.head.localRotation = hmdUpRotation;
		}

		rotateLeftShoulder()
		{
			this.rotateShoulderUp(this.shoulder.leftShoulder, this.shoulder.leftArm, this.avatarTrackingReferences.leftHand,
				this.leftShoulderAnkerStartLocalPosition, 1);

		}

		rotateRightShoulder()
		{
			this.rotateShoulderUp(this.shoulder.rightShoulder, this.shoulder.rightArm, this.avatarTrackingReferences.rightHand,
				this.rightShoulderAnkerStartLocalPosition, -1);
		}

		rotateShoulderUp(shoulderSide, arm, targetHand,
			initialShoulderLocalPos, angleSign)
		{
			const initialShoulderPos = this.shoulder.transform.TransformPoint(initialShoulderLocalPos);
			const handShoulderOffset = new Vector3().subVectors(targetHand.position, initialShoulderPos);
			const armLength = arm.armLength;

			const targetAngle = Vector3.zero;

		  const forwardDistanceRatio = Vector3.Dot(handShoulderOffset, this.shoulder.transform.forward) / armLength;
			const upwardDistanceRatio = Vector3.Dot(handShoulderOffset, this.shoulder.transform.up) / armLength;
			if (forwardDistanceRatio > 0)
			{
				targetAngle.y = Mathf.Clamp((forwardDistanceRatio - 0.5) * this.distinctShoulderRotationMultiplier, 0,
					this.distinctShoulderRotationLimitForward);
			}
			else
			{
				targetAngle.y = Mathf.Clamp(-(forwardDistanceRatio + 0.08) * this.distinctShoulderRotationMultiplier * 10,
					-this.distinctShoulderRotationLimitBackward, 0);
			}

			targetAngle.z = Mathf.Clamp(-(upwardDistanceRatio - 0.5) * this.distinctShoulderRotationMultiplier,
				-this.distinctShoulderRotationLimitUpward, 0);

			shoulderSide.localEulerAngles = targetAngle * angleSign;
		}


		positionShoulder()
		{
			/* const headNeckOffset = this.headNeckDirectionVector.clone().applyQuaternion(this.avatarTrackingReferences.head.rotation);
			const targetPosition = new Vector3().addVectors(this.avatarTrackingReferences.head.position, headNeckOffset.clone().multiplyScalar(this.headNeckDistance));
			this.shoulder.transform.localPosition =
				new Vector3().addVectors(targetPosition, this.neckShoulderDistance); */
		}

		rotateShoulderUpBase()
		{
			const angle = this.getCombinedDirectionAngleUp();

			const targetRotation = new Vector3(0, angle, 0);

			/* if (this.autoDetectHandsBehindHead)
			{
				this.detectHandsBehindHead(targetRotation);
			} */

			if (this.clampRotationToHead)
			{
				this.clampHeadRotationDeltaUp(targetRotation);
			}

			this.shoulder.transform.eulerAngles = targetRotation;
		}

		rotateShoulderRightBase()
		{

			const heightDiff = this.vrTrackingReferences.head.position.y - this.poseManager.vrSystemOffsetHeight;
			const relativeHeightDiff = -heightDiff / this.poseManager.playerHeightHmd;

      const hmdRotation = this.vrTrackingReferences.head.rotation;
      hmdRotation.multiply(z180Quaternion);
			const headRightRotation = VectorHelpers.getAngleBetween(this.shoulder.transform.forward,
										  new Vector3(0, 0, 1).applyQuaternion(hmdRotation),
										  Vector3.up, this.shoulder.transform.right) + this.rightRotationHeadRotationOffset;
			const heightFactor = Mathf.Clamp(relativeHeightDiff - this.rightRotationStartHeight, 0, 1);
			this.shoulderRightRotation = heightFactor * this.rightRotationHeightFactor;
			this.shoulderRightRotation += Mathf.Clamp(headRightRotation * this.rightRotationHeadRotationFactor * heightFactor, 0, 50);

            this.shoulderRightRotation = Mathf.Clamp(this.shoulderRightRotation, 0, 50);

			const deltaRot = Quaternion.AngleAxis(this.shoulderRightRotation, this.shoulder.transform.right);


			this.shoulder.transform.rotation = new Quaternion().multiplyQuaternions(deltaRot,  this.shoulder.transform.rotation);
			// this.positionShoulderRelative();
		}

		/* positionShoulderRelative()
		{
			const deltaRot = Quaternion.AngleAxis(this.shoulderRightRotation, this.shoulder.transform.right);
			const shoulderHeadDiff = new Vector3().subVectors(this.shoulder.transform.position, this.avatarTrackingReferences.head.position);
		  // this.shoulder.transform.position = new Vector3().addVectors(shoulderHeadDiff.clone().applyQuaternion(deltaRot), this.avatarTrackingReferences.head.position);
		} */

		getCombinedDirectionAngleUp()
		{
			const leftHand = this.avatarTrackingReferences.leftHand;
      const rightHand = this.avatarTrackingReferences.rightHand;

			const distanceLeftHand = new Vector3().subVectors(leftHand.position, this.shoulder.transform.position);
			const distanceRightHand = new Vector3().subVectors(rightHand.position, this.shoulder.transform.position);

			if (this.ignoreYPos)
			{
				distanceLeftHand.y = 0;
				distanceRightHand.y = 0;
			}

			const hmdRotation = this.vrTrackingReferences.head.rotation;
      const hmdEuler = new THREE.Euler().setFromQuaternion(hmdRotation, 'YXZ');
      hmdEuler.x = 0;
      hmdEuler.z = 0;
      const hmdFlatRotation = new Quaternion().setFromEuler(hmdEuler);
      const hmdFlatRotationInverse = hmdFlatRotation.clone().inverse();

			const leftHandBehind = distanceLeftHand.clone().applyQuaternion(hmdFlatRotationInverse);
			const leftBehind = leftHandBehind.z > 0;
			const rightHandBehind = distanceRightHand.clone().applyQuaternion(hmdFlatRotationInverse);
			const rightBehind = rightHandBehind.z > 0;

			if (leftBehind) {
				/* if (leftHandBehind.x < 0) {
					leftHandBehind.x *= -1;
				} else { */
				  leftHandBehind.x = 0;
				// }
				leftHandBehind.y = 0;
				leftHandBehind.z *= rightBehind ? -2 : -1;
				leftHandBehind.applyQuaternion(hmdFlatRotation);
				distanceLeftHand.add(leftHandBehind);
			}
			if (rightBehind) {
				/* if (rightHandBehind.x > 0) {
					rightHandBehind.x *= -1;
				} else { */
				  rightHandBehind.x = 0;
				// }
				rightHandBehind.y = 0;
				rightHandBehind.z *= leftBehind ? -2 : -1;
				rightHandBehind.applyQuaternion(hmdFlatRotation);
				distanceRightHand.add(rightHandBehind);
			}

			const directionLeftHand = distanceLeftHand.normalized;
			const directionRightHand = distanceRightHand.normalized;

			const combinedDirection = new Vector3().addVectors(directionLeftHand, directionRightHand);

			// console.log('combined', Mathf.Atan2(combinedDirection.x, combinedDirection.z) * 180 / Mathf.PI, combinedDirection.x, combinedDirection.z);

			return Mathf.Atan2(combinedDirection.x, combinedDirection.z) * 180 / Mathf.PI;
		}

		/* detectHandsBehindHead(targetRotation)
		{
			const delta = Mathf.Abs(targetRotation.y - this.lastAngle.y + 360) % 360;
			if (delta > 150 && delta < 210 && this.lastAngle.magnitude > 0.000001 && !this.clampingHeadRotation)
			{
				this.handsBehindHead = !this.handsBehindHead;
			}

			this.lastAngle = targetRotation;

			if (this.handsBehindHead)
			{
				targetRotation.y += 180;
			}
		} */

		clampHeadRotationDeltaUp(targetRotation)
		{
			const hmdRotation = this.vrTrackingReferences.head.rotation;
			hmdRotation.multiply(z180Quaternion);
			const headUpRotation = (Transform.eulerAngles(hmdRotation).y + 360) % 360;
			const targetUpRotation = (targetRotation.y + 360) % 360;

			const delta = headUpRotation - targetUpRotation;

			if (delta > this.maxDeltaHeadRotation && delta < 180 || delta < -180 && delta >= -360 + this.maxDeltaHeadRotation)
			{
				targetRotation.y = headUpRotation - this.maxDeltaHeadRotation;
				this.clampingHeadRotation = true;
			}
			else if (delta < -this.maxDeltaHeadRotation && delta > -180 || delta > 180 && delta < 360 - this.maxDeltaHeadRotation)
			{
				targetRotation.y = headUpRotation + this.maxDeltaHeadRotation;
				this.clampingHeadRotation = true;
			}
			else
			{
				this.clampingHeadRotation = false;
			}
		}

		clampShoulderHandDistance()
		{
			const leftHandVector = new Vector3().subVectors(this.avatarTrackingReferences.leftHand.position, this.shoulder.leftShoulderAnchor.position);
			const rightHandVector = new Vector3().subVectors(this.avatarTrackingReferences.rightHand.position, this.shoulder.rightShoulderAnchor.position);
			const leftShoulderHandDistance = leftHandVector.magnitude;
      const rightShoulderHandDistance = rightHandVector.magnitude;
			this.shoulderDislocated = false;

		  const startBeforeFactor = (1 - this.startShoulderDislocationBefore);

			if (leftShoulderHandDistance > this.shoulder.leftArm.armLength * startBeforeFactor)
			{
				this.shoulderDislocated = true;
				this.shoulder.leftArm.transform.position = new Vector3().addVectors(this.shoulder.leftShoulderAnchor.position,
													  leftHandVector.normalized.multiplyScalar(leftShoulderHandDistance - this.shoulder.leftArm.armLength * startBeforeFactor));
			}
			else
			{
				this.shoulder.leftArm.transform.localPosition = Vector3.zero;
			}

			if (rightShoulderHandDistance > this.shoulder.rightArm.armLength * startBeforeFactor)
			{
				this.shoulderDislocated = true;
				this.shoulder.rightArm.transform.position = new Vector3().addVectors(this.shoulder.rightShoulderAnchor.position,
													   rightHandVector.normalized.multiplyScalar(rightShoulderHandDistance - this.shoulder.rightArm.armLength * startBeforeFactor));
			}
			else
			{
				this.shoulder.rightArm.transform.localPosition = Vector3.zero;
			}
		}
	}

export default ShoulderPoser;
