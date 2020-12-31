var express = require('express');
var router = express.Router();

var controller = require('../controller/user.controller');

router.get('/index', controller.index);
router.post('/postlogin',controller.post);
module.exports = router;