// remapJointNames.js -- wip for remapping arbitrary GLTF joints

remapJointNames.version = '0.0.0';

export default remapJointNames;
export { remapJointNames, schemes };
try { Object.assign(self, { remapSkeleton }); } catch(e) {}

var schemes = remapJointNames.schemes = {
    match: function(skeleton) {
        var bone = skeleton.bones.filter((x)=>this.re.test(x.name))[0];
        return bone && Object.assign(this.remap.bind(this), { bone });
    },
};
// [wip] evolving heuristics / remapping rules
Object.assign(schemes, {
  mixamo: {
    __proto__: schemes,
    re: /^mixamorig/,
    remap: function fromMixamo(from) { return from.replace(this.re, ''); },
  },
  knuckles: {
    __proto__: schemes,
    //Hips,Spine,Chest,Neck,Head,LeftEye,RightEye,ShoulderL,Upper_armL,Lower_armL,HandL,Upper_pointerL,Mid_pointerL,Upper_midL,Mid_midL,Upper_ringL,Mid_ringL,Upper_pinkieL,Lower_pinkieL,Upper_thumbL,Lower_thumbL,ShoulderR,Upper_armR,Lower_armR,HandR,Upper_pointerR,Mid_pointerR,Upper_midR,Mid_midR,Upper_ringR,Mid_ringR,Upper_pinkieR,Lower_pinkieR,Upper_thumbR,Lower_thumbR,Upper_legL,Lower_legL,FootL,ToeL,Upper_tail,Lower_tail,Upper_legR,Lower_legR,FootR,ToeR    
    re: /^HandR$/,
    remap: function(from) {
        return from
            .replace(/^(.*)L$/, 'Left$1')
            .replace(/^(.*)R$/, 'Right$1')
            .replace(/_(arm|leg)$/, function(_, limb) { return limb[0].toUpperCase()+limb.substr(1); })
            .replace(/Upper/, 'Up')
            .replace(/LowerArm/, 'ForeArm')
            .replace(/UpArm/, 'Arm')
            .replace(/Lower/, '')
            .replace('Chest', 'Spine1');
    },
  },
  vrm: {
    __proto__: schemes,
    //Hips,Spine,Chest,Neck,Head,LeftEye,RightEye,ShoulderL,Upper_armL,Lower_armL,HandL,Upper_pointerL,Mid_pointerL,Upper_midL,Mid_midL,Upper_ringL,Mid_ringL,Upper_pinkieL,Lower_pinkieL,Upper_thumbL,Lower_thumbL,ShoulderR,Upper_armR,Lower_armR,HandR,Upper_pointerR,Mid_pointerR,Upper_midR,Mid_midR,Upper_ringR,Mid_ringR,Upper_pinkieR,Lower_pinkieR,Upper_thumbR,Lower_thumbR,Upper_legL,Lower_legL,FootL,ToeL,Upper_tail,Lower_tail,Upper_legR,Lower_legR,FootR,ToeR    
    re: /^J_Bip_C_Hips$/,
    remap: function(from) {
        return from
            .replace('J_Bip_C_Hips', 'Hips')
            .replace('J_Bip_C_Spine', 'Spine')
            .replace('J_Bip_C_Chest', 'Spine1')
            .replace('J_Bip_C_Neck', 'Neck')
            .replace('J_Bip_C_Head', 'Head')

            .replace('J_Adj_L_FaceEye', 'LeftEye')
            .replace('J_Adj_R_FaceEye', 'RightEye')

            .replace('J_Bip_L_Shoulder', 'LeftShoulder')
            .replace('J_Bip_L_UpperArm', 'LeftArm')
            .replace('J_Bip_L_LowerArm', 'LeftForeArm')
            .replace('J_Bip_L_Hand', 'LeftHand')

            .replace('J_Bip_R_Shoulder', 'RightShoulder')
            .replace('J_Bip_R_UpperArm', 'RightArm')
            .replace('J_Bip_R_LowerArm', 'RightForeArm')
            .replace('J_Bip_R_Hand', 'RightHand')

            .replace('J_Bip_L_UpperLeg', 'LeftUpLeg')
            .replace('J_Bip_L_LowerLeg', 'LeftLeg')
            .replace('J_Bip_L_Foot', 'LeftFoot')

            .replace('J_Bip_R_UpperLeg', 'RightUpLeg')
            .replace('J_Bip_R_LowerLeg', 'RightLeg')
            .replace('J_Bip_R_Foot', 'RightFoot');
    },
  },
  side_winder: {
    __proto__: schemes,
    re: /^Left_wrist$/,
    remap: function fromSideWinder(from) { return this.JOINT_MAP[from] || from; },
    JOINT_MAP:  {
      Left_ankle: 'LeftFoot',
      Right_ankle: 'RightFoot',
      Left_shoulder: 'LeftShoulder',
      Right_shoulder: 'RightShoulder',
      Right_wrist: 'RightHand',
      Left_wrist: 'LeftHand',
      Right_leg: 'RightUpLeg',
      Left_leg: 'LeftUpLeg',
      Right_knee: 'RightLeg',
      Left_knee: 'LeftLeg',
      Right_arm: 'RightArm',
      Left_arm: 'LeftArm',
      Right_elbow: 'RightForeArm',
      Left_elbow: 'LeftForeArm',
      Chest: 'Spine1',
      Left_toe: 'LeftToeBase',
      Right_toe: 'RightToeBase',
    },
  },
  standardized: {
    EXPECTED: [
        'Hips', 'Spine1', 'Neck', 'Head',
        'LeftHand', 'LeftForeArm', 'LeftArm', 'LeftShoulder',
        'RightHand', 'RightForeArm', 'RightArm', 'RightShoulder',
        'LeftFoot', 'LeftLeg', 'LeftUpLeg',
        'RightFoot', 'RightLeg', 'RightUpLeg',
    ].filter(Boolean),
    match: function(skeleton) {
        if (this.EXPECTED.filter((x)=>skeleton.getBoneByName(x)).length === this.EXPECTED.length) {
            return Object.assign(this.remap.bind(this), { bone: skeleton.getBoneByName('Hips') });
        }
    },
    remap: function(x) { return x; },
  },
});

