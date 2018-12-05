import { createStore, combineReducers, applyMiddleware }  from '../index';

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

const middleware1 = store => {
  store.dispatch({
    type: 'ADD_ITEMS',
    payload: '12345'
  });
  return next => action => {
    console.log('???');
  }
}

const middleware2 = store => next => action => {
  console.log('middleware 2!');
  let res = next(action);
  console.log(store.getState());
  return res;
}

const store = createStore(reducers, applyMiddleware(middleware1, middleware2));

store.dispatch({
  type: 'ADD_ITEMS',
  payload: '123'
});

store.dispatch({
  type: 'ADD_ITEMS',
  payload: '13'
});

store.dispatch({
  type: 'DEL_ITEMS',
  payload: '123'
})
