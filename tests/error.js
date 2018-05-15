export default {
  id: 'error',
  up: async db => {
    return await db.collection('tests').update({ $multi: true });
  }
};
