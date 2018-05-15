export default {
  id: 'test1',
  up: async db => {
    return await db.collection('tests').insert({ a: 42 });
  }
};
