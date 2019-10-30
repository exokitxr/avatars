import {Vector3, Quaternion, Transform, Mathf} from './Unity.js';

class ArmTransforms
	{
		constructor() {
      this.transform = new Transform();
			this.upperArm = new Transform();
			this.lowerArm = new Transform();
			this.wrist1 = new Transform();
			this.wrist2 = new Transform();
			this.hand = new Transform();

      this.transform.AddChild(this.upperArm);
			this.upperArm.AddChild(this.lowerArm);
			// this.lowerArm.AddChild(this.wrist1);
			// this.lowerArm.AddChild(this.wrist2);
			this.lowerArm.AddChild(this.hand);

			this.armLengthByScale = false;
			this.scaleAxis = Vector3.one;
			this.scaleHandFactor = .7;

			this.poseManager = null;
		}

		get upperArmLength() {
			return this.distance(this.upperArm, this.lowerArm);
		}
		get lowerArmLength() {
			const result = this.distance(this.lowerArm, this.hand);
			/* console.log('lower arm length', result);
			if (result !== 0) {
				debugger;
			} */
			return result;
		}
		get armLength() {
			return this.upperArmLength + this.lowerArmLength;
		}

		distance(a, b) {
			return a.position.distanceTo(b.position);
		}

	  Start()
		{
			// PoseManager.Instance.onCalibrate += this.updateArmLengths;
			// this.updateArmLengths();
		}

		updateArmLengths()
		{
			const shoulderWidth = new Vector3().subVectors(this.upperArm.position, this.lowerArm.position).magnitude;
			const _armLength = (this.poseManager.playerWidthWrist - shoulderWidth) / 2;
			this.setArmLength(_armLength);
		}

		setUpperArmLength(length)
		{
			if (this.armLengthByScale)
			{
				const oldLowerArmLength = distance(this.lowerArm, this.hand);

				let newScale = new Vector3().subVectors(this.upperArm.localScale, this.scaleAxis.clone().multiplyScalar(Vector3.Scale(this.upperArm.localScale, this.scaleAxis).magnitude));
				const scaleFactor = Vector3.Scale(this.upperArm.localScale, this.scaleAxis).magnitude / upperArmLength * length;
				newScale += this.scaleAxis * scaleFactor;
				this.upperArm.localScale = newScale;

				this.setLowerArmLength(oldLowerArmLength);
			}
			else
			{
				const pos = this.lowerArm.localPosition;
				pos.x = Mathf.Sign(pos.x) * length;
				this.lowerArm.localPosition = pos;
			}
		}

		setLowerArmLength(length)
		{
			if (this.armLengthByScale)
			{
			}
			else
			{
				const pos = this.hand.localPosition;
				pos.x = Mathf.Sign(pos.x) * length;
				this.hand.localPosition = pos;
			}
		}

		setArmLength(length)
		{
			const upperArmFactor = .48;
			if (this.armLengthByScale)
			{
				this.upperArm.localScale = this.upperArm.localScale.clone().divideScalar(this.armLength).multiplyScalar(length);
				this.hand.localScale = Vector3.one.divideScalar(1 - (1 - this.scaleHandFactor) * (1 - this.upperArm.localScale.x));
			}
			else
			{
				this.setUpperArmLength(length * upperArmFactor);
				this.setLowerArmLength(length * (1 - upperArmFactor));
			}
		}
	}

export default ArmTransforms;
