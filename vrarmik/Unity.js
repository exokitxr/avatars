const DEG2RAD = Math.PI/180;
const RAD2DEG = 180/Math.PI;
const ORDER = 'ZXY';

class Vector2 extends THREE.Vector2 {
  get magnitude() {
    return this.length();
  }
  get normalized() {
    return this.clone().normalize();
  }
}

class Vector3 extends THREE.Vector3 {
  bindOnchange(onchange) {
    let x = this.x, y = this.y, z = this.z;
    Object.defineProperty(this, 'x', {
      get() {
        return x;
      },
      set(newX) {
        x = newX;
        onchange();
      },
    });
    Object.defineProperty(this, 'y', {
      get() {
        return y;
      },
      set(newY) {
        y = newY;
        onchange();
      },
    });
    Object.defineProperty(this, 'z', {
      get() {
        return z;
      },
      set(newZ) {
        z = newZ;
        onchange();
      },
    });
    this.set = (_set => function set() {
      _set.apply(this, arguments);
      onchange();
    })(this.set);
    this.copy = (_copy => function copy() {
      _copy.apply(this, arguments);
      onchange();
    })(this.copy);
  }

  static get zero() {
    return new Vector3(0, 0, 0);
  }
  static get one() {
    return new Vector3(1, 1, 1);
  }
  static get left() {
    return new Vector3(-1, 0, 0);
  }
  static get right() {
    return new Vector3(1, 0, 0);
  }
  static get up() {
    return new Vector3(0, 1, 0);
  }
  static get down() {
    return new Vector3(0, -1, 0);
  }
  static get forward() {
    return new Vector3(0, 0, 1);
  }
  static get back() {
    return new Vector3(0, 0, -1);
  }
  get magnitude() {
    return this.length();
  }
  get normalized() {
    return this.clone().normalize();
  }
  xz() {
    return new Vector2(this.x, this.z);
  }
  static Scale(a, b) {
    return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
  }
  Scale(v) {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }
  static Dot(a, b) {
    return a.dot(b);
  }
  static Cross(a, b) {
    return a.clone().cross(b);
  }
  static Angle(a, b) {
    return a.angleTo(b) * RAD2DEG;
  }
}

class Quaternion extends THREE.Quaternion {
  bindOnchange(onchange) {
    let x = this.x, y = this.y, z = this.z, w = this.w;
    Object.defineProperty(this, 'x', {
      get() {
        return x;
      },
      set(newX) {
        x = newX;
        onchange();
      },
    });
    Object.defineProperty(this, 'y', {
      get() {
        return y;
      },
      set(newY) {
        y = newY;
        onchange();
      },
    });
    Object.defineProperty(this, 'z', {
      get() {
        return z;
      },
      set(newZ) {
        z = newZ;
        onchange();
      },
    });
    Object.defineProperty(this, 'w', {
      get() {
        return w;
      },
      set(newW) {
        w = newW;
        onchange();
      },
    });
    this.set = (_set => function set() {
      _set.apply(this, arguments);
      onchange();
    })(this.set);
    this.copy = (_copy => function copy() {
      _copy.apply(this, arguments);
      onchange();
    })(this.copy);
    /* this.setFromAxisAngle = (_setFromAxisAngle => function setFromAxisAngle() {
      _setFromAxisAngle.apply(this, arguments);
      onchange();
    })(this.setFromAxisAngle); */
  }

  static get identity() {
    return new Quaternion(0, 0, 0, 1);
  }
  static AngleAxis(angle, axis) {
    return new Quaternion().setFromAxisAngle(axis, angle * DEG2RAD);
  }
  static FromToRotation(a, b) {
    return new Quaternion().setFromUnitVectors(a, b);
  }
  static Euler(v) {
    return new Quaternion().setFromEuler(new THREE.Euler(v.x * DEG2RAD, v.y * DEG2RAD, v.z * DEG2RAD, ORDER));
  }
  static Inverse(q) {
    return q.clone().inverse();
  }

  Inverse() {
    return this.clone().inverse();
  }
}

class Transform {
  constructor() {
    this._position = new Vector3();
    this._rotation = new Quaternion();
    this._scale = new Vector3(1, 1, 1);

    this._localPosition = new Vector3();
    const localChange = this.localChange.bind(this);
    this._localPosition.bindOnchange(localChange);
    this._localRotation = new Quaternion();
    this._localRotation.bindOnchange(localChange);
    this._localScale = new Vector3(1, 1, 1);
    this._localScale.bindOnchange(localChange);

    this._children = [];
    this._parent = null;

    this._matrix = new THREE.Matrix4();
    this._matrixWorld = new THREE.Matrix4();
  }

