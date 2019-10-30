import {Vector3, Transform} from './Unity.js';
import ArmTransforms from './ArmTransforms.js';
import ShoulderPoser from './ShoulderPoser.js';
import VRArmIK from './VRArmIK.js';
import PoseManager from './PoseManager.js';


class ShoulderTransforms
	{
		constructor(rig) {
      this.transform = new Transform();
      this.hips = new Transform();
      this.spine = new Transform();
      this.neck = new Transform();
      this.head = new Transform();
      this.eyes = new Transform();

      this.hips.AddChild(this.spine);
      this.spine.AddChild(this.transform);
      this.transform.AddChild(this.neck);
      this.neck.AddChild(this.head);
      this.head.AddChild(this.eyes);

			this.leftShoulder = new Transform();
			this.transform.AddChild(this.leftShoulder);

			this.rightShoulder = new Transform();
			this.transform.AddChild(this.rightShoulder);
			/* this.leftShoulderRenderer = new Transform();
			this.rightShoulderRenderer = new Transform(); */
			this.leftShoulderAnchor = new Transform();
			this.transform.AddChild(this.leftShoulderAnchor);
			this.rightShoulderAnchor = new Transform();
			this.transform.AddChild(this.rightShoulderAnchor);

			this.leftArm = new ArmTransforms();
			this.leftArm.poseManager = rig.poseManager;
			this.rightArm = new ArmTransforms();
			this.rightArm.poseManager = rig.poseManager;

			this.leftShoulderAnchor.AddChild(this.leftArm.transform);
			this.rightShoulderAnchor.AddChild(this.rightArm.transform);

			this.shoulderPoser = new ShoulderPoser(rig, this);

			this.leftArmIk = new VRArmIK(this.leftArm);
			this.leftArmIk.shoulder = this;
			this.leftArmIk.shoulderPoser = this.shoulderPoser;
			this.leftArmIk.target = this.leftArmIk.shoulderPoser.avatarTrackingReferences.leftHand;

			this.rightArmIk = new VRArmIK(this.rightArm);
			this.rightArmIk.shoulder = this;
			this.rightArmIk.shoulderPoser = this.shoulderPoser;
			this.rightArmIk.target = this.rightArmIk.shoulderPoser.avatarTrackingReferences.rightHand;
			this.rightArmIk.left = false;
		}

		Start()
		{
			// this.setShoulderWidth(PoseManager.Instance.playerWidthShoulders);

			this.leftArm.Start();
			this.rightArm.Start();
			this.shoulderPoser.Start();
			this.leftArmIk.Start();
			this.rightArmIk.Start();
		}

		Update() {
			this.shoulderPoser.Update();
			this.leftArmIk.Update();
			this.rightArmIk.Update();
		}

		/* setShoulderWidth(width)
		{
			const localScale = new Vector3(width * .5, .05, .05);
			const localPosition = new Vector3(width * .25, 0, 0);

			leftShoulderRenderer.localScale = localScale;
			leftShoulderRenderer.localPosition = localPosition.clone().multiplyScalar(-1);

			rightShoulderRenderer.localScale = localScale;
			rightShoulderRenderer.localPosition = localPosition;
		} */
	}

export default ShoulderTransforms;
