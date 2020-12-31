
var express = require("express");
var cookieParser = require('cookie-parser')
var csrf = require('csurf')
var bodyParser = require('body-parser')

var app = express();
app.use(cookieParser())
var multer  = require('multer');
const path = require('path');
app.use(bodyParser.json());


var formidable = require("express-formidable");
var formidable1 = require("formidable");

app.use(formidable({
	encoding: 'utf-8',
	uploadDir: __dirname + "/public/images/",
	multiples: true, // req.files to be arrays of files
  }));
var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var http = require("http").createServer(app);
var bcrypt = require("bcrypt");
var fileSystem = require("fs");

var jwt = require("jsonwebtoken");
const { request } = require("http");
const e = require("express");
var accessTokenSecret = "myAccessTokenSecret1234567890";
var moment = require('moment');
var csurf = require('csurf');

//upload anh

app.use(express.urlencoded({extended: true}));


app.use("/public", express.static(__dirname + "/public"));



app.set("view engine", "ejs");

var socketIO = require("socket.io")(http);
var socketID = "";
var idRoom = '';
var users = [];
var rooms = [];
var room1s = ''
var userOnline = [];
var datenow = Date.now();

var mainURL = "http://localhost:3000";

socketIO.on("connection", function (socket) {
	//console.log("User connected", socket.id);
	socketID = socket.id;
	 socket.on('send-id-room', function(data){
		socket.join(data);
		socket.phong = data;
		room1s = socket.phong;
		console.log(room1s)
		for(r in socket.adapter.rooms){
			rooms.push(r);
		}
	 })
	 socket.on('sendUserOnline', function(data){		
		if(userOnline.indexOf(data) >= 0){
		
			socketIO.sockets.emit("sendUserOnline",{
				'status' : 'success'
			});
		}else{ 
			userOnline.push(data); 
			socket.user = data;    			
		}		
	});

	socket.on('logout', function(){	
		userOnline.splice(userOnline.indexOf( socket.user ),1);
		socketIO.sockets.emit('logout');
	})
	socket.on("keyboar", function(){
		let data = socket.user + "đang nhập tin nhắn...";
		socketIO.emit("thong-bao",data);
	});

	socket.on("un-keyboar", function(){
		socketIO.sockets.emit("stop");
	});
});

