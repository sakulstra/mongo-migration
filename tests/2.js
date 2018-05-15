export default {
  id: 'test2',
  up: async db => {
    return await db.collection('tests').update({ a: 1 }, { a: 2 });
  }
};
