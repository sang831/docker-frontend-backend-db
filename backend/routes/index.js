const express = require("express");
const router = express.Router();

const todos = require('./todos');
// import other routes here
//   const users = require('./users');


router.get("/", (req, res) => res.json({ status: "ok" }));

router.use("/todos", todos);
// use other routes here
// router.use('/users', users) 

module.exports = router;
