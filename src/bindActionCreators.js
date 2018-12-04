/**
 * 该函数返回一个新的函数，调用新的函数会直接 dispatch ActionCreator 所返回的 action。
 * 这个函数是 bindActionCreators 函数的基础，在 bindActionCreators 函数中会把 actionCreators 拆分成一个一个
 * 的 ActionCreator，然后调用 bindActionCreator 方法。
 * @param {Function} actionCreator 一个返回 action 纯对象的函数。
 * @param {Function} dispatch store.dispatch 方法，用于触发 reducer。
 */
function bindActionCreator(actionCreator, dispatch) {
  return function() {
    return dispatch(actionCreator.apply(this, arguments))
  }
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass a single function as the first argument,
 * and get a function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */
//　接受一个 actionCreator 或者一个　actionCreators 对象和一个　dispatch　函数作为参数，
//  然后返回一个函数或者一个对象，直接执行这个函数或对象中的函数可以让你不必再调用　dispatch。
export default function bindActionCreators(actionCreators, dispatch) {
  // 如果 actionCreators 是一个函数而非对象，那么直接调用 bindActionCreators 方法进行转换，此时返回
  // 结果也是一个函数，执行这个函数会直接 dispatch 对应的　action。
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  //　actionCreators　既不是函数也不是对象，或者为空时，抛出错误。
  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${
        actionCreators === null ? 'null' : typeof actionCreators
      }. ` +
        `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }

  //　如果　actionCreators 是一个对象，那么它的每一个属性就应该是一个　actionCreator，遍历每一个　actionCreator，
  //　使用 bindActionCreator 进行转换。
  const keys = Object.keys(actionCreators)
  const boundActionCreators = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const actionCreator = actionCreators[key]
    //　把转换结果绑定到　boundActionCreators 对象，最后会返回它。
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  return boundActionCreators
}
