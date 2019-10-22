// note: used for packaging sparse ES6 modules that depend on THREE.js, but do not ship it
export default (1,eval)('this').THREE;
console.info('ephemeral-three; using global THREE', (1,eval)('this').THREE.REVISION)
