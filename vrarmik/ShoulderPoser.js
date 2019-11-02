import {Helpers} from './Unity.js';

const z180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localEuler2 = new THREE.Euler();

class ShoulderPoser
	{
		constructor(rig, shoulder) {
			this.shoulder = shoulder;
			this.poseManager = rig.poseManager;
			this.vrTransforms = this.poseManager.vrTransforms;

      // this.headNeckDirectionVector = new Vector3(1.0894440904962721e-10, -0.06860782711996793, -0.0006757629250115499).normalize();
			// this.headNeckDistance = 0.06861115505261682;
			// this.neckShoulderDistance = new Vector3(3.122724301363178e-10, -0.1953215129534993, 0.02834002902116923);

			this.maxDeltaHeadRotation = 80;

			// this.distinctShoulderRotationLimitForward = 33;

			// this.distinctShoulderRotationLimitBackward = 0;

			// this.distinctShoulderRotationLimitUpward = 33;
			// this.distinctShoulderRotationMultiplier = 30;

	  	// this.rightRotationStartHeight = 0;
			// this.rightRotationHeightFactor = 142;
			// this.rightRotationHeadRotationFactor = 0.3;
			// this.rightRotationHeadRotationOffset = -20;

			// this.startShoulderDislocationBefore = 0.005;

			// this.ignoreYPos = true;
		  // this.autoDetectHandsBehindHead = true;
			// this.clampRotationToHead = true;
		  // this.enableDistinctShoulderRotation = true;
			// this.enableShoulderDislocation = true;


			// this.handsBehindHead = false;

			// this.clampingHeadRotation = false;
			// this.shoulderDislocated = false;
			// this.shoulderRightRotation;

			// this.lastAngle = Vector3.zero;

			// this.leftShoulderAnkerStartLocalPosition = new Vector3();
			// this.rightShoulderAnkerStartLocalPosition = new Vector3();
		}

		/* Start() {
			this.leftShoulderAnkerStartLocalPosition = this.shoulder.leftShoulderAnchor.localPosition.clone();
			this.rightShoulderAnkerStartLocalPosition = this.shoulder.rightShoulderAnchor.position.clone();
		} */

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
			this.rotateShoulderBase();

			/* if (this.enableDistinctShoulderRotation)
			{
				this.rotateLeftShoulder(rotation);
				this.rotateRightShoulder(rotation);
			} */

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
		  const hmdRotation = localQuaternion.copy(this.vrTransforms.head.quaternion)
        .multiply(z180Quaternion);
      const hmdEuler = localEuler.setFromQuaternion(hmdRotation, 'YXZ');
      hmdEuler.x = 0;
      hmdEuler.z = 0;
      const hmdFlatRotation = localQuaternion2.setFromEuler(hmdEuler);

      const headPosition = localVector.copy(this.vrTransforms.head.position)
        .add(localVector2.copy(this.shoulder.eyes.position).multiplyScalar(-1).applyQuaternion(hmdRotation));
		  const neckPosition = headPosition.add(localVector2.copy(this.shoulder.head.position).multiplyScalar(-1).applyQuaternion(hmdRotation));
		  const chestPosition = neckPosition.add(localVector2.copy(this.shoulder.neck.position).multiplyScalar(-1).applyQuaternion(hmdFlatRotation));
		  const spinePosition = chestPosition.add(localVector2.copy(this.shoulder.transform.position).multiplyScalar(-1).applyQuaternion(hmdFlatRotation));
		  const hipsPosition = spinePosition.add(localVector2.copy(this.shoulder.spine.position).multiplyScalar(-1).applyQuaternion(hmdFlatRotation));

      this.shoulder.hips.position.copy(hipsPosition);
      this.shoulder.hips.quaternion.copy(hmdFlatRotation);
      Helpers.updateMatrix(this.shoulder.hips);
      this.shoulder.hips.matrixWorld.copy(this.shoulder.hips.matrix);
      Helpers.updateMatrixWorld(this.shoulder.spine);
      Helpers.updateMatrixWorld(this.shoulder.transform);
		}

		updateNeck() {
			const hmdRotation = localQuaternion.copy(this.vrTransforms.head.quaternion)
		    .multiply(z180Quaternion);
      const hmdFlatEuler = localEuler.setFromQuaternion(hmdRotation, 'YXZ');
      hmdFlatEuler.x = 0;
      hmdFlatEuler.z = 0;
      const hmdUpEuler = localEuler2.setFromQuaternion(hmdRotation, 'YXZ');
      hmdUpEuler.y = 0;

      this.shoulder.neck.quaternion.setFromEuler(hmdFlatEuler)
        .premultiply(Helpers.getWorldQuaternion(this.shoulder.neck.parent, localQuaternion).inverse());
      Helpers.updateMatrixMatrixWorld(this.shoulder.neck);

      this.shoulder.head.quaternion.setFromEuler(hmdUpEuler);
      Helpers.updateMatrixMatrixWorld(this.shoulder.head);

      Helpers.updateMatrixWorld(this.shoulder.eyes);
		}

		/* rotateLeftShoulder(shoulderRotation)
		{
			this.rotateShoulderUp(this.shoulder.leftShoulder, this.shoulder.leftArm, this.avatarTrackingReferences.leftHand, this.leftShoulderAnkerStartLocalPosition, 1, shoulderRotation);
		}

		rotateRightShoulder(shoulderRotation)
		{
			this.rotateShoulderUp(this.shoulder.rightShoulder, this.shoulder.rightArm, this.avatarTrackingReferences.rightHand, this.rightShoulderAnkerStartLocalPosition, -1, shoulderRotation);
		}

		rotateShoulderUp(shoulderSide, arm, targetHand, initialShoulderLocalPos, angleSign, shoulderRotation)
		{
			const initialShoulderPos = initialShoulderLocalPos.clone().applyMatrix4(this.shoulder.transform.matrixWorld);
			const handShoulderOffset = new Vector3().subVectors(targetHand.position, initialShoulderPos);
			const armLength = arm.armLength;

			const targetAngle = Vector3.zero;

		  const forwardDistanceRatio = Vector3.Dot(handShoulderOffset, Vector3.forward.applyQuaternion(shoulderRotation)) / armLength;
			const upwardDistanceRatio = Vector3.Dot(handShoulderOffset, Vector3.up.applyQuaternion(shoulderRotation)) / armLength;
			if (forwardDistanceRatio > 0)
			{
				targetAngle.y = Mathf.Clamp((forwardDistanceRatio - 0.5) * this.distinctShoulderRotationMultiplier, 0, this.distinctShoulderRotationLimitForward);
			}
			else
			{
				targetAngle.y = Mathf.Clamp(-(forwardDistanceRatio + 0.08) * this.distinctShoulderRotationMultiplier * 10, -this.distinctShoulderRotationLimitBackward, 0);
			}

			targetAngle.z = Mathf.Clamp(-(upwardDistanceRatio - 0.5) * this.distinctShoulderRotationMultiplier, -this.distinctShoulderRotationLimitUpward, 0);

      targetAngle.multiplyScalar(angleSign);

      shoulderSide.localRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(targetAngle.x * Mathf.Deg2Rad, targetAngle.y * Mathf.Deg2Rad, targetAngle.z * Mathf.Deg2Rad, Mathf.Order));
		}

		positionShoulder()
		{
			const headNeckOffset = this.headNeckDirectionVector.clone().applyQuaternion(this.avatarTrackingReferences.head.rotation);
			const targetPosition = new Vector3().addVectors(this.avatarTrackingReferences.head.position, headNeckOffset.clone().multiplyScalar(this.headNeckDistance));
			this.shoulder.transform.localPosition =
				new Vector3().addVectors(targetPosition, this.neckShoulderDistance);
		} */

		rotateShoulderBase()
		{
			let angleY = this.getCombinedDirectionAngleUp();

			// const targetRotation = new Vector3(0, angle, 0);

			/* if (this.autoDetectHandsBehindHead)
			{
				this.detectHandsBehindHead(targetRotation);
			} */

			/* if (this.clampRotationToHead)
			{ */
				angleY = this.clampHeadRotationDeltaUp(angleY);
			// }

			// this.shoulder.transform.eulerAngles = targetRotation;
			this.shoulder.transform.quaternion.setFromEuler(localEuler.set(0, angleY, 0, 'YXZ'))
			  .premultiply(Helpers.getWorldQuaternion(this.shoulder.transform.parent, localQuaternion).inverse());
			Helpers.updateMatrixMatrixWorld(this.shoulder.transform);
      Helpers.updateMatrixWorld(this.shoulder.leftShoulderAnchor);
      Helpers.updateMatrixWorld(this.shoulder.rightShoulderAnchor);
		}

		/* rotateShoulderRightBase(rotation)
		{

			const heightDiff = this.vrTransforms.head.position.y - this.poseManager.vrSystemOffsetHeight;
			const relativeHeightDiff = -heightDiff / this.poseManager.playerHeightHmd;

      const hmdRotation = this.vrTransforms.head.rotation;
      hmdRotation.multiply(z180Quaternion);
			const headRightRotation = VectorHelpers.getAngleBetween(this.shoulder.transform.forward,
										  new Vector3(0, 0, 1).applyQuaternion(hmdRotation),
										  Vector3.up, this.shoulder.transform.right) + this.rightRotationHeadRotationOffset;
			const heightFactor = Mathf.Clamp(relativeHeightDiff - this.rightRotationStartHeight, 0, 1);
			this.shoulderRightRotation = heightFactor * this.rightRotationHeightFactor;
			this.shoulderRightRotation += Mathf.Clamp(headRightRotation * this.rightRotationHeadRotationFactor * heightFactor, 0, 50);

            this.shoulderRightRotation = Mathf.Clamp(this.shoulderRightRotation, 0, 50);

			const deltaRot = Quaternion.AngleAxis(this.shoulderRightRotation, this.shoulder.transform.right);


			// this.shoulder.transform.rotation = new Quaternion().multiplyQuaternions(deltaRot,  this.shoulder.transform.rotation);
			return new Quaternion().multiplyQuaternions(deltaRot, rotation);
			// this.positionShoulderRelative();
		} */

		/* positionShoulderRelative()
		{
			const deltaRot = Quaternion.AngleAxis(this.shoulderRightRotation, this.shoulder.transform.right);
			const shoulderHeadDiff = new Vector3().subVectors(this.shoulder.transform.position, this.avatarTrackingReferences.head.position);
		  // this.shoulder.transform.position = new Vector3().addVectors(shoulderHeadDiff.clone().applyQuaternion(deltaRot), this.avatarTrackingReferences.head.position);
		} */

		getCombinedDirectionAngleUp()
		{
			const distanceLeftHand = localVector.subVectors(this.vrTransforms.leftHand.position, Helpers.getWorldPosition(this.shoulder.transform, localVector2));
			const distanceRightHand = localVector2.subVectors(this.vrTransforms.rightHand.position, Helpers.getWorldPosition(this.shoulder.transform, localVector3));

			/* if (this.ignoreYPos)
			{ */
				distanceLeftHand.y = 0;
				distanceRightHand.y = 0;
			// }

      const hmdEuler = localEuler.setFromQuaternion(this.vrTransforms.head.quaternion, 'YXZ');
      hmdEuler.x = 0;
      hmdEuler.z = 0;
      const hmdFlatRotation = localQuaternion.setFromEuler(hmdEuler);
      const hmdFlatRotationInverse = hmdFlatRotation.clone().inverse();

			const leftHandBehind = localVector3.copy(distanceLeftHand).applyQuaternion(hmdFlatRotationInverse);
			const leftBehind = leftHandBehind.z > 0;
			const rightHandBehind = localVector4.copy(distanceRightHand).applyQuaternion(hmdFlatRotationInverse);
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

			const directionLeftHand = distanceLeftHand.normalize();
			const directionRightHand = distanceRightHand.normalize();

			const combinedDirection = localVector.addVectors(directionLeftHand, directionRightHand);

			// console.log('combined', Mathf.Atan2(combinedDirection.x, combinedDirection.z) * 180 / Mathf.PI, combinedDirection.x, combinedDirection.z);

			return Math.atan2(combinedDirection.x, combinedDirection.z);
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

		clampHeadRotationDeltaUp(angleY)
		{
			const hmdRotation = localQuaternion.copy(this.vrTransforms.head.quaternion)
			  .multiply(z180Quaternion);

			const headUpRotation = (localEuler.setFromQuaternion(hmdRotation, 'YXZ').y + Math.PI*2) % (Math.PI*2);
			const targetUpRotation = (angleY + Math.PI*2) % (Math.PI*2);

			const delta = headUpRotation - targetUpRotation;

			if (delta > this.maxDeltaHeadRotation && delta < Math.PI || delta < -Math.PI && delta >= -Math.PI*2 + this.maxDeltaHeadRotation)
			{
				angleY = headUpRotation - this.maxDeltaHeadRotation;
				// this.clampingHeadRotation = true;
			}
			else if (delta < -this.maxDeltaHeadRotation && delta > -Math.PI || delta > Math.PI && delta < Math.PI*2 - this.maxDeltaHeadRotation)
			{
				angleY = headUpRotation + this.maxDeltaHeadRotation;
				// this.clampingHeadRotation = true;
			}
			/* else
			{
				this.clampingHeadRotation = false;
			} */
			return angleY;
		}

		/* clampShoulderHandDistance()
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
		} */
	}

export default ShoulderPoser;
