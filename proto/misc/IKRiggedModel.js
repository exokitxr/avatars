// wip exokit integration layer

import RiggedModel from './RiggedModel.js';
import THREE from './ephemeral-three.js';

//TODO: TOREMOVE -- this attempts backwards-compatibility with existing branch's riggedmodeltest.html mods
class LegacyRiggedModel extends RiggedModel {
  constructor(skeleton, options) {
    if (options && options.resource) Object.assign(options, options.resource);
    super(skeleton, options);
    this.backup.meta = this.backup.metrics;
  }
  fallback() {}
  rebind(group) {
      console[group === this.group ? 'warn' : 'error']('rig.rebind deprecated; pass { group } into ctor options instead.');
  }
};
try {
  const LEGACYMODE = true; // /riggedmodeltest/.test(location.href);
  if (LEGACYMODE) Object.assign(self, { RiggedModel: LegacyRiggedModel });
} catch(e) {}
//////TOREMOVE

const VERSION = RiggedModel.version + '/0.0.0';
class RiggedAvatarModel extends RiggedModel {
  static get version() { return VERSION }
  constructor(avatarModel, options) {
      console.time('RiggedAvatarModel:'+(options.url));
      super(avatarModel, Object.assign(options||{}, {
          group: options.group || new THREE.Group(),
      }));
      this.clock = new THREE.Clock();
      this.skeleton.pose();
      // FIXME: still having issues with THREE frumstum culling...
      this.group.traverse((x)=>x.frustumCulled=false);
      console.timeEnd('RiggedAvatarModel:'+(options.url));
  }
  setState(hmd, gamepads) {
    this.$lastState = { hmd: hmd, gamepads: gamepads };
    const targets = this.targets;
    var flip = quatFromDegrees([0,0,180]);
    targets.Head.position.fromArray(hmd.position);
    targets.Head.position.y *= (this.scale || 1.0);
    targets.Head.quaternion.fromArray(hmd.quaternion)
    targets.LeftHand.position.fromArray(gamepads[1].position)
    var q = targets.LeftHand.quaternion.clone();
    targets.LeftHand.quaternion.fromArray(gamepads[1].quaternion).multiply(flip).slerp(q, .5);
    targets.RightHand.position.fromArray(gamepads[0].position)
    var q = targets.RightHand.quaternion.clone();
    targets.RightHand.quaternion.fromArray(gamepads[0].quaternion).multiply(flip).slerp(q, .5);
    var h = targets.Head, l = targets.LeftHand, r = targets.RightHand;
    l.position.sub(h.position);
    l.position.multiplyScalar(this.armScale || .65);
    l.position.add(h.position);
    r.position.sub(h.position);
    r.position.multiplyScalar(this.armScale || .65);
    r.position.add(h.position);
  }
  applyRecording() {
      var rig = this;
      return TimPlayback.loadRecording({
          url: './avatars/assets/tracked-recording.json',
          //url: './data/recording-dance-avatar.json',
          config: { output: true, input: true },
          getBone: (name) => { return rig.getBone(name) },
          getTarget: (name) => { return rig.getIKTarget(name) },
          getScene: ()=> top.DEBUG.local('scene')
      }).then((r) => {
          r.replayer.isReplaying = true;
          rig.$recording = r;
          return r;
      }).catch((err)=>console.error('error loading recording: ', err));
  }
  update() {
    const timeDelta = this.clock.getDelta() * 1000;
    const time = this.clock.elapsedTime * 1000;
    if (this.$recording) {
        this.$recording.tick(time, timeDelta);
    } else {
        this.tick(time, timeDelta);
    }
  }
};

export default RiggedAvatarModel;
export { RiggedAvatarModel };
try { Object.assign(self, { RiggedAvatarModel }); } catch(e) {}
