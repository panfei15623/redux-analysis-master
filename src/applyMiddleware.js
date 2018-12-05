import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
//　用于应用中间件的函数，可以同时传递多个中间件。中间件的标准形式为：
//  const middleware = store => next => action => { /*.....*/ return next(action); }
export default function applyMiddleware(...middlewares) {
  //　返回一个函数，接受　createStore　作为参数。args 参数即为 reducer 和 preloadedState。
  return createStore => (...args) => {
    // 调用 createStore 创建一个　store 对象。
    const store = createStore(...args)
    // 这里对 dispatch 进行了重新定义，不管传入什么参数，都会报错，这样做的目的是防止你的中间件在初始化的时候就
    // 调用 dispatch。
    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      )
    }

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    // 对于每一个 middleware，都传入 middlewareAPI 进行调用，这就是中间件的初始化。
    // 初始化后的中间件返回一个新的函数，这个函数接受 store.dispatch 作为参数，返回一个替换后的 dispatch，作为新的
    // store.dispatch。
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    // compose 方法把所有中间件串联起来调用。用最终结果替换 dispatch 函数，之后所使用的所有 store.dispatch 方法都已经是
    // 替换了的，加入了新的逻辑。
    dispatch = compose(...chain)(store.dispatch)

    /**
     * middle 的标准形式：
     * const middleware = ({ getState, dispatch }) => next => action => {
     *    // ....
     *    return next(action);
     * }
     * 这里 next 是经过上一个 middleware 处理了的 dispatch 方法。
     * next(action) 返回的仍然是一个 dispatch 方法。
     */

    return {
      ...store,
      dispatch  // 全新的 dispatch。
    }
  }
}
