module.exports = {
  id: "b",
  up: async db => {
    await db.collection("test").insert({ a: 42 });
    return await db
      .collection("test")
      .update({ a: { $foo: "2" } }, { $set: { a: "bar" } });
  },
  down: async db => {
    await db.collection("test").remove({});
    return await db
      .collection("test")
      .update({ a: { $foo: "2" } }, { $set: { a: "bar" } });
  }
};
