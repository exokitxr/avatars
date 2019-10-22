import {Vector3, Transform, GameObject, MonoBehavior} from './Unity.js';
import ArmTransforms from './ArmTransforms.js';
import ShoulderPoser from './ShoulderPoser.js';
import VRArmIK from './VRArmIK.js';
import PoseManager from './PoseManager.js';


class ShoulderTransforms extends MonoBehavior
	{
		constructor(...args) {
      super(...args);

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

			this.leftArm = new GameObject().AddComponent(ArmTransforms);
			this.rightArm = new GameObject().AddComponent(ArmTransforms);

			this.leftShoulderAnchor.AddChild(this.leftArm.transform);
			this.rightShoulderAnchor.AddChild(this.rightArm.transform);
		}

		OnEnable()
		{
			const shoulderPoser = this.GetComponent(ShoulderPoser);
			{
				const armIk = this.leftArm.GetComponentInChildren(VRArmIK);
				armIk.shoulder = this;
				armIk.shoulderPoser = shoulderPoser;
				armIk.target = armIk.shoulderPoser.avatarTrackingReferences.leftHand.transform;
			}
			{
				const armIk = this.rightArm.GetComponentInChildren(VRArmIK);
				armIk.shoulder = this;
				armIk.shoulderPoser = shoulderPoser;
				armIk.target = armIk.shoulderPoser.avatarTrackingReferences.rightHand.transform;
				armIk.left = false;
			}
		}

		/* Start()
		{
			this.setShoulderWidth(PoseManager.Instance.playerWidthShoulders);
		}

		setShoulderWidth(width)
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
