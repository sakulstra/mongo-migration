export default{
  id: 'a',
  up: async (db) => {
    return await db.collection('test').insert({a: 1})
  }
}