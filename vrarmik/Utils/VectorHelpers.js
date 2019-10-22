import {Vector3, Mathf} from '../Unity.js';

const VectorHelpers = {
	axisAngle(v, forward, axis)
	{
		const right = Vector3.Cross(axis, forward);
		forward = Vector3.Cross(right, axis);
		return Mathf.Atan2(Vector3.Dot(v, right), Vector3.Dot(v, forward)) * Mathf.Rad2Deg;
	},
  getAngleBetween(a, b, forward, axis)
	{
		const angleA = this.axisAngle(a, forward, axis);
		const angleB = this.axisAngle(b, forward, axis);

		return Mathf.DeltaAngle(angleA, angleB);
	},
};

export default VectorHelpers;
