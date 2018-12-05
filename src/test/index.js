import { createStore, combineReducers, applyMiddleware }  from '../index';
import reduxPromise from 'redux-promise';

const reducers = combineReducers({
  items(items = [], { type, payload }) {
    let _items = Array.prototype.concat.call([], items);
    if (type === 'ADD_ITEMS') {
      _items.push(payload);
      return _items;
    }
    else if (type === 'DEL_ITEMS') {
      _items.splice(_items.indexOf(payload), 1);
      return _items;
    }
    else return items;
  }
});

const middleware = store => next => action => {
  return action.then ? action.then(next) : next(action);
}

const store = createStore(reducers, applyMiddleware(middleware));

// store.dispatch({
//   type: 'ADD_ITEMS',
//   payload: '123'
// });

// store.dispatch({
//   type: 'ADD_ITEMS',
//   payload: '13'
// });

// store.dispatch({
//   type: 'DEL_ITEMS',
//   payload: '123'
// })

store.subscribe(() => {
  console.log(store.getState());
})

store.dispatch(new Promise((resolve, reject) => {
  window.setTimeout(() =>{
    resolve({ type: 'ADD_ITEMS', payload: 100 });
  }, 1000);
}))