  get position() {
    this.updateMatrixWorld();
    return this._position.clone();
  }
  set position(position) {
    this.updateMatrixWorld();
    this._position.copy(position);
    this.updateLocalMatrix();
  }
  get rotation() {
    this.updateMatrixWorld();
    return this._rotation.clone();
  }
  set rotation(rotation) {
    this.updateMatrixWorld();
    this._rotation.copy(rotation);
    this.updateLocalMatrix();
  }
  get scale() {
    this.updateMatrixWorld();
    return this._scale.clone();
  }
  set scale(scale) {
    this.updateMatrixWorld();
    this._scale.copy(scale);
    this.updateLocalMatrix();
  }

  get localPosition() {
    return this._localPosition.clone();
  }
  set localPosition(localPosition) {
    this._localPosition.copy(localPosition);
  }
  get localRotation() {
    return this._localRotation.clone();
  }
  set localRotation(localRotation) {
    this._localRotation.copy(localRotation);
  }
  get localScale() {
    return this._localScale.clone();
  }
  set localScale(localScale) {
    this._localScale.copy(localScale);
  }

  get parent() {
    return this._parent;
  }
  set parent(parent) {
    this._parent = parent;
    this.localChange();
  }

  get right() {
    return Vector3.right.applyQuaternion(this.rotation);
  }
  get up() {
    return Vector3.up.applyQuaternion(this.rotation);
  }
  get forward() {
    return Vector3.forward.applyQuaternion(this.rotation);
  }

  AddChild(child) {
    this._children.push(child);
    child.parent = this;
  }

  updateLocalMatrix() {
    this._matrixWorld.compose(this._position, this._rotation, this._scale);
    this._matrix.copy(this._matrixWorld);
    if (this._parent) {
      this._matrix.premultiply(new THREE.Matrix4().getInverse(this._parent._matrixWorld));
    }
    this._matrix.decompose(this._localPosition, this._localRotation, this._localScale);
    this.matrixWorldNeedsUpdate = false;

    for (let i = 0; i < this._children.length; i++) {
      this._children[i].localChange();
    }
  }
  updateMatrixWorld() {
    if (this.matrixWorldNeedsUpdate) {
      this._matrix.compose(this._localPosition, this._localRotation, this._localScale);
      this._matrixWorld.copy(this._matrix);

      if (this._parent) {
        this._parent.updateMatrixWorld();
        this._matrixWorld.premultiply(this._parent._matrixWorld);
      }

      this._matrixWorld.decompose(this._position, this._rotation, this._scale);

      this.matrixWorldNeedsUpdate = false;
    }
  }
  localChange() {
    this.matrixWorldNeedsUpdate = true;
    for (let i = 0; i < this._children.length; i++) {
      this._children[i].localChange();
    }
  }

  static eulerAngles(rotation) {
    const e = new THREE.Euler().setFromQuaternion(rotation, ORDER);
    return new Vector3(e.x * RAD2DEG, e.y * RAD2DEG, e.z * RAD2DEG);
  }
  get eulerAngles() {
    return Transform.eulerAngles(this.rotation);
  }
  set eulerAngles(v) {
    this.rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(v.x * DEG2RAD, v.y * DEG2RAD, v.z * DEG2RAD, ORDER));
  }
  get localEulerAngles() {
    const e = new THREE.Euler().setFromQuaternion(this.localRotation, ORDER);
    return new Vector3(e.x * RAD2DEG, e.y * RAD2DEG, e.z * RAD2DEG);
  }
  set localEulerAngles(v) {
    this.localRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(v.x * DEG2RAD, v.y * DEG2RAD, v.z * DEG2RAD, ORDER));
  }

  TransformPoint(v) {
    this.updateMatrixWorld();
    return v.clone().applyMatrix4(this._matrixWorld);
  }
  InverseTransformPoint(v) {
    this.updateMatrixWorld();
    return v.clone().applyMatrix4(new THREE.Matrix4().getInverse(this._matrixWorld));
  }
  TransformDirection(v) {
    this.updateMatrixWorld();
    return v.clone().applyMatrix4(this._matrixWorld).normalize();
  }
  InverseTransformDirection(v) {
    this.updateMatrixWorld();
    return v.clone().applyMatrix4(new THREE.Matrix4().getInverse(this._matrixWorld)).normalize();
  }
}

