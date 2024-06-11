const express = require('express');
const router = express.Router();
const conn = require('../config/db');
const userController = require('../controllers/UserController');

// router.get("/all-users", (req, res) => {
//     const sql = "SELECT * FROM users";
//     conn.query(sql, (err, result)=>{
//         if (err) res.json({message:"Server Error"});
//         return res.json(result);
//     });
// });

router.get("/all-users", userController.getAllUsers)

module.exports = router;