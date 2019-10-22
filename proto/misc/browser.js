// bundle for standalone browser testing

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

import Stats from 'three/examples/jsm/libs/stats.module.js';
import * as dat from 'three/examples/jsm/libs/dat.gui.module.js';
import RiggedMesh from './IKRiggedMesh.js';
Object.assign(self, { RiggedMesh, Stats, dat });

//self.model_patches = require('./model.patches.js');
console.info('//browser.js');

