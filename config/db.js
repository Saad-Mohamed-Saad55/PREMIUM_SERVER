const mysql = require('mysql');

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "college_platform"
});
conn.connect(function (err){
    if(err) throw err;
    console.log("Connected To Database :)");
});

module.exports = conn;