// TODO: the original design no longer seems viable / fully useful for managing schemes;
//       (need to find a better way to capture, express, test and maintain these)
function remapJointNames(skeleton, remapper) {
    if (!skeleton || !skeleton.bones) throw new Error('!skeleton.bones');
    var candidates = [
        schemes.standardized,
        remapper,
        schemes.mixamo,
        schemes.side_winder,
        schemes.knuckles,
        schemes.vrm,
    ].map(function(x) {
        return typeof x === 'function' ? x : (x && x.match(skeleton));
    }).filter(Boolean);
    console.info('remapJointNames -- candidates', candidates.length, candidates[0] && candidates[0].bone && candidates[0].bone.name);
    remapper = candidates[0];
    if (!remapper) throw new Error('unknown joint scheme: ' + skeleton.bones.map((x)=>x.name));
    var renamed = {};
    var array = []
    var result = skeleton.bones.reduce((out, bone) => {
      var name = remapper(bone.name);
      if (name in out) return out;
      if (name !== bone.name) renamed[name] = { from: bone.name, id: bone.id }; //console.info('remap', bone.name, '=>', name)
      array.push(out[name] = bone);
      bone.$name = bone.name; // preserve original bone name for debugging
      bone.name = name;
      return out;
  }, skeleton.$bones = Object.defineProperties({}, { toArray: { value: function() { return array; }} }));
  skeleton.$renamed = renamed;
  console.table ? console.table(renamed) : console.log(Object.keys(renamed).map((x)=>renamed[x] + ' => '+x).join('\n'));
  if (!remapper.noverify && !schemes.standardized.match(skeleton)) {
      throw new Error('Could not standardize skeleton...: ' + [
          'missing:',
          schemes.standardized.EXPECTED.filter((x)=>!skeleton.getBoneByName(x)).join(', '),
          'available:',
          skeleton.bones.map((x)=>!~schemes.standardized.EXPECTED.indexOf(x.name)&&x.name).filter(Boolean).join(', '),
      ].join('\n\t'));
  }
  return result;
}