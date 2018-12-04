import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
// 引入一些预定义的保留的 action type。
import isPlainObject from './utils/isPlainObject'
// 判断一个对象是否是纯对象。

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
// 使用 redux 最主要的 API，就是这个 createStore，它用于创建一个 redux store，为你提供状态管理。
// 它接受三个参数（第二三个可选），第一个是 reducer，用于改变 redux store 的状态；第二个是初始化的 store,
// 即最开始时候 store 的快照；第三个参数是由 applyMiddleware 函数返回的 enhancer 对象，使用中间件必须
// 提供的参数。
export default function createStore(reducer, preloadedState, enhancer) {
  // 下面这一段基本可以不看，它们是对参数进行适配的。
  /*************************************参数适配****************************************/
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    // 如果传递了多个 enhancer，抛出错误。
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function'
    )
  }
  // 如果没有传递默认的 state（preloadedState 为函数类型，enhancer 为未定义类型），那么传递的
  // preloadedState 即为 enhancer。
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      // 如果 enhancer 为不为空且非函数类型，报错。
      throw new Error('Expected the enhancer to be a function.')
    }
    // 使用 enhancer 对 createStore 进行处理，引入中间件。注意此处没有再传递　enhancer　作为参数。
    return enhancer(createStore)(reducer, preloadedState)
  }
  // 如果 reducer 不是函数类型，报错。
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }
  /*********************************************************************************/

  // 在函数内部定义一系列局部变量，用于存储数据。
  let currentReducer = reducer  // 存储当前的 reducer。
  let currentState = preloadedState // 用于存储当前的 store，即为 state。  
  let currentListeners = [] // 用于存储通过 store.subscribe 注册的当前的所有订阅者。
  let nextListeners = currentListeners  // 新的 listeners 数组，确保不直接修改 listeners。
  let isDispatching = false // 当前状态，防止 reducer 嵌套调用。

  // 顾名思义，确保 nextListeners 可以被修改，当 nextListeners 与 currentListeners 指向同一个数组的时候
  // 让 nextListeners 成为 currentListeners 的副本。防止修改 nextListeners 导致 currentListeners 发生变化。
  // 一开始我也不是很明白为什么会存在 nextListeners，因为后面 dispatch 函数中还是直接把 nextListeners 赋值给了 currentListeners。
  // 直接使用 currentListeners 也是可以的。后来去 redux 的 repo 搜了搜，发现了一个 issue（https://github.com/reduxjs/redux/issues/2157） 讲述了这个做法的理由。
  // 提交这段代码的作者的解释（https://github.com/reduxjs/redux/commit/c031c0a8d900e0e95a4915ecc0f96c6fe2d6e92b）是防止 Array.slice 的滥用，只有在必要的时候调用 Array.slice 方法来复制 listeners。
  // 以前的做法是每次 dispatch 都要 slice 一次，导致了性能的降低吧。
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  // 返回 currentState，即 store 的快照。
  function getState() {
    // 防止在 reducer 中调用该方法，reducer 会接受 state 参数。
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  // store.subscribe 函数，订阅 dispatch。
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
      )
    }

    let isSubscribed = true
    // 每次操作 nextListeners 之前先确保可以修改。
    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    // 注销当前订阅者。
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
        )
      }

      isSubscribed = false
      // 每次操作 nextListeners 之前先确保可以修改。
      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  // store.dispatch 函数，用于触发 reducer 修改 state。
  function dispatch(action) {
    if (!isPlainObject(action)) {
      // action 必须是纯对象。
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      // 每个 action 必须包含一个 type 属性，指定修改的类型。
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      // 调用 reducer 之前，先将标志位置一。
      isDispatching = true
      // 调用 reducer，返回的值即为最新的 state。
      currentState = currentReducer(currentState, action)
    } finally {
      // 调用完之后将标志位置 0，表示 dispatch 结束。
      isDispatching = false
    }

    // dispatch 结束之后，执行所有订阅者的函数。
    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    // 返回当前所使用的 action，这一步是中间件嵌套使用的关键。
    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  // 一个比较新的 API，用于动态替换当前的 reducers。适用于按需加载，代码拆分等场景。
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }
    // 执行默认的 REPLACE 类型的 action。在 combineReducers 函数中有使用到这个类型。
    currentReducer = nextReducer
    dispatch({ type: ActionTypes.REPLACE })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  // 这是为了适配 ECMA TC39 会议的一个有关 Observable 的提案（参考上方的网址）所写的一个函数。
  // 作用是订阅 store 的变化，适用于所有实现了 Observable 的类库（主要是适配 RxJS）。
  // 我找到了引入这个功能的那个 commit：https://github.com/reduxjs/redux/pull/1632。
  function observable() {
    // outerSubscribe 即为外部的 subscribe 函数。
    const outerSubscribe = subscribe
    // 返回一个纯对象，包含 subscribe 方法。
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        // 用于给 subscribe 注册的函数，严格按照 Observable 的规范实现，observer 必须有一个 next 属性。
        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      // $$observable 即为 Symbol.observable，也属于 Observable 的规范，返回自身。
      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  // 初始化时 dispatch 一个 INIT 类型的 action，校验各种情况。
  dispatch({ type: ActionTypes.INIT })

  // 返回一个 store 对象。
  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
