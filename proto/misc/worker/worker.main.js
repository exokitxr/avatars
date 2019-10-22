// worker main

var clock = new THREE.Clock();
var skeleton;
var recording;
var group;
var config = {
    playback: false,
    ik: true,
    fallback: true,
    grounding: true,
    backpropagate: true,
    frame: 0,
};

var rig;

var scene = new THREE.Group();
scene.name = 'fauxscene';

var global = self;

var targets = {
    Head: new THREE.Object3D(),
    Hips: new THREE.Object3D(),
    LeftHand: new THREE.Object3D(),
    RightHand: new THREE.Object3D(),
    LeftFoot: new THREE.Object3D(),
    RightFoot: new THREE.Object3D(),
};

function animate() {
    var timeDelta = clock.getDelta() * 1000,
        time = clock.elapsedTime * 1000;
    if (config.playback && recording) {
        if (rig) recording.options.world.scale.copy(rig.scale);
        recording.tick(time, timeDelta);
        config.frame = recording.currentPoseIndex;
    }
    if (rig) {
        if (config.ik) rig.tick(time, timeDelta);
        else console.info('!config.ik');
        if (config.fallback) rig.fallback((recording && recording.output) || targets || {
            Head: {
                position: skeleton.getBoneByName('Head').getWorldPosition(new THREE.Vector3())
            },
            Hips: {
                position: skeleton.getBoneByName('Hips').getWorldPosition(new THREE.Vector3())
            },
        }, time, timeDelta);
        else console.info('!fallback');
    } else console.info('!rig');
}

function reconstituteSkeleton(data) {
    let { bones, boneInverses } = data;
    var boneArray = [], boneInversesArray = [];
    var bids = bones.reduce((out, b, i) => {
        var bone = out[b.uuid] = new THREE.Bone();
        boneArray.push(bone);
        boneInversesArray.push(new THREE.Matrix4().copy(boneInverses[i]));
        bone.name = b.name;
        bone.uuid = b.uuid;
        bone.matrix.copy(b.matrix);
        var T = new THREE.Vector3(),
            R = new THREE.Quaternion(),
            S = new THREE.Vector3();
        bone.matrix.decompose(T, R, S);
        bone.position.copy(T);
        bone.quaternion.copy(R);
        //bone.updateMatrixWorld(true);
        bone.$source = b;
        return out;
    }, {});
    boneArray.forEach((bone) => {
        bone.children = bone.$source.children.map((id) => {
            bids[id].parent = bone;
            return bids[id];
        })
    });
    var g = new THREE.Group();
    g.name = 'skeleton-reconstitute';
    var skeleton = new THREE.Skeleton(boneArray, boneInversesArray)
    skeleton.pose();
    skeleton.update();
    skeleton.calculateInverses();
    skeleton.bones.forEach((bone) => {
        if (!bone.parent) {
            bone.parent = g;
            console.info('///', bone.name, bone.parent);
        };
    });
    //skeleton.update();
    //setZForward(skeleton.getBoneByName('Hips'));
    return skeleton;
}

onmessage = function(evt) {
    var data = evt.data;
    //console.info(data);
    if (data.type === 'skeleton') {
        console.info('...skeleton received', data);
        skeleton = reconstituteSkeleton(data);
        rig = new Rig(skeleton, {
            targets: targets,
            config: config,
            chains: {
                spine: {
                    from: 'Spine1',
                    to: 'Head',
                },
                leftArm: {
                    from: 'LeftShoulder',
                    to: 'LeftHand'
                },
                rightArm: {
                    from: 'RightShoulder',
                    to: 'RightHand'
                },
            },
        });
        if (false) { //params.zForward) {
            console.info('Rig -- setting zForward', rig.armature.rootBone);
            setZForward(rig.armature.rootBone);
        }

        //skeleton.getBoneByName('Head').rotation.x++;
        console.log('...skeleton received', skeleton, rig, rig.targets);
        pose();
        return;
    } else {
        function u(to, data, name) {
            if (data[name]) {
                if (data[name].position) to.position.copy(data[name].position);
                if (data[name].quaternion) to.quaternion.copy(data[name].quaternion);
            }
        }
        u(targets.Head, data, 'camera');
        u(targets.LeftHand, data, 'left');
        u(targets.RightHand, data, 'right');
        //console.info('left', JSON.stringify(targets.Head.position));
        animate();
        pose();
    }
};

function pose() {
    postMessage({
        type: 'pose',
        config: config,
        boneMatrices: skeleton.bones.map((b, i) => {
            var T = b.position, R = b.quaternion;
            //var T = new THREE.Vector3(), R = new THREE.Quaternion(), S = new THREE.Vector3();
            //b.matrix.decompose(T,R,S);
            return {
                T: { x: T.x, y: T.y, z: T.z },
                R: { x: R.x, y: R.y, z: R.z, w: R.w },
            };
        }),
    })
}
postMessage({
    type: 'status',
    message: 'worker.js ready'
});
console.info(self.name, '//worker.js');


//importScripts('../../motion-capture-replayer.js');
// var wait2 = Promise.resolve('n/a') || TimPlayback.loadRecording({
//     //url: 'https://cdn.glitch.com/642354cc-98b7-4ba7-b6e2-7f83542e4264%2Ftracked-recording.json?v=1568899546279',
//     //url: 'https://raw.githubusercontent.com/dmarcos/aframe-motion-capture-components/master/examples/assets/tracked-recording.json',
//     //url: 'recording-dance-avatar.json',//https://ucarecdn.com/3883a53a-42d3-47ab-b5d2-379ac347ec17/',
//   //url: 'https://internal-print.glitch.me/mmd/recording1.json',
//   url: 'https://cdn.glitch.com/06afc275-e085-476f-82e3-f1a92b5dd95d%2Fbigrecording.json?v=1569448446686',
//     config: config,
//     channels: {
//       camera: 'Head',
//       left: 'LeftHand',
//       right: 'RightHand',
//     },
//     getBone: (name) => global.rig.getBone(name),
//     getTarget: (name) => global.targets[name],
//     getScene: ()=> scene,
//     world: new THREE.Object3D(),
//     scale: 1.0,
// }).then((r) => {
//     recording = r;
//     recording.replayer.isReplaying = config['playback'] ;
// }).catch((err)=>console.error('error loading recording: ', err));

