import {Vector3, Quaternion, Transform, GameObject, MonoBehavior, Time, Mathf} from './Unity.js';
import ArmTransforms from './ArmTransforms.js';
import ShoulderTransforms from './ShoulderTransforms.js';
import ShoulderPoser from './ShoulderPoser.js';
import VectorHelpers from './Utils/VectorHelpers.js';
import PoseManager from './PoseManager.js';

class ArmIKElbowSettings
{
	constructor() {
		this.calcElbowAngle = true;
		this.clampElbowAngle = true;
		this.softClampElbowAngle = true;
		this.maxAngle = 175;
		this.minAngle = 13;
		this.softClampRange = 10;
		this.offsetAngle = 135;
		this.yWeight = -60;
		this.zWeightTop = 260;
		this.zWeightBottom = -100;
		this.zBorderY = -.25;
		this.zDistanceStart = .6;
		this.xWeight = -50;
		this.xDistanceStart = .1;
	}
}

class BeforePositioningSettings
{
	constructor() {
		this.correctElbowOutside = true;
		this.weight = -0.5;
		this.startBelowZ = .4;
		this.startAboveY = 0.1;
	}
}

class ElbowCorrectionSettings
{
	constructor() {
		this.useFixedElbowWhenNearShoulder = true;
		this.startBelowDistance = .5;
		this.startBelowY = 0.1;
		this.weight = 2;
		this.localElbowPos = new Vector3(0.3, -1, -2);
	}
}

class HandSettings
{
	constructor() {
		this.useWristRotation = true;
		this.rotateElbowWithHandRight = true;
		this.rotateElbowWithHandForward = true;
		this.handDeltaPow = 1.5;
		this.handDeltaFactor = -.3;
		this.handDeltaOffset = 45;
		// todo fix rotateElbowWithHandForward with factor != 1 -> horrible jumps. good value would be between [0.4, 0.6]
		this.handDeltaForwardPow = 2;
		this.handDeltaForwardFactor = 1;
		this.handDeltaForwardOffset = 0;
		this.handDeltaForwardDeadzone = .3;
		this.rotateElbowWithHandDelay = .08;
	}
}

