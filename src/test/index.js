import { createStore, combineReducers }  from '../index';

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

const store = createStore(reducers);

store.dispatch({
  type: 'ADD_ITEMS',
  payload: '123'
});

console.log(store.getState().items);