const gameObjects = [];
class GameObject {
  constructor(name, unity) {
    if (!unity) {
      throw new Error('bad game object initialization');
    }

    this.name = name;
    this.unity = unity;

    this.transform = new Transform();
    this.components = new Map();

    gameObjects.push(this);
  }
  AddComponent(Constructor) {
    let component = this.components.get(Constructor);
    if (component === undefined) {
      component = new Constructor(this.transform, this.components, this.unity);
      this.components.set(Constructor, component);
    }
    return component;
  }
  AddChild(child) {
    this.transform.AddChild(child.transform);
  }
}

class MonoBehavior {
  constructor(transform, components, unity) {
    if (!transform || !components || !unity) {
      throw new Error('bad component initialization');
    }

    this.transform = transform;
    this.components = components;
    this.unity = unity;
  }

  GetComponent(Constructor) {
    let component = this.components.get(Constructor);
    if (component === undefined) {
      component = new Constructor(this.transform, this.components, this.unity);
      this.components.set(Constructor, component);
    }
    return component;
  }
  GetOrAddComponent(Constructor) {
    return this.GetComponent(Constructor);
  }
  GetComponentInChildren(Constructor) {
    return this.GetComponent(Constructor);
  }

  Awake() {}
  OnEnable() {}
  Start() {}

  Update() {}
  LateUpdate() {}
}

const Time = {
  deltaTime: 1/90,
};

const Mathf = {
  Deg2Rad: DEG2RAD,
  Rad2Deg: RAD2DEG,
  PI: Math.PI,
  Clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  },
  Clamp01(v) {
    return Mathf.Clamp(v, 0, 1);
  },
  Min(a, b) {
    return Math.min(a, b);
  },
  Max(a, b) {
    return Math.max(a, b);
  },
  Abs(v) {
    return Math.abs(v);
  },
  Log(a, b) {
    let result = Math.log(a);
    if (b !== undefined) {
      result /= Math.log(b);
    }
    return result;
  },
  Lerp(a, b, t) {
    return a*(1-v) + b*v;
  },
  LerpAngle(a, b, t) {
    let num = Mathf.Repeat(b - a, 360);
    if (num > 180) {
      num -= 360;
    }
    return a + num * Mathf.Clamp01(t);
  },
  Floor(v) {
    return Math.floor(v);
  },
  Ceil(v) {
    return Math.ceil(v);
  },
  Repeat(t, length) {
    return t - Mathf.Floor(t / length) * length;
  },
  DeltaAngle(current, target) {
    let num = Mathf.Repeat(target - current, 360);
    if (num > 180) {
      num -= 360;
    }
    return num;
  },
  Acos(v) {
    return Math.acos(v);
  },
  Atan2(a, b) {
    return Math.atan2(a, b);
  },
  Sign(v) {
    return v >= 0 ? 1 : -1;
  },
  Pow(a, b) {
    return Math.pow(a, b);
  },
};

const PlayerPrefs = {
  data: {},
  GetFloat(k, d) {
    let v = this.data[k];
    if (v === undefined) {
      v = d;
    }
    return v;
  },
  SetFloat(k, v) {
    this.data[k] = v;
  },
};

const XRSettings = {
  loadedDeviceName: 'OpenVR',
};

/* class Unity {
  constructor() {
    this.gameObjects = [];
  }

  makeGameObject(name) {
    const gameObject = new GameObject(name, this);
    this.gameObjects.push(gameObject);
    return gameObject;
  }

  clearAll() {
    this.gameObjects.length = 0;
  }
  startAll() {
    for (let i = 0; i < this.gameObjects.length; i++) {
      this.gameObjects[i].components.forEach(value => {
        value.Awake && value.Awake();
      });
    }
    for (let i = 0; i < this.gameObjects.length; i++) {
      this.gameObjects[i].components.forEach(value => {
        value.OnEnable && value.OnEnable();
      });
    }
    for (let i = 0; i < this.gameObjects.length; i++) {
      this.gameObjects[i].components.forEach(value => {
        value.Start && value.Start();
      });
    }
  }
  updateAll() {
    for (let i = 0; i < this.gameObjects.length; i++) {
      this.gameObjects[i].components.forEach(value => {
        value.Update && value.Update();
      });
    }
    for (let i = 0; i < this.gameObjects.length; i++) {
      this.gameObjects[i].components.forEach(value => {
        value.LateUpdate && value.LateUpdate();
      });
    }
  }
} */

export {
  Vector2,
  Vector3,
  Quaternion,
  Transform,
  GameObject,
  MonoBehavior,
  Time,
  Mathf,
  PlayerPrefs,
  XRSettings,
  // Unity,
};
