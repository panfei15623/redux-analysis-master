import ActionTypes from './utils/actionTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

/**
 * 用于获取错误信息的函数，如果调用你所定义的某个 reducer 返回了 undefined，那么就调用这个函数
 * 抛出合适的错误信息。
 * 
 * @param {String} key 你所定义的某个 reducer 的函数名，同时也是 state 的一个属性名。
 * 
 * @param {Object} action 调用 reducer 时所使用的 action。
 */
function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type
  const actionDescription =
    (actionType && `action "${String(actionType)}"`) || 'an action'

  return (
    `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  )
}

/**
 * 用于校验未知键，如果 state 中的某个属性没有对应的 reducer，那么返回报错信息。
 * 对于 REPLACE 类型的 action type，则不进行校验。
 * @param {Object} inputState 
 * @param {Object} reducers 
 * @param {Object} action 
 * @param {Object} unexpectedKeyCache 
 */
function getUnexpectedStateShapeWarningMessage(
  inputState,
  reducers,
  action,
  unexpectedKeyCache
) {
  const reducerKeys = Object.keys(reducers)
  const argumentName =
    action && action.type === ActionTypes.INIT
      ? 'preloadedState argument passed to createStore'
      : 'previous state received by the reducer'

  // 如果 reducers 长度为 0，返回对应错误信息。
  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +             // {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1]
      `". Expected argument to be an object with the following ` +          // 返回的是 inputState 的类型。
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  // 获取所有 State 有而 reducers 没有的属性，加入到 unexpectedKeysCache。
  const unexpectedKeys = Object.keys(inputState).filter(
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
  )

  // 加入到 unexpectedKeyCache。
  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  // 如果是 REPLACE 类型的 action type，不再校验未知键，因为按需加载的 reducers 不需要校验未知键，现在不存在的 reducers 可能下次就加上了。
  if (action && action.type === ActionTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

/**
 * 用于校验所有 reducer 的合理性：传入任意值都不能返回 undefined。
 * @param {Object} reducers 你所定义的 reducers 对象。
 */
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key]
    // 获取初始化时的 state。
    const initialState = reducer(undefined, { type: ActionTypes.INIT })

    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
          `If the state passed to the reducer is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this reducer, ` +
          `you can use null instead of undefined.`
      )
    }
    // 如果初始化校验通过了，有可能是你定义了 ActionTypes.INIT 的操作。这时候重新用随机值校验。
    // 如果返回 undefined，说明用户可能对 INIT type 做了对应处理，这是不允许的。
    if (
      typeof reducer(undefined, {
        type: ActionTypes.PROBE_UNKNOWN_ACTION()
      }) === 'undefined'
    ) {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${
            ActionTypes.INIT
          } or other actions in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown actions, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */
// 把你所定义的 reducers 对象转化为一个庞大的汇总函数。
export default function combineReducers(reducers) {
  // 获取 reducers 所有的属性名。
  const reducerKeys = Object.keys(reducers)
  const finalReducers = {}
  // 遍历 reducers 的所有属性，剔除所有不合法的 reducer。
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    if (typeof reducers[key] === 'function') {
      // 将 reducers 中的所有 reducer 拷贝到新的 finalReducers 对象上。
      finalReducers[key] = reducers[key]
    }
  }
  // finalReducers 是一个纯净的经过过滤的 reducers 了，重新获取所有属性名。
  const finalReducerKeys = Object.keys(finalReducers)

  let unexpectedKeyCache
  // unexpectedKeyCache 包含所有 state 中有但是 reducers 中没有的属性。
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  let shapeAssertionError
  try {
    // 校验所有 reducer 的合理性，缓存错误。
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }

  // 这就是返回的新的 reducer，一个纯函数。每次 dispatch 一个 action，都要执行一遍 combination 函数，
  // 进而把你所定义的所有 reducer 都执行一遍。
  return function combination(state = {}, action) {
    if (shapeAssertionError) {
      // 如果有缓存的错误，抛出。
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      // 非生产环境下校验 state 中的属性是否都有对应的 reducer。
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,
        action,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    let hasChanged = false
    // state 是否改变的标志位。
    const nextState = {}
    // reducer 返回的新 state。
    for (let i = 0; i < finalReducerKeys.length; i++) {   // 遍历所有的 reducer。
      const key = finalReducerKeys[i]  // 获取 reducer 名称。
      const reducer = finalReducers[key]  // 获取 reducer。
      const previousStateForKey = state[key]  // 旧的 state 值。
      const nextStateForKey = reducer(previousStateForKey, action)  // 执行 reducer 返回的新的 state[key] 值。
      if (typeof nextStateForKey === 'undefined') {
        // 如果经过了那么多校验，你的 reducer 还是返回了 undefined，那么就要抛出错误信息了。
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      nextState[key] = nextStateForKey
      // 把返回的新值添加到 nextState 对象上。
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
      // 检验 state 是否发生了变化。
    }
    // 根据标志位返回对应的 state。
    return hasChanged ? nextState : state
  }
}
