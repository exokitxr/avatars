import VRTrackingReferences from './VRTrackingReferences.js';
import AvatarVRTrackingReferences from './AvatarVRTrackingReferences.js';
import {GameObject, MonoBehavior, XRSettings} from './Unity.js';

class PoseManager extends MonoBehavior
	{
		constructor(...args) {
      super(...args);

			this.vrTransforms = new GameObject().AddComponent(VRTrackingReferences);
			this.avatarVrTransforms = new GameObject().AddComponent(AvatarVRTrackingReferences);
		  // this.OnCalibrateListener = null;

      // Oculus uses a different reference position -> 0 is the reference head position if the user is standing in the middle of the room. 
      // In OpenVR, the 0 position is the ground position and the user is then at (0, playerHeightHmd, 0) if he is in the middle of the room, so I need to correct this for shoulder calculation 
      this.vrSystemOffsetHeight = 0.0;

			this.referencePlayerHeightHmd = 1.7;
			this.referencePlayerWidthWrist = 1.39;
			this.playerHeightHmd = 1.70;
			this.playerWidthWrist = 1.39;
			this.playerWidthShoulders = 0.31;
      this.loadPlayerSizeOnAwake = false;

      this.flipZ = false;
      this.flipY = false;

      PoseManager.Instance = this;
    }

		/* OnEnable()
		{
			if (PoseManager.Instance === null)
			{
				PoseManager.Instance = this;
			}
			else if (PoseManager.Instance !== null)
			{
				Debug.LogError("Multiple Instances of PoseManager in Scene");
			}
		} */

		Awake()
		{
            if (this.loadPlayerSizeOnAwake)
            {
                this.loadPlayerSize();
            }
            const device = XRSettings.loadedDeviceName;
            this.vrSystemOffsetHeight = /*string.IsNullOrEmpty(device) || */device == "OpenVR" ? 0 : this.playerHeightHmd;
        }

		/* Start()
		{
			onCalibrate += OnCalibrate;
		}

		OnCalibrate()
		{
			this.playerHeightHmd = Camera.main.transform.position.y;
		} */

		loadPlayerWidthShoulders()
		{
			this.playerWidthShoulders = PlayerPrefs.GetFloat("VRArmIK_PlayerWidthShoulders", 0.31);
		}

		savePlayerWidthShoulders(width)
		{
			PlayerPrefs.SetFloat("VRArmIK_PlayerWidthShoulders", width);
		}

		/* calibrateIK()
		{
			this.playerWidthWrist = (this.vrTransforms.leftHand.position - this.vrTransforms.rightHand.position).magnitude;
			this.playerHeightHmd = this.vrTransforms.hmd.position.y;
			this.savePlayerSize(this.playerHeightHmd, this.playerWidthWrist);
		}

		savePlayerSize(heightHmd, widthWrist)
		{
			PlayerPrefs.SetFloat("VRArmIK_PlayerHeightHmd", this.heightHmd);
			PlayerPrefs.SetFloat("VRArmIK_PlayerWidthWrist", this.widthWrist);
			this.loadPlayerSize();
			this.onCalibrate && this.onCalibrate.Invoke();
		} */

		loadPlayerSize()
		{
			this.playerHeightHmd = PlayerPrefs.GetFloat("VRArmIK_PlayerHeightHmd", this.referencePlayerHeightHmd);
			this.playerWidthWrist = PlayerPrefs.GetFloat("VRArmIK_PlayerWidthWrist", this.referencePlayerWidthWrist);
		}
	}
	PoseManager.Instance = null;

export default PoseManager;