function toSignedEulerAngle(n)
{
  let result = toPositiveEulerAngle(n);
  if (result > 180)
    result = result - 360;
  return result;
}
function toPositiveEulerAngle(n)
{
  const result = (n % 360 + 360) % 360;
  return result;
}

	class VRArmIK extends MonoBehavior
	{
		constructor(...args) {
      super(...args);

			this.arm = this.GetOrAddComponent(ArmTransforms);
			this.shoulder = null;
			this.shoulderPoser = null;
			this.target = new Transform();
			this.left = true;

			this.elbowSettings = new ArmIKElbowSettings();
			this.beforePositioningSettings = new BeforePositioningSettings();
			this.elbowCorrectionSettings = new ElbowCorrectionSettings();
			this.handSettings = new HandSettings();

			this.nextLowerArmAngle = new Vector3();

		  this.upperArmStartRotation = new Quaternion();
		  this.lowerArmStartRotation = new Quaternion();
		  this.wristStartRotation = new Quaternion();
		  this.handStartRotation = new Quaternion();

			this.interpolatedDeltaElbow = 0;
      this.interpolatedDeltaElbowForward = 0;
    }

		Awake()
		{
			this.upperArmStartRotation = this.arm.upperArm.rotation;
			this.lowerArmStartRotation = this.arm.lowerArm.rotation;
			this.wristStartRotation = Quaternion.identity;
			if (this.arm.wrist1 !== null)
				this.wristStartRotation = this.arm.wrist1.rotation;
			this.handStartRotation = this.arm.hand.rotation;
		}

		OnEnable()
		{
			this.setUpperArmRotation(Quaternion.identity);
			this.setLowerArmRotation(Quaternion.identity);
			this.setHandRotation(Quaternion.identity);
		}

		LateUpdate()
		{
			this.updateUpperArmPosition();
			this.calcElbowInnerAngle();
			this.rotateShoulder();
			this.correctElbowRotation();

			if (this.elbowSettings.calcElbowAngle)
			{
				this.positionElbow();
				if (this.elbowCorrectionSettings.useFixedElbowWhenNearShoulder)
					this.correctElbowAfterPositioning();
				if (this.handSettings.rotateElbowWithHandRight)
					this.rotateElbowWithHandRight();
				if (this.handSettings.rotateElbowWithHandForward)
					this.rotateElbowWithHandFoward();
				this.rotateHand();
			}
		}

		updateArmAndTurnElbowUp()
		{
			this.updateUpperArmPosition();
			this.calcElbowInnerAngle();
			this.rotateShoulder();
			this.correctElbowRotation();
		}

		updateUpperArmPosition()
		{
			//this.arm.upperArm.position = this.shoulderAnker.position;
		}

		calcElbowInnerAngle()
		{
		  const eulerAngles = new Vector3();
			const targetShoulderDistance = new Vector3().subVectors(this.target.position, this.upperArmPos).magnitude;
			let innerAngle;

			if (targetShoulderDistance > this.arm.armLength)
			{
				innerAngle = 0;
			}
			else
			{
				innerAngle = Mathf.Acos(Mathf.Clamp((Mathf.Pow(this.arm.upperArmLength, 2) + Mathf.Pow(this.arm.lowerArmLength, 2) -
												Mathf.Pow(targetShoulderDistance, 2)) / (2 * this.arm.upperArmLength * this.arm.lowerArmLength), -1, 1)) * Mathf.Rad2Deg;
				// console.log('inner handle', this.target.position.toArray().join(','), this.upperArmPos.toArray().join(','));
				if (this.left)
					innerAngle = 180 - innerAngle;
				else
					innerAngle = 180 + innerAngle;
				if (isNaN(innerAngle))
				{
					innerAngle = 180;
				}
			}

			eulerAngles.y = innerAngle;
			this.nextLowerArmAngle = eulerAngles;
		}

		//source: https://github.com/NickHardeman/ofxIKArm/blob/master/src/ofxIKArm.cpp
		rotateShoulder()
		{
      const eulerAngles = new Vector3();
      const targetShoulderDirection = new Vector3().subVectors(this.target.position, this.upperArmPos).normalized;
      const targetShoulderDistance = new Vector3().subVectors(this.target.position, this.upperArmPos).magnitude;

      eulerAngles.y = (this.left ? -1 : 1) *
              Mathf.Acos(Mathf.Clamp((Mathf.Pow(targetShoulderDistance, 2) + Mathf.Pow(this.arm.upperArmLength, 2) -
                                      Mathf.Pow(this.arm.lowerArmLength, 2)) / (2 * targetShoulderDistance * this.arm.upperArmLength), -1, 1)) * Mathf.Rad2Deg;
      if (isNaN(eulerAngles.y))
              eulerAngles.y = 0;


      const shoulderRightOffset = this.target.position.sub(this.upperArmPos);
      const shoulderRightRotation = new Quaternion().setFromRotationMatrix(
      	new THREE.Matrix4().lookAt(
	      	new Vector3(),
	      	shoulderRightOffset,
	      	new Vector3(0, 1, 0)
	      )
      ).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (this.left ? -1 : 1) * Math.PI/2));

      // const shoulderRightRotation = new Quaternion().setFromUnitVectors(this.armDirection, targetShoulderDirection);
      this.setUpperArmRotation(shoulderRightRotation);
      this.arm.upperArm.rotation = new Quaternion().multiplyQuaternions(Quaternion.AngleAxis(eulerAngles.y, Vector3.up.applyQuaternion(this.lowerArmRotation)), this.arm.upperArm.rotation);
      this.setLowerArmLocalRotation(Quaternion.Euler(this.nextLowerArmAngle));
		}

		getElbowTargetAngle()
		{
			const localHandPosNormalized = this.shoulderAnker.InverseTransformPoint(this.handPos).divideScalar(this.arm.armLength);

			// angle from Y
			let angle = this.elbowSettings.yWeight * localHandPosNormalized.y + this.elbowSettings.offsetAngle;

			// angle from Z
			/*angle += Mathf.Lerp(elbowSettings.zWeightBottom, elbowSettings.zWeightTop, Mathf.Clamp01((localHandPosNormalized.y + 1f) - elbowSettings.zBorderY)) *
					 (Mathf.Max(elbowSettings.zDistanceStart - localHandPosNormalized.z, 0f));*/
			if (localHandPosNormalized.y > 0)
				angle += this.elbowSettings.zWeightTop * (Mathf.Max(this.elbowSettings.zDistanceStart - localHandPosNormalized.z, 0) * Mathf.Max(localHandPosNormalized.y, 0));
			else
				angle += this.elbowSettings.zWeightBottom * (Mathf.Max(this.elbowSettings.zDistanceStart - localHandPosNormalized.z, 0) * Mathf.Max(-localHandPosNormalized.y, 0));


			// angle from X
			angle += this.elbowSettings.xWeight * Mathf.Max(localHandPosNormalized.x * (this.left ? 1.0 : -1.0) + this.elbowSettings.xDistanceStart, 0);

			if (this.elbowSettings.clampElbowAngle)
			{
				if (this.elbowSettings.softClampElbowAngle)
				{
					if (angle < this.elbowSettings.minAngle + this.elbowSettings.softClampRange)
					{
						const a = this.elbowSettings.minAngle + this.elbowSettings.softClampRange - angle;
						angle = this.elbowSettings.minAngle + this.elbowSettings.softClampRange * (1 - Mathf.Log(1 + a) * 3);
					}
				}
				else
				{
					angle = Mathf.Clamp(angle, this.elbowSettings.minAngle, this.elbowSettings.maxAngle);
				}
			}

			if (this.left)
				angle *= -1;

			return angle;
		}

		correctElbowRotation()
		{
			const s = this.beforePositioningSettings;

			const localTargetPos = this.shoulderAnker.InverseTransformPoint(this.target.position).divideScalar(this.arm.armLength);
			const elbowOutsideFactor = Mathf.Clamp01(
									 Mathf.Clamp01((s.startBelowZ - localTargetPos.z) /
												   Mathf.Abs(s.startBelowZ) * .5) *
									 Mathf.Clamp01((localTargetPos.y - s.startAboveY) /
												   Mathf.Abs(s.startAboveY)) *
									 Mathf.Clamp01(1 - localTargetPos.x * (this.left ? -1 : 1))
								 ) * s.weight;

			const shoulderHandDirection = new Vector3().subVectors(this.upperArmPos, this.handPos).normalized;
		  const targetDir = new Vector3().addVectors(Vector3.up, (s.correctElbowOutside ? new Vector3().addVectors(this.armDirection, Vector3.forward.multiplyScalar(-.2)).multiplyScalar(elbowOutsideFactor) : Vector3.zero)).applyQuaternion(this.shoulder.transform.rotation);
			const cross = Vector3.Cross(shoulderHandDirection, targetDir.clone().multiplyScalar(1000));

			const upperArmUp = Vector3.up.applyQuaternion(this.upperArmRotation);

			const elbowTargetUp = Vector3.Dot(upperArmUp, targetDir);
			const elbowAngle = (cross.equals(Vector3.zero) ? 0 : Vector3.Angle(cross, upperArmUp)) + (this.left ? 0 : 180);
			const rotation = Quaternion.AngleAxis(elbowAngle * Mathf.Sign(elbowTargetUp), shoulderHandDirection);
			this.arm.upperArm.rotation = new Quaternion().multiplyQuaternions(rotation, this.arm.upperArm.rotation);
		}

		/// <summary>
		/// reduces calculation problems when hand is moving around shoulder XZ coordinates -> forces elbow to be outside of body
		/// </summary>
		correctElbowAfterPositioning()
		{
			const s = this.elbowCorrectionSettings;
			const localTargetPos = this.shoulderAnker.InverseTransformPoint(this.target.position).divideScalar(this.arm.armLength);
			const shoulderHandDirection = new Vector3().subVectors(this.upperArmPos, this.handPos).normalized;
			const elbowPos = s.localElbowPos;

			if (this.left)
				elbowPos.x *= -1;

			const targetDir = elbowPos.normalized.applyQuaternion(this.shoulder.transform.rotation);
  		const cross = Vector3.Cross(shoulderHandDirection, targetDir);

			const upperArmUp = Vector3.up.applyQuaternion(this.upperArmRotation);


			let distance = new Vector3().subVectors(this.target.position, this.upperArmPos);
			distance = this.shoulder.transform.InverseTransformDirection(distance.clone().divideScalar(distance.magnitude)).multiplyScalar(distance.magnitude);

			const weight = Mathf.Clamp01(Mathf.Clamp01((s.startBelowDistance - distance.xz().magnitude / this.arm.armLength) /
						   s.startBelowDistance) * s.weight + Mathf.Clamp01((-distance.z + .1) * 3)) *
						   Mathf.Clamp01((s.startBelowY - localTargetPos.y) /
										 s.startBelowY);

		  const elbowTargetUp = Vector3.Dot(upperArmUp, targetDir);
  		const elbowAngle2 = Vector3.Angle(cross, upperArmUp) + (this.left ? 0 : 180);
			const rotation = Quaternion.AngleAxis(toSignedEulerAngle(elbowAngle2 * Mathf.Sign(elbowTargetUp)) * Mathf.Clamp(weight, 0, 1), shoulderHandDirection);
			this.arm.upperArm.rotation = new Quaternion().multiplyQuaternions(rotation, this.arm.upperArm.rotation);
		}

		rotateElbow(angle)
		{
			const shoulderHandDirection = new Vector3().subVectors(this.upperArmPos, this.handPos).normalized;

			const rotation = Quaternion.AngleAxis(angle, shoulderHandDirection);
			this.setUpperArmRotation(new Quaternion().multiplyQuaternions(rotation, this.upperArmRotation));
		}

		//source: https://github.com/NickHardeman/ofxIKArm/blob/master/src/ofxIKArm.cpp
		positionElbow()
		{
			const targetElbowAngle = this.getElbowTargetAngle();
			this.rotateElbow(targetElbowAngle);
		}


		rotateElbowWithHandRight()
		{
			const s = this.handSettings;
			let handUpVec = Vector3.up.applyQuaternion(this.target.rotation);
			const forwardAngle = VectorHelpers.getAngleBetween(Vector3.right.applyQuaternion(this.lowerArmRotation), Vector3.right.applyQuaternion(this.target.rotation),
				Vector3.up.applyQuaternion(this.lowerArmRotation), Vector3.forward.applyQuaternion(this.lowerArmRotation));

			// todo reduce influence if hand local forward rotation is high (hand tilted inside)
			const handForwardRotation = Quaternion.AngleAxis(-forwardAngle, Vector3.forward.applyQuaternion(this.lowerArmRotation));
			handUpVec = handUpVec.applyQuaternion(handForwardRotation);

			const elbowTargetAngle = VectorHelpers.getAngleBetween(Vector3.up.applyQuaternion(this.lowerArmRotation), handUpVec,
				Vector3.forward.applyQuaternion(this.lowerArmRotation), this.armDirection.clone().applyQuaternion(this.lowerArmRotation));

			let deltaElbow = (elbowTargetAngle + (this.left ? -s.handDeltaOffset : s.handDeltaOffset)) / 180;

			deltaElbow = Mathf.Sign(deltaElbow) * Mathf.Pow(Mathf.Abs(deltaElbow), s.handDeltaPow) * 180 * s.handDeltaFactor;
			this.interpolatedDeltaElbow =
				Mathf.LerpAngle(this.interpolatedDeltaElbow, deltaElbow, Time.deltaTime / s.rotateElbowWithHandDelay);
			this.rotateElbow(this.interpolatedDeltaElbow);
		}

		rotateElbowWithHandFoward()
		{
			const s = this.handSettings;
			const handRightVec = this.armDirection.clone().applyQuaternion(this.target.rotation);

		  const elbowTargetAngleForward = VectorHelpers.getAngleBetween(this.armDirection.clone().applyQuaternion(this.lowerArmRotation), handRightVec,
				Vector3.up.applyQuaternion(this.lowerArmRotation), Vector3.forward.applyQuaternion(this.lowerArmRotation));

			let deltaElbowForward = (elbowTargetAngleForward + (this.left ? -s.handDeltaForwardOffset : s.handDeltaForwardOffset)) / 180;

			if (Mathf.Abs(deltaElbowForward) < s.handDeltaForwardDeadzone)
				deltaElbowForward = 0;
			else
			{
				deltaElbowForward = (deltaElbowForward - Mathf.Sign(deltaElbowForward) * s.handDeltaForwardDeadzone) / (1 - s.handDeltaForwardDeadzone);
			}

			deltaElbowForward = Mathf.Sign(deltaElbowForward) * Mathf.Pow(Mathf.Abs(deltaElbowForward), s.handDeltaForwardPow) * 180;
			this.interpolatedDeltaElbowForward = Mathf.LerpAngle(this.interpolatedDeltaElbowForward, deltaElbowForward, Time.deltaTime / s.rotateElbowWithHandDelay);

			const signedInterpolated = toSignedEulerAngle(this.interpolatedDeltaElbowForward);
			this.rotateElbow(signedInterpolated * s.handDeltaForwardFactor);
		}

		rotateHand()
		{
			if (this.handSettings.useWristRotation)
			{
				let handUpVec = Vector3.up.applyQuaternion(this.target.rotation);
				const forwardAngle = VectorHelpers.getAngleBetween(Vector3.right.applyQuaternion(this.lowerArmRotation), Vector3.right.applyQuaternion(this.target.rotation),
					Vector3.up.applyQuaternion(this.lowerArmRotation), Vector3.forward.applyQuaternion(this.lowerArmRotation));

				// todo reduce influence if hand local forward rotation is high (hand tilted inside)
				const handForwardRotation = Quaternion.AngleAxis(-forwardAngle, Vector3.forward.applyQuaternion(this.lowerArmRotation));
				handUpVec = handUpVec.applyQuaternion(handForwardRotation);

				let elbowTargetAngle = VectorHelpers.getAngleBetween(Vector3.up.applyQuaternion(this.lowerArmRotation), handUpVec,
					Vector3.forward.applyQuaternion(this.lowerArmRotation), this.armDirection.clone().applyQuaternion(this.lowerArmRotation));

				elbowTargetAngle = Mathf.Clamp(elbowTargetAngle, -90, 90);
				if (this.arm.wrist1 !== null)
					this.setWrist1Rotation(new Quaternion().multiplyQuaternions(Quaternion.AngleAxis(elbowTargetAngle * .3, this.armDirection.clone().applyQuaternion(this.lowerArmRotation)), this.lowerArmRotation));
				if (this.arm.wrist2 !== null)
					this.setWrist2Rotation(new Quaternion().multiplyQuaternions(Quaternion.AngleAxis(elbowTargetAngle * .8, this.armDirection.clone().applyQuaternion(this.lowerArmRotation)), this.lowerArmRotation));
			}
			const targetRotation = this.target.rotation;
			this.setHandRotation(targetRotation);
		}

		removeShoulderRightRotation(direction) {
			return this.direction.clone().applyQuaternion(Quaternion.AngleAxis(-this.shoulderPoser.shoulderRightRotation, this.shoulder.transform.right));
		}

		get armDirection() {
			return this.left ? Vector3.left : Vector3.right;
		}
		get upperArmPos() {
			return this.arm.upperArm.position;
		}
		get lowerArmPos() {
			return this.arm.lowerArm.position;
		}
		get handPos() {
			return this.arm.hand.position;
		}
		get shoulderAnker() {
			return this.left ? this.shoulder.leftShoulderAnchor : this.shoulder.rightShoulderAnchor;
		}

		get upperArmRotation() {
			return new Quaternion().multiplyQuaternions(this.arm.upperArm.rotation, Quaternion.Inverse(this.upperArmStartRotation));
		}
		get lowerArmRotation() {
			return new Quaternion().multiplyQuaternions(this.arm.lowerArm.rotation, Quaternion.Inverse(this.lowerArmStartRotation));
		}
		get handRotation() {
			return new Quaternion().multiplyQuaternions(this.arm.hand.rotation, Quaternion.Inverse(this.handStartRotation));
		}

		setUpperArmRotation(rotation) {
			return this.arm.upperArm.rotation = new Quaternion().multiplyQuaternions(rotation, this.upperArmStartRotation);
		}
		setLowerArmRotation(rotation) {
			return this.arm.lowerArm.rotation = new Quaternion().multiplyQuaternions(rotation, this.lowerArmStartRotation);
		}
		setLowerArmLocalRotation(rotation) {
			return this.arm.lowerArm.rotation = new Quaternion().multiplyQuaternions(new Quaternion().multiplyQuaternions(this.upperArmRotation, rotation), this.lowerArmStartRotation);
		}
		setWrist1Rotation(rotation) {
			return this.arm.wrist1.rotation = new Quaternion().multiplyQuaternions(rotation, this.wristStartRotation);
		}
		setWrist2Rotation(rotation) {
			return this.arm.wrist2.rotation = new Quaternion().multiplyQuaternions(rotation, this.wristStartRotation);
		}
		setWristLocalRotation(rotation) {
			return this.arm.wrist1.rotation = new Quaternion().multiplyQuaternions(new Quaternion().multiplyQuaternions(this.arm.lowerArm.rotation, rotation), this.wristStartRotation);
    }
		setHandRotation(rotation) {
			return this.arm.hand.rotation = /* this.arm.hand.rotation = */ new Quaternion().multiplyQuaternions(rotation, this.handStartRotation);
		}
	}

export default VRArmIK;