http.listen(3000, function () {
//	console.log("Server started at " + mainURL);


	mongoClient.connect("mongodb://localhost:27017", function (error, client) {
		var database = client.db("my_social_network");
		console.log("Database connected.");
		app.get("/", function (request, result) {
			result.render("index");
		});
		app.get("/signup", function (request, result) {
			result.render("signup");
		});
        app.post("/signup", function (request, result) {
            var name = request.fields.name;

			var username = request.fields.username;
			var email = request.fields.email;
			var password = request.fields.password;
			var gender = request.fields.gender;
			var reset_token = "";

			database.collection("users").findOne({
				$or: [{
					"email": email
				}, {
					"username": username
				}]
			}, function (error, user) {
				if (user == null) {
					bcrypt.hash(password, 10, function (error, hash) {
						database.collection("users").insertOne({
							"name": name,
							"username": username,
							"email": email,
							"password": hash,
							"gender": gender,
							"reset_token": reset_token,
							"profileImage": "",
							"coverPhoto": "",
							"dob": "",
							"city": "",
							"country": "",
							"aboutMe": "",
							"friends": [],
							"pages": [],
							"notifications": [],
							"groups": [],
							"posts": []
						}, function (error, data) {
							result.json({
								"status": "success",
								"message": "Signed up successfully. You can login now."
							});
						});
					});
				} else {
					result.json({
						"status": "error",
						"message": "Email or username already exist."
					});
				}
			});
        });
        app.get("/login", function (request, result) {
			result.render("login");
        });
        
        app.post("/login", function (request, result) {
			var email = request.fields.email;
			var password = request.fields.password;
			database.collection("users").findOne({
				"email": email
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Email does not exist"
					});
				} else {
					bcrypt.compare(password, user.password, function (error, isVerify) {
						if (isVerify) {
							var accessToken = jwt.sign({ email: email }, accessTokenSecret);
							database.collection("users").findOneAndUpdate({
								"email": email
							}, {
								$set: {
									"accessToken": accessToken
								}
							}, function (error, data) {
								result.json({
									"status": "success",
									"message": "Login successfully",
									"accessToken": accessToken,
									"profileImage": user.profileImage
								});
							});
						} else {
							result.json({
								"status": "error",
								"message": "Password is not correct"
							});
						}
					});
				}
			});
		});
		app.post("/getUser", function (request, result) {
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					result.json({
						"status": "success",
						"message": "Record has been fetched.",
						"data": user
					});
				}
			});
		});
		app.get("/logout", function (request, result) {
			result.redirect("/login");
		});

        app.get("/updateProfile", function (request, result) {
			result.render("updateProfile");
		});

		app.post("/uploadCoverPhoto",function (request, result) {
			var accessToken = request.fields.accessToken;
			var coverPhoto = "";
		
		
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
				
						coverPhoto = "public/uploads/"  + request.files.coverPhoto.name;
				  
						fileSystem.rename(request.files.coverPhoto.path, coverPhoto, function (error) {
							//
						});

						database.collection("users").updateOne({
							"accessToken": accessToken
						}, {
							$set: {
								"coverPhoto": coverPhoto
							}
						}, function (error, data) {
							result.json({
								"status": "status",
								"message": "Cover photo has been updated.",
								data: mainURL + "/" + coverPhoto
							});
						});
					// } else {
					// 	result.json({
					// 		"status": "error",
					// 		"message": "Please select valid image."
					// 	});
					// }
				}
			});
		});


		app.post("/uploadProfileImage", function(request, result) {
			var accessToken = request.fields.accessToken;
			var profileImage = "";
		
		
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					// if (request.files.profileImage.size > 0 && request.files.profileImage.type.includes("image")) {

					// 	if (user.profileImage != "") {
					// 		fileSystem.unlink(user.profileImage, function (error) {
					// 			//
					// 		});
					// 	}

						profileImage = "public/uploads/"  + request.files.profileImage.name;
						
						fileSystem.rename(request.files.profileImage.path, profileImage, function (error) {
							//
						});

						database.collection("users").updateOne({
							"accessToken": accessToken
						}, {
							$set: {
								"profileImage": profileImage
							}
						}, function (error, data) {
							result.json({
								"status": "status",
								"message": "Profile image has been updated.",
								data: mainURL + "/" + profileImage
							});
						});
					// } else {
					// 	result.json({
					// 		"status": "error",
					// 		"message": "Please select valid image."
					// 	});
					// }
				}
			});
		});
		app.post("/updateProfile", function (request, result) {
			var accessToken = request.fields.accessToken;
			var name = request.fields.name;
			var dob = request.fields.dob;
			var city = request.fields.city;
			var country = request.fields.country;
			var aboutMe = request.fields.aboutMe;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("users").updateOne({
						"accessToken": accessToken
					}, {
						$set: {
							"name": name,
							"dob": dob,
							"city": city,
							"country": country,
							"aboutMe": aboutMe
						}
					}, function (error, data) {
						result.json({
							"status": "status",
							"message": "Profile has been updated."
						});
					});
				}
			});
		});

		app.get("/search/:query", function (request, result) {
			var query = request.params.query;
			result.render("search", {
				"query": query
			});
		});
		app.post("/search", function (request, result) {
			var query = request.fields.query;
			database.collection("users").find({
				"name": {
					$regex: ".*" + query + ".*",
					$options: "i"
				}
			}).toArray(function (error, data) {
				database.collection('groups').find({
					'name' : {
						$regex: ".*" + query + ".*",
						$options: "i"
					}
				}).toArray(function(error,groups){
					
					result.json({
					"status": "success",
					"message": "Record has been fetched",
					"data": data,
					'groups' :groups
				});
				})
				
			});
		});
		app.post("/sendFriendRequest", (request,result) => {
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "Bạn chưa đăng nhập, vui lòng đăng nhập"
					});
				}else{
					var me = user; 
					database.collection("users").findOne({
						"_id" : ObjectId(_id)
					}, function(error, user){
						if(user == null){
							result.json({
								"status": "error",
								"message": "Tai khoan khong ton tai"
							});
						}else{
							database.collection("users").updateOne({
								"_id" : ObjectId(_id)
							},{
								$push: {
									"friends": {
										"_id" : me._id,
										"name" : me.name,
										"profileImage": me.profileImage,
										"status" : "Pending",
										"sentByMe": false,
										"inbox" :[]
									}
								}
							}, function(error,data){
								database.collection("users").updateOne({
									"_id": me._id
								},{
									$push :{
										"friends":{
											"_id": user._id,
											"name" : user.name,
											"profileImage" : user.profileImage,
											"status" : "pending",
											"sentByMe": true,
											"inbox":[]
										}
									}
								}, function(error,data){
									result.json({
										"status":"success",
										"message": "Da gui loi moi ket ban"
									});
								});
							});
						}
					});
				}
			});
		});
		
		app.get("/friends", function (request, result) {
			result.render("friends");
		});

		app.post('/acceptFriendRequest',function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			
			database.collection('users').findOne({
				'accessToken' : accessToken
			}, function(error,user){
				if(user == null){
					result.json({
						'status' : 'error',
						'message': 'Bạn chưa đăng nhập'
					});
				}else{
					var me = user;
					database.collection('users').findOne({
						'_id': ObjectId(_id) 
					}, function(error, user){
						if(user == null){
							result.json({
								'status': 'error',
								'message': 'User khong ton tai'
							});
						}else{
							database.collection('users').updateOne({
								'_id':ObjectId(_id)
							}, {
								$push: {
									'notifications':{
										'id': ObjectId(),
										'type': 'friend_request_accepted',
										'content': me.name + 'accepted your friend request.',
										'profileImage' : me.profileImage,
										'createAt': new Date().getTime()
									}
								}

							});
							database.collection('users').updateOne({
								$and: [{
									'_id' : ObjectId(_id)
								}, {
									'friends._id': me._id
								}]
							}, {
								$set: {
									'friends.$.status': 'Accepted'
								}
							}, function(error, data){
								database.collection('users').updateOne({
									$and:[{
										'_id': me._id
									}, {
										'friends._id': user._id
									}]
								},{
									$set:{
										'friends.$.status': 'Accepted'
									}
								}, function(error,data){
									result.json({
										'status' : 'success',
										'message': 'Friend request has been accepted.'
									});
								});
							});
						}
					});
				}
			});
		});
		app.post('/unfriend',function(request,result){
		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		database.collection('users').findOne({
			'accessToken' : accessToken
		}, function(error,user){
			if(user == null){
				result.json({
					'status': 'error',
					'message': 'Ban phai dang nhap'
				});
			}else{
				var me = user;
				database.collection('users').findOne({
					'_id' : ObjectId(_id)
				}, function(error, user){
					if(user == null){
						result.json({
							'status' : 'error',
							'message' : 'User khong ton tai'
						});
					}else{
						database.collection('users').updateOne({
							'_id': ObjectId(_id)
						}, {
							$pull: {
								'friends': {
									'_id': me._id
								}
							}
						}, function(error, data){
							database.collection('users').updateOne({
								'_id':me._id
							},{
								$pull :{
									'friends' : {
										'_id': user._id
									}
								}
							},function(error,data){
								result.json({
									'status':'success',
									'message': 'Friend has been removed.'
								});
							});
						});
					}
				})
			}
		})
	});
		app.get("/user/:username", function (request, result) {
		database.collection("users").findOne({
			"username": request.params.username
		}, function (error, user) {
			if (user == null) {
				result.send({
					"status": "error",
					"message": "User does not exists"
				});
			} else {
				result.render("userProfile", {
					"user": user
				});
			}
		});
	});
		app.get("/post/:id", function (request, result) {
		database.collection("posts").findOne({
			"_id": ObjectId(request.params.id)
		}, function (error, post) {
			if (post == null) {
				result.send({
					"status": "error",
					"message": "Post does not exist."
				});
			} else {
				result.render("postDetail", {
					"post": post
				});
			}
		});
	});	
		app.post("/addPost",  function (request, result) {
		
		var accessToken = request.fields.accessToken;
		var caption = request.fields.caption;
		var image = "";
		var video = "";
		var type = request.fields.type;
		
		var _id = request.fields._id;
		database.collection("users").findOne({
			"accessToken": accessToken
		}, function (error, user) {
			if (user == null) {
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {
				
				if (request.files.image.size > 0 && request.files.image.type.includes("image")) {
					image = "public/images/" + request.files.image.name;
					fileSystem.rename(request.files.image.path, image, function (error) {
					 	
					 });
				}			
				const imagePath = path.join(__dirname, '/public/images/');

				if (request.files.video.size > 0 && request.files.video.type.includes("video")) {
					video = "public/videos/" + request.files.video.name;
					fileSystem.rename(request.files.video.path, video, function (error) {
						//
					});
				}

				database.collection("posts").insertOne({
					"caption": caption,
					"image": image,
					"video": video,
					"type": type,
					"createdAt": datenow,
					"likers": [],
					"comments": [],
					"shares": [],
					"user": {
						"_id": user._id,
						"name": user.name,
						"username": user.username,
						"profileImage": user.profileImage
					}
				}, function (error, data) {
				

					database.collection("users").updateOne({
						"accessToken": accessToken
					}, {
						$push: {
							"posts": {
								"_id": data.insertedId,
								"caption": caption,
								"image": image,
								"video": video,
								"type": type,
								"createdAt": datenow,
								"likers": [],
								"comments": [],
								"shares": []
							}
						}
					}, function (error, data) {
					
						result.json({
							"status": "success",
							"message": "Post has been uploaded."
						});
					});
				});
			}
		});
	});

		app.post("/getNewsfeed", function (request, result) {
		var accessToken = request.fields.accessToken;
		database.collection("users").findOne({
			"accessToken": accessToken
		}, function (error, user) {
			if (user == null) {
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {

				var ids = [];	
				ids.push(user._id);
				
				database.collection("posts")
				.find({
					"user._id": {
						$in: ids
					}
				})
				.sort({
					"createdAt": -1
				})
				.limit(3)
				.toArray(function (error, data) {
					
					result.json({
						"status": "success",
						"message": "Record has been fetched",
						"data": data
					});
				
				
				});
			}
		});
	});
	app.post("/getpostio", function (request, result) {
		var accessToken = request.fields.accessToken;
		database.collection("users").findOne({
			"accessToken": accessToken
		}, function (error, user) {
			if (user == null) {
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {

				var ids = [];
				
				ids.push(user._id);
				
				database.collection("posts")
				.find({
					"user._id": {
						$in: ids
					}
				})
				.sort({
					"createdAt": -1
				})
				.limit(2)
				.toArray(function (error, data) {
					socketIO.emit('getNewsfeedIO',{
						'data' :data
					});
					result.json({
						"status": "success",
						"message": "Record has been fetched",
						
					});
				
				});
			}
		});
	});
		app.post("/toggleLikePost", function (request, result) {

		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;

		database.collection("users").findOne({
			"accessToken": accessToken
		}, function (error, user) {
			if (user == null) {
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {

				database.collection("posts").findOne({
					"_id": ObjectId(_id)
				}, function (error, post) {
					if (post == null) {
						result.json({
							"status": "error",
							"message": "Post does not exist."
						});
					} else {

						var isLiked = false;
						for (var a = 0; a < post.likers.length; a++) {
							var liker = post.likers[a];

							if (liker._id.toString() == user._id.toString()) {
								isLiked = true;
								break;
							}
						}

						if (isLiked) {
							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$pull: {
									"likers": {
										"_id": user._id,
									}
								}
							}, function (error, data) {

								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}]
								}, {
									$pull: {
										"posts.$[].likers": {
											"_id": user._id,
										}
									}
								});

								result.json({
									"status": "unliked",
									"message": "Post has been unliked."
								});
							});
						} else {

							database.collection("users").updateOne({
								"_id": post.user._id
							}, {
								$push: {
									"notifications": {
										"_id": ObjectId(),
										"type": "photo_liked",
										"content": user.name + " has liked your post.",
										"profileImage": user.profileImage,
										"isRead": false,
										"post": {
											"_id": post._id
										},
										"createdAt": new Date().getTime()
									}
								}
							});

							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$push: {
									"likers": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage
									}
								}
							}, function (error, data) {

								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}]
								}, {
									$push: {
										"posts.$[].likers": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage
										}
									}
								});

								result.json({
									"status": "success",
									"message": "Post has been liked."
								});
							});
						}

					}
				});

			}
		});
	});

		app.post("/postComment", function (request, result) {

		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		var comment = request.fields.comment;
		var createdAt = new Date().getTime();

		database.collection("users").findOne({
			"accessToken": accessToken
		}, function (error, user) {
			if (user == null) {
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {

				database.collection("posts").findOne({
					"_id": ObjectId(_id)
				}, function (error, post) {
					if (post == null) {
						result.json({
							"status": "error",
							"message": "Post does not exist."
						});
					} else {

						var commentId = ObjectId();

						database.collection("posts").updateOne({
							"_id": ObjectId(_id)
						}, {
							$push: {
								"comments": {
									"_id": commentId,
									"user": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage,
									},
									"comment": comment,
									"createdAt": createdAt,
									"replies": []
								}
							}
						}, function (error, data) {

							if (user._id.toString() != post.user._id.toString()) {
								database.collection("users").updateOne({
									"_id": post.user._id
								}, {
									$push: {
										"notifications": {
											"_id": ObjectId(),
											"type": "new_comment",
											"content": user.name + " commented on your post.",
											"profileImage": user.profileImage,
											"post": {
												"_id": post._id
											},
											"isRead": false,
											"createdAt": new Date().getTime()
										}
									}
								});
							}

							database.collection("users").updateOne({
								$and: [{
									"_id": post.user._id
								}, {
									"posts._id": post._id
								}]
							}, {
								$push: {
									"posts.$[].comments": {
										"_id": commentId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
										},
										"comment": comment,
										"createdAt": createdAt,
										"replies": []
									}
								}
							});

							database.collection("posts").findOne({
								"_id": ObjectId(_id)
							}, function (error, updatePost) {
								result.json({
									"status": "success",
									"message": "Comment has been posted.",
									"updatePost": updatePost
								});
							});
						});

					}
				});
			}
		});
	});
		app.post("/postReply", function (request, result) {

		var accessToken = request.fields.accessToken;
		var postId = request.fields.postId;
		var commentId = request.fields.commentId;
		var reply = request.fields.reply;
		var createdAt = new Date().getTime();

		database.collection("users").findOne({
			"accessToken": accessToken
		}, function (error, user) {
			if (user == null) {
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {

				database.collection("posts").findOne({
					"_id": ObjectId(postId)
				}, function (error, post) {
					if (post == null) {
						result.json({
							"status": "error",
							"message": "Post does not exist."
						});
					} else {

						var replyId = ObjectId();

						database.collection("posts").updateOne({
							$and: [{
								"_id": ObjectId(postId)
							}, {
								"comments._id": ObjectId(commentId)
							}]
						}, {
							$push: {
								"comments.$.replies": {
									"_id": replyId,
									"user": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage,
									},
									"reply": reply,
									"createdAt": createdAt
								}
							}
						}, function (error, data) {

							database.collection("users").updateOne({
								$and: [{
									"_id": post.user._id
								}, {
									"posts._id": post._id
								}, {
									"posts.comments._id": ObjectId(commentId)
								}]
							}, {
								$push: {
									"posts.$[].comments.$[].replies": {
										"_id": replyId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
										},
										"reply": reply,
										"createdAt": createdAt
									}
								}
							});

							database.collection("posts").findOne({
								"_id": ObjectId(postId)
							}, function (error, updatePost) {
								result.json({
									"status": "success",
									"message": "Reply has been posted.",
									"updatePost": updatePost
								});
							});
						});

					}
				});
			}
		});
	});
		app.post("/sharePost", function (request, result) {

		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		var type = "shared";
		var createdAt = new Date().getTime();

		database.collection("users").findOne({
			"accessToken": accessToken
		}, function (error, user) {
			if (user == null) {
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {

				database.collection("posts").findOne({
					"_id": ObjectId(_id)
				}, function (error, post) {
					if (post == null) {
						result.json({
							"status": "error",
							"message": "Post does not exist."
						});
					} else {
						
						database.collection("posts").updateOne({
							"_id": ObjectId(_id)
						}, {
							$push: {
								"shares": {
									"_id": user._id,
									"name": user.name,
									"profileImage": user.profileImage
								}
							}
						}, function (error, data) {

							database.collection("posts").insertOne({
								"caption": post.caption,
								"image": post.image,
								"video": post.video,
								"type": type,
								"createdAt": createdAt,
								"likers": [],
								"comments": [],
								"shares": [],
								"user": {
									"_id": user._id,
									"name": user.name,
									"gender": user.gender,
									"profileImage": user.profileImage
								}
							}, function (error, data) {

								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}]
								}, {
									$push: {
										"posts.$[].shares": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage
										}
									}
								});

								result.json({
									"status": "success",
									"message": "Post has been shared."
								});
							});
						});
					}
				});
			}
		});
	});

		app.get("/inbox", function (request, result) {

		result.render("inbox");
	});

		app.get("/notifications", function (request, result) {
		result.render("notifications");
	});

		app.post("/markNotificationsAsRead", function (request, result) {
		var accessToken = request.fields.accessToken;

		database.collection("users").findOne({
			"accessToken": accessToken
		}, function (error, user) {
			if (user == null) {
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {
				database.collection("users").updateMany({
					$and: [{
						"accessToken": accessToken
					}, {
						"notifications.isRead": false
					}]
				}, {
					$set: {
						"notifications.$.isRead": true
					}
				}, function (error, data) {
					result.json({
						"status": "success",
						"message": "Notifications has been marked as read."
					});
				});
			}
		});
	});

		app.post('/getFriendsChat', function(request,result){
		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		database.collection('users').findOne({
			'accessToken': accessToken
		}, function(error, user){
			if(user == null){
				result.json({
					'status': 'error',
					'message': 'vui long dang nhap'
				});
			}else{
				var index = user.friends.findIndex(function(friend){
					return friend._id == _id;
				});
				var inbox = user.friends[index].inbox;
				
				result.json({
					'status': 'success',
					'message': 'Record has been fetched',
					'data': inbox
				});
			}
		})
	});

		app.post('/sendMessage',function(request,result){

		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		var message = request.fields.message;
		// console.log(message)
		 
		//var image = request.files.image.name;
			image = "public/inboximage/" + request.files.image.name;
			fileSystem.rename(request.files.image.path, image, function (error) {
				 
			 });
				
		const imagePath = path.join(__dirname, '/public/inboximage/');

	
		if(message != ''){
			database.collection('users').findOne({
				'accessToken' : accessToken		
			},function(error,user){
				if(user == null){
					result.json({
						'status': 'error',
						'message': 'Vui lòng đăng nhập'
					});
				}else{
					var me = user;
					database.collection('users').findOne({
						'_id' : ObjectId(_id)
					},function(error, user){
						if(user == null){
							result.json({
								'status' : 'error',
								'message': 'User không tồn tại'
							});
						}else{
							database.collection('users').updateOne({
								$and: [{
									'_id': ObjectId(_id)
								},{
									'friends._id': me._id
								}]
							},{
								$push:{
									'friends.$.inbox': {
										'_id':ObjectId(),
										'message' : message,
										
										'create_at': datenow,
										'from' : me._id
									}
								}
							},function(error,data){
								database.collection('users').updateOne({
									$and: [{
										'_id': me._id
									},{
										'friends._id': user._id
									}]
								},{
									$push:{
										'friends.$.inbox':{
											'_id': ObjectId(),
											'message': message,
										
											
											'from': me._id,
											'create_at': datenow
										}
									
									}
								}, function(error, data){
							
	
								socketIO.to(users[user._id]).emit('messageReceived',{
										'message' : message,
										
										'from' : me._id,
										'create_at': datenow
									});
									result.json({
										'status':'success',
										'message': 'Dã gửi tin nhắn'
									});
								});
									
								});
						}
					});
				}
			});
		}else{
			database.collection('users').findOne({
				'accessToken' : accessToken		
			},function(error,user){
				if(user == null){
					result.json({
						'status': 'error',
						'message': 'Vui lòng đăng nhập'
					});
				}else{
					var me = user;
					database.collection('users').findOne({
						'_id' : ObjectId(_id)
					},function(error, user){
						if(user == null){
							result.json({
								'status' : 'error',
								'message': 'User không tồn tại'
							});
						}else{
							database.collection('users').updateOne({
								$and: [{
									'_id': ObjectId(_id)
								},{
									'friends._id': me._id
								}]
							},{
								$push:{
									'friends.$.inbox': {
										'_id':ObjectId(),
										'image' : image,
									
										'from' : me._id,
										'create_at': datenow

									}
								}
							},function(error,data){
								database.collection('users').updateOne({
									$and: [{
										'_id': me._id
									},{
										'friends._id': user._id
									}]
								},{
									$push:{
										'friends.$.inbox':{
											'_id': ObjectId(),
											'image' : image,
									
											'from': me._id,
											'create_at': datenow
										}
									
									}
								}, function(error, data){
							
	
								socketIO.to(users[user._id]).emit('messageReceived',{

										'image' : image,
										'from' : me._id,
										'create_at': datenow
									});
									result.json({
										'status':'success',
										'message': 'Dã gửi tin nhắn'
									});
								});
									
								});
						}
					});
				}
			});
		}
			
	
	
	});

		app.post('/connectSocket',function(request,result){
		var accessToken = request.fields.accessToken;
		database.collection('users').findOne({
			'accessToken': accessToken
		},function(error, user){
			if(user == null){
				result.json({
					'status':'error',
					'message': 'Vui long dang nhap'
				});
			}else{ 
			
				users[user._id] = socketID;
				
				// socketIO.emit('sendSocketID', {
				// 	'socketID' :socketID
				// })
				socketIO.sockets.emit('sendSocketID', {
					'socketID' :socketID
							})
				result.json({
					'status': 'status',
					'message': ' Socket has been connected'
				})
			}
		})
	});

		app.post('/connectSocketRoom',function(request,result){
		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		
		database.collection('groups').find({
			'_id' : ObjectId(_id)
		}).toArray(function(error,room){
			idRoom = _id;
			
			
			
		});
	
	});

		app.get("/groups", function (request, result) {
			result.render("groups");
		});

		app.get('/creategroup', function(request, result) {
			result.render("creategroup");
		});


		app.post('/creategroup', function(request,result) {
			var accessToken = request.fields.accessToken;
			
			var name = request.fields.name;
			var coverPhoto = '';

			database.collection('users').findOne({
				'accessToken' : accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						'status' 	: 'error',
						'message' 	: 'Vui lòng đăng nhập' 
					});
				}else{
					 if(request.files.coverphoto.size > 0 && request.files.coverphoto.type.includes('image')){
						coverPhoto = 'public/images/' + request.files.coverphoto.name;

						
						fileSystem,fileSystem.rename(request.files.coverphoto.path, coverPhoto, function(error){

						});
			database.collection('groups').insertOne({
				'name' : name,
				'coverPhoto' : coverPhoto,
				'members' : [{
					'_id' : user._id,
					'name' : user.name,
					'profileImage' : user.profileImage,
					'status' : 'Accepted'
				}],
				'user' : {
					'_id' : user._id,
					'name' : user.name,
					'profileImage' : user.profileImage
				}
			}, function(error, data){
				database.collection('users').updateOne({
					'accessToken' : accessToken
				}, {
					$push: {
						'groups' : {
							'_id' : data.insertedId,
							'name' : name,
							'coverPhoto' : coverPhoto,
							'status' : 'Accepted'
						}
					}
				
				},function(error, data){
					result.json({
						'status' 	: 'success',
						'message' 	: 'Tạo phòng thành công'
					});
				});
			});		
				}else{
						result.json({
							'status' 	: 'error',
							'message' 	: 'Vui lòng chọn ảnh'
						});
					}
				}
			});
		});

		app.post('/getGroups', function(request,result){
			var accessToken = request.fields.accessToken;

			database.collection('users').findOne({
				'accessToken' : accessToken
			}, function(error, user){
				if(user == null) {
					result.json({
						'status' : 'error',
						'message' : 'Vui lòng đăng nhập'
					})
				}else{

					database.collection('groups').find({
						// $or: [{
						// 	'user._id': user._id
						// }, {
						// 	'members._id': user._id
						// }]
					}).toArray(function(error,data){
						result.json({
							'status': 'success',
							'message' : 'Da gui data',
							'data' : data
						});
					});
				}
			});
		});

		app.post('/togglejoinGroup', function(request, result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;

			database.collection('users').findOne({
				'accessToken' : accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						'status' : 'error',
						'message' : 'Vui lòng đăng nhập'
					});
				}else{
					database.collection('groups').findOne({
						'_id' : ObjectId(_id)
					}, function(error, group){
						if(group == null){
							result.json({
								'status' : 'error',
								'message': 'Nhóm không tồn tại'
							});
						}else{
							var isMember = false;
							for(var a= 0; a < group.members.length; a++){
								var member = group.members[a];
								if(member._id.toString() == user._id.toString()){
									isMember = true;
									break;
								}
							}
						if(isMember){

							database.collection('groups').updateOne({
								'_id': ObjectId(_id)
							}, {
								$pull: {
									'members': {
										'_id': user._id
									}
								}
							},function(error,data){
								database.collection('users').updateOne({
									'accessToken': accessToken}, {
										$pull : {
											'groups' : {
											'_id' : ObjectId(_id)
											}
										}
									}, function(error, data){
										result.json({
											'status' : 'leaved',
											'message' : 'roi khoi nhom'
										});
									});
								});
							}else{
								database.collection('groups').updateOne({
									'_id' : ObjectId(_id)
								}, {
									$push : {
										'members' :{
											'_id' : user._id,
											'name' : user.name,
											'profileImage' : user.profileImage,
											'status' : 'Pending'
										}
									}
								},function(error, data){
									database.collection('users').updateOne({
										'accessToken' : accessToken
									},{
										$push : {
											'groups' : {
												'_id' : group._id,
												'name' : group.name,
												'coverPhoto' : group.coverPhoto,
												'status' : 'Pending'
											}
										}
									}, function(error,data){
										database.collection('users').updateOne({
											'_id' : group.user._id
										}, {
											$push : {
												'notifications': {
													'_id' : ObjectId(),
													'type' : 'Group_join_request',
													'content' : user.name + ' sent a request to join your group',
													'profileImage' : user.profileImage,
													'groupId' : group._id,
													'userId' : user._id,
													'status' : 'Pending',
													'createdAt' : new Date().getTime()
												}
											}
										});
										result.json({
											'status' : 'success',
											'message' : 'Request to join group has been sent'
										});
									});
								});	
							}
						}	
						});
					}

				});

			});

		app.post('/acceptRequestJoinGroup',function(request,result){

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var groupId = request.fields.groupId;
			var userId = request.fields.userId;

			database.collection('users').findOne({
				'accessToken' :accessToken
			}, function(error,user){
				if(user == null) {
					result.json({
						'status' : 'error',
						'message' : 'Vui long dang nhap'
					})
				}else{
					database.collection('groups').findOne({
						'_id': ObjectId(groupId)
					}, function(error, group){
						if(group == null){
							result.json({
								'status' : 'error',
								'message' : 'nhom khong ton tai'
							});
						}else{
							if(group.user._id.toString() != user._id.toString()){
								result.json({
									'status' : 'error',
									'message' : 'sorry, you do not own this group'
								});
								return;
							}
							database.collection('groups').updateOne({
								$and: [{
									'_id' : group._id
								}, {
									'members._id' : ObjectId(userId)
								}]
							}, {
								$set:{
									'members.$.status' : 'Accepted'
								}
							}, function(error, data){
								database.collection('users').updateOne({
									$and: [{
										'accessToken' : accessToken
									}, {
										'notifications.groupId' : group._id
									}]
								}, {
									$set: {
										'notifications.$.status' : 'Accepted'
									}
								},function(error, data){
									database.collection('users').updateOne({
										$and: [{
											'_id' : ObjectId(userId)
										},{
											'groups._id' : group._id
										}]
									},{
										$set : {
											'groups.$.status': 'Accepted'
										}
									}, function(eror, data){
										result.json({
											'status' : 'success',
											'message' : 'Group join request has been accepted'
										});
									});
								});
							});
						}
					});
				}
			});
		});

		app.post('/rejectRequestJoinGroup', function(request, result) {

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var groupId = request.fields.groupId;
			var userId = request.fields.userId;

			database.collection('users').findOne({
				'accessToken' :accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						'status' : 'error',
						'message' : 'vui long dang nhap'
					});
				}else{
					database.collection('groups').findOne({
						'_id' : ObjectId(groupId)
					}, function(error, group){
						if(group == null){
							result.json({
								'status' : 'error',
								'message' : 'nhom khong ton tai'
							});
						}else{

							if(group.user._id.toString() != user._id.toString()){
								result.json({
									'status' : 'error',
									'message' : 'Sorry , you do not own this group'
								});
								return;
							}
							database.collection('groups').updateOne({
								'_id' : group._id
							}, {
								$pull : {
									'members' : {
										'_id' : ObjectId(userId)
									}
								}
							}, function(error ,data){
								database.collection('users').updateOne({
									'accessToken' :accessToken
								}, {
									$pull : {
										'notifications' :{
											'groupId' : group._id
										}
									}
								}, function(error, data){
									database.collection('users').updateOne({
										'_id' : ObjectId(userId)
									},{
										$pull : {
											'groups' : {
												'_id' : group._id
											}
										}
									}, function(error, data){
										
										result.json({
											'status' : 'success',
											'message' : 'Group join request has been rejected'
										});
										});
									});
								});
						}
					});
				}
			})

		});

		app.get('/inboxRoom', function(request,result){
			result.render('inboxRoom')
		});

		app.post('/sendMessRoom', function(request,result){
			var _id = request.fields._id;
			
			var accessToken = request.fields.accessToken;
			var message = request.fields.message;
			image = "public/inboximage/" + request.files.image.name;
			fileSystem.rename(request.files.image.path, image, function (error) {
				 
			 });
				
		const imagePath = path.join(__dirname, '/public/inboximage/');

		if(message != ''){
			database.collection('users').findOne({
				'accessToken' : accessToken
			}, function(error,user){
				if(user == null) {
					result.json({
						'status' : 'error',
						'message': 'User không tồn tại'
					});
				}else{
					database.collection('groups').findOne({
						'_id' : ObjectId(_id)
					},function(error, room){
						if(room == null){
							result.json({
								'status' : 'error',
								'message': 'Phòng không tồn tại'
							});
						}else{
					
					
							database.collection('chatsRoom').insertOne({
								'message' 	: message,
								'userName' 	: user.name,
								'iduser'	: user._id,
								'room' 		: room._id ,
								'create_at' : datenow
							},function(error, data){
								var name = user._id;
								
								socketIO.emit("messageReceivedRoom",{
									'message' 	: message,
									'from'		: room._id,
									'fromuser'	: name,
									'create_at'	: datenow,
								});
								result.json({
									'status':'success',
									'message': 'Dã gửi tin nhắn'
								});
							});	
						}
						
					})
				}
			})
		}else{
	
			database.collection('users').findOne({
				'accessToken' : accessToken
			}, function(error,user){
				if(user == null) {
					result.json({
						'status' : 'error',
						'message': 'User không tồn tại'
					});
				}else{
					database.collection('groups').findOne({
						'_id' : ObjectId(_id)
					},function(error, room){
						if(room == null){
							result.json({
								'status' : 'error',
								'message': 'Phòng không tồn tại'
							});
						}else{
					
					
							database.collection('chatsRoom').insertOne({
								'image' 	: image,
								'userName' 	: user.name,
								'iduser'	: user._id,
								'room' 		: room._id ,
								'create_at' : datenow
							},function(error, data){
								var name = user._id;
							
								socketIO.emit("messageReceivedRoom",{
									'image' 	: image,
									'from'		: room._id,
									'fromuser'	: name,
									'create_at'	: datenow,
								});
								result.json({
									'status':'success',
									'message': 'Dã gửi tin nhắn'
								});
							});	
						}
						
					})
				}
			})
		}
		
			
		});


		app.post('/getRoomsChat',function(request,result) {
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			
			database.collection('groups').findOne({
				'_id': ObjectId(_id)
			}, function(error, room){
				if(room == null){
					result.json({
						'status': 'error',
						'message': 'khong ton tai room'
					});
				}else{
					database.collection('chatsRoom').find({
						'room' : room._id
					}).toArray(function(error,data) {
						
						result.json({
						"status": "success",
						"message": "Record has been fetched",
						"data": data,
						'room': room,
					});
					})

		
					
				}
			});
		});

		app.post('/kickmember',(request,result) =>{
			var userId = request.fields._id;
			var roomId = request.fields.roomId;
			var accessToken = request.fields.accessToken;
			database.collection('groups').findOne({
				'_id' : ObjectId(roomId)
			}, (error,room) => {
				if(room == null){
					result.json({
						'status' : error,
						'message' : 'Nhóm không tồn tại',
					});
				}else{

					database.collection('groups').updateOne({
						'_id' : ObjectId(roomId)},{
							$pull : {
								'members' : {
									'_id' : ObjectId(userId)
								}
							}
						},(error,data) => {
							database.collection('users').updateOne({
								'_id' : ObjectId(userId)
							}, {
								$pull: {
									'groups' : {
										'_id' : ObjectId(roomId)
									}
								}
							});
							database.collection('groups').find({

							}).toArray(function(error,data) {
								socketIO.sockets.in(room1s).emit('send-new-member',{
									'data' : data
								});
							})
						
							result.json({
								'status' : 'success',
								'message' : 'Invite out of the group',
							});
						});
				}
				
			});
		});

	
		app.post('/checkUserOnline', function(request,result){
			var accessToken = request.fields.accessToken;
			database.collection('users').findOne({
				'accessToken': accessToken
			},function(error, user){
				if(user == null){
					result.json({
						'status':'error',
						'message': 'Vui long dang nhap'
					});
				}else{ 
					
					
					result.json({
						'status': 'status',
						'message': ' Socket has been connected'
					})
				}
			})


		});















		});
	});

























