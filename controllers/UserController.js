const userModel = require('../models/User');
class UserController{
    static async getAllUsers(req, res) {
        const result = await userModel.getUsers();
        if (result)
            res.send(result);
    }
}

module.exports = UserController;