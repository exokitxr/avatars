import {Vector3, Quaternion, Transform} from './Unity.js';

const EulerOrder = {
	XYZ: 'XYZ',
	XZY: 'XZY',
	YXZ: 'YXZ',
	YZX: 'YZX',
	ZXY: 'ZXY',
	ZYX: 'ZYX',
};

class StaticOffsetTransform
	{
		constructor() {
      this.transform = new Transform();

			this.reference = null;
			this.offsetPosition = new Vector3();
			this.offsetRotation = new Vector3();
			this.orientationalOffset = new Vector3();
			this.referenceRotationMultiplicator = Vector3.one;

			this.axisOrder = EulerOrder.XYZ;

			this.referenceLocalPosition = false;
			this.referenceLocalRotation = false;
			this.applyLocalPosition = false;
			this.applyLocalRotation = false;
			this.applyPosition = true;
			this.applyRotation = true;
			this.applyForwardOffsetAfterRotationOffset = false;
    }

		switchAxis(r, order)
		{
			switch (order)
			{
				case EulerOrder.XYZ:
					return new Vector3(r.x, r.y, r.z);
				case EulerOrder.XZY:
					return new Vector3(r.x, r.z, r.y);
				case EulerOrder.YXZ:
					return new Vector3(r.y, r.x, r.z);
				case EulerOrder.YZX:
					return new Vector3(r.y, r.z, r.x);
				case EulerOrder.ZXY:
					return new Vector3(r.z, r.x, r.y);
				case EulerOrder.ZYX:
					return new Vector3(r.z, r.y, r.x);

				default:
					return r;
			}
		}

		/* Awake()
		{
			this.updatePosition();
		} */

		Update()
		{
			this.updatePosition();
		}

		updatePosition()
		{
			if (this.reference === null)
				return;

			const rot = new Vector3().addVectors(this.switchAxis(this.referenceLocalRotation ? this.reference.localEulerAngles : this.reference.eulerAngles, this.axisOrder),
			              this.offsetRotation);
			rot.multiply(this.referenceRotationMultiplicator);

			const pos = this.referenceLocalPosition ? this.reference.localPosition : this.reference.position;


			if (this.applyForwardOffsetAfterRotationOffset)
			{
				pos.add(Vector3.right.applyQuaternion(Quaternion.Euler(rot)).multiplyScalar(this.orientationalOffset.x));
				pos.add(Vector3.up.applyQuaternion(Quaternion.Euler(rot)).multiplyScalar(this.orientationalOffset.y));
				pos.add(Vector3.forward.applyQuaternion(Quaternion.Euler(rot)).multiplyScalar(this.orientationalOffset.z));
			}
			else
			{
				pos.add(this.reference.right.multiplyScalar(this.orientationalOffset.x));
				pos.add(this.reference.up.multiplyScalar(this.orientationalOffset.y));
				pos.add(this.reference.forward.multiplyScalar(this.orientationalOffset.z));
			}

			pos.add(this.offsetPosition);

			if (this.applyPosition)
			{
				if (this.applyLocalPosition)
				{
					this.transform.localPosition = pos;
				}
				else
				{
					this.transform.position = pos;
				}
			}


			if (this.applyRotation)
			{
				if (this.applyLocalRotation)
				{
					this.transform.localEulerAngles = rot;
				}
				else
				{
					this.transform.eulerAngles = rot;
				}
			}
		}
	}

export default StaticOffsetTransform;
