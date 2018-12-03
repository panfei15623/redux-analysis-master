/**
 * @param {any} obj The object to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */

// 判断一个参数是否是纯对象，纯对象的定义就是它的构造函数为 Object。
// 比如： { name: 'isPlainObject', type: 'funciton' }。
// 而 isPlainObject 这个函数就不是纯对象，因为它的构造函数是 Function。
export default function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}
