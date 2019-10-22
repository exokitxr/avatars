import {Transform, MonoBehavior} from './Unity.js';

  class VRTrackingReferences extends MonoBehavior
	{
    constructor(...args) {
      super(...args);

      /* this.leftController = new Transform();
      this.rightController = new Transform();
      this.hmd = new Transform(); */
      /* this.hmd.onchange = () => {
        console.log('change 1', new Error().stack);
      }; */
      this.leftHand = new Transform();
      this.rightHand = new Transform();
      this.head = new Transform();
      /* this.head.onchange = () => {
        console.log('change 2', new Error().stack);
      }; */
    }
	}

export default VRTrackingReferences;
