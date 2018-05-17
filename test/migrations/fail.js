export default {
  id: "b",
  up: async db => {
    await db.collection("test").insert({ a: 42 });
    await db.collection("test").update({ a: 42 }, { $set: { a: 2 } });
    return await db
      .collection("test")
      .update({ a: { $foo: "2" } }, { $set: { a: "bar" } });
  },
  down: async db => {
    return await db.collection("test").update({}, { $set: { a: 42 } });
  }
};
