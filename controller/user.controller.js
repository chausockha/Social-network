module.exports.index = (req,res) =>{
    res.render('login');
}

module.exports.post = (req,res) => {
    var email = req.body.email;
    var strig = 'asfsd';
    console.log(strig);
    console.log(email);
};