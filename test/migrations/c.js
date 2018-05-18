export default {
  id: "c",
  up: async db => {
    return await db.collection("test").update({ a: 1 }, { $set: { a: 2 } });
  }
};
