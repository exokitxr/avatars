// workarounds per sample meshes
var model_patches = {
    __proto__: { version:'0.0.0a' },
    model1: {
        url: 'model1.glb',
        exclude: [ 'Hips' ],
        preRotations: {
          Armature: [0,180,0],
          //Head: [-60,180,0],
          Hips: [-180,0,0],
          LeftHand: [0,180,0],
          RightHand: [0,180,0],
        },
    },
    model2: {
        url: 'model2.glb',
        exclude: [ 'Hips', 'Head' ],
        preRotations: {
          Head: [45,180,0],
          Hips: [180,0,0],
          LeftHand: [0,180,0],
          RightHand: [0,180,0],
        },
    },
    model3: {
        url: 'model3.glb',
        preRotations: {
          // align eyesight forward
          // TODO: see if an autodetect + premultiply can resolve this case
          Head: [180-45, 0, 0],
          Hips: [90, 0, 0],
          LeftHand: [0,180,-90],
          RightHand: [0,180,90],
        },
        
        // note: "coat" borks out if IKing starting with Spine1 joint
        // TODO: see if an autodetect + premultiply can resolve this case
        // chains: {
        //     spine: {
        //         from: 'Neck',
        //         to: 'Head',
        //     },
        //     leftArm: {
        //         from: 'LeftShoulder',
        //         to: 'LeftHand'
        //     },
        //     rightArm: {
        //         from: 'RightShoulder',
        //         to: 'RightHand'
        //     },
        // },
    },
    model4: {
        url: 'model4.glb',
        //exclude: [ 'Hips' ],
        preRotations: {
          Armature: [0,180,0],
          Head: [-90,180,0],
          //Hips: [0,0,0],
          LeftEye: [90,0,0],
          RightEye: [90,0,0],
          LeftHand: [0,180,0],
          RightHand: [0,180,0],
        },
        // chains: {
        //     spine: {
        //         from: 'Neck',
        //         to: 'Head',
        //     },
        //     leftArm: {
        //         from: 'LeftShoulder',
        //         to: 'LeftHand'
        //     },
        //     rightArm: {
        //         from: 'RightShoulder',
        //         to: 'RightHand'
        //     },
        // },
        dynamic: {
            standingEarsL: {
                from: 'StandingEars1_L',
                to: 'StandingEars3_L',
            },
            standingEarsR: {
                from: 'StandingEars1_R',
                to: 'StandingEars3_R',
            },
            tail: {
                from: 'ButtTail1',
                to: 'ButtTail7',
            },
        },
        xdynamic: {
            hairL: {
                from: 'Hair1_L',
                to: 'Hair8_L',
            },
            hair2L: {
                from: 'Hair21_L',
                to: 'Hair28_L',
            },
            hair3L: {
                from: 'Hair31_L',
                to: 'Hair38_L',
            },
            hairR: {
                from: 'Hair1_R',
                to: 'Hair8_R',
            },
            hair2R: {
                from: 'Hair21_R',
                to: 'Hair28_R',
            },
            hair3R: {
                from: 'Hair31_R',
                to: 'Hair38_R',
            },
            fronthair1: {
                from: 'FrontHair1',
                to: 'FrontHair1_2',
            },
            fronthair2: {
                from: 'FrontHair2',
                to: 'FrontHair2_2',
            },
            fronthair3: {
                from: 'FrontHair3',
                to: 'FrontHair3_2',
            },
            sideburnL: {
                from: 'Sideburn1_L',
                to: 'Sideburn2_L',
            },
            sideburnR: {
                from: 'Sideburn1_R',
                to: 'Sideburn2_R',
            },
        },
    },
    model5: {
        url: 'model5.glb',
        //exclude: [ 'Hips', 'Head' ],
        preRotations: {
          Head: [90+45,0,0],
          Hips: [0,0,0],
          LeftHand: [0,180,0],
          RightHand: [0,180,0],
        },
    },
    anne: {
      url: 'anne.glb',
      preRotations: {
        /* Armature: [0,180,0], */
        // Head: [-90,180,0],
        // Spine: [-180,0,0],
        // Spine1: [-180,0,0],
        // Armature: [-180, 0, 0],
        // Hips: [-180,0,0],
        /* LeftEye: [90,0,0],
        RightEye: [90,0,0],
        LeftHand: [0,180,0],
        RightHand: [0,180,0],  */
      },
    }
};

try { self.model_patches = model_patches; } catch(e) {}
export default model_patches;
console.info('model_patches...', model_patches.version);
