export default {
  id: 'test3',
  up: async db => {
    return await db.collection('tests').update({ a: 2 }, { a: 3 });
  }
};
