module.exports = {
  id: "a_callback",
  up: (db, cb) => {
    db.collection("test").insert({ a: 1 }, cb);
  }
};
