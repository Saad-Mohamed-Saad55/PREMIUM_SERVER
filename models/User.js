const conn = require('../config/db');
class UserModel {
    static async getUsers(){
        return new Promise (resolve => {
            const sql = "SELECT * FROM users"
            conn.query(sql, [], (err, result) => {
                if(!err)
                    resolve(result);
            });
        })
    }
}

module.exports = UserModel;