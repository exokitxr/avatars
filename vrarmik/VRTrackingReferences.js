import {Transform} from './Unity.js';

  class VRTrackingReferences {
    constructor() {
      /* this.leftController = new Transform();
      this.rightController = new Transform();
      this.hmd = new Transform(); */
      /* this.hmd.onchange = () => {
        console.log('change 1', new Error().stack);
      }; */
      this.leftHand = new Transform();
      this.leftHand.pointer = 0;
      this.leftHand.grip = 0;
      this.rightHand = new Transform();
      this.rightHand.pointer = 0;
      this.rightHand.grip = 0;
      this.head = new Transform();
      /* this.head.onchange = () => {
        console.log('change 2', new Error().stack);
      }; */
    }
	}

export default VRTrackingReferences;
