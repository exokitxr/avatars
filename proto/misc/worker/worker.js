// bundle for testing via Worker
console.info('...worker.js');

import 'glm-js';
import * as _THREE from 'three';
THREE = self.THREE = Object.assign({}, _THREE);
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as _IK from 'three-ik/src/index.js';
Object.assign(THREE, { TransformControls, GLTFLoader }, _IK);
import Rig from './IKRig.js'
Object.assign(self, { Rig });

console.info('THREE', THREE.REVISION, 'Rig', Rig.version);

importScripts('../proto/worker.main.js');
