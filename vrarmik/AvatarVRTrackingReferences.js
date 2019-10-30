import {Vector3, Transform} from './Unity.js';

	class AvatarVRTrackingReferences
	{
		constructor(poseManager) {
      this.head = poseManager.vrTransforms.head;
      this.leftHand = poseManager.vrTransforms.leftHand;
      this.rightHand = poseManager.vrTransforms.rightHand;
		}
	}

export default AvatarVRTrackingReferences;
