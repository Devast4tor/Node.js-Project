// import dependencies you will use
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
//setting up Express Validator
const {check, validationResult} = require('express-validator'); // ES6 standard for destructuring an object
// set up the DB connection
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/gamewebsite', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// get expression session
const session = require('express-session');

// set up the model for the header
const Header = mongoose.model('Header',{
    hname: String,
    headerImage: String
} );

// set up the model for the game
const Game = mongoose.model('Game',{
    gname: String,
    genre: String,
    image: String,
    description: String
} );

// set up the model for admin
const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});

// set up variables to use packages
var myApp = express();
myApp.use(bodyParser.urlencoded({extended:false}));

// set up session
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));

// set path to public folders and view folders

myApp.set('views', path.join(__dirname, 'views'));
//use public folder for CSS etc.
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');
//fileupload
myApp.use(fileUpload());

// set up different routes (pages) of the website

//home page
myApp.get('/', function(req, res){
    //game goes before header because it persists out side of header scope
    Game.find({}).exec(function(err, games){
        console.log(games);
        if(games){
            req.session.games = games;
        }
        Header.findOne({}).exec(function(err, header){
            console.log('header error: ' + err);
            //if header exists store in session
            console.log(header)
            if(header){
                req.session.header = header;
            }
            //create header if one doesnt
            else{
                var data = {
                    hname : "gname",
                    headerImage : "example.png"
                }
                // create an object for the model Header
                var header1 = new Header(data);
                // save the header
                header1.save().then(function(){
                    console.log('New header added');
                });
                req.session.header = header1;
            }     
            res.render('home', {games:req.session.games, header:req.session.header});
        });
    });
     // no need to add .ejs to the file name
});

// All when admin clicked get to login if not, then proceed to admin welcome screen
myApp.get('/admin',function(req, res){
    // check if the user is logged in
    if(req.session.userLoggedIn){
       res.render('admin', {header:req.session.header});
    }
    else{ // otherwise send the user to the login page
        res.redirect('/login');
    }
});

myApp.get('/viewGame/:id', function(req, res){
    //get id
    var id = req.params.id;
    //find game
    Game.findOne({_id: id}).exec(function(err, game){
        console.log('error:' + err);
        console.log('game:' + game);
        if(game){
            res.render('viewGame', {games:req.session.games, header:req.session.header, game:game});
        }else{
            res.send('No game found!');
        }
    });

});

// All games page
myApp.get('/viewGames',function(req, res){
    // check if the user is logged in
    if(req.session.userLoggedIn){
        
        Game.find({}).exec(function(err, games){
            res.render('viewGames', {games:games, header:req.session.header});
        });
        
       //res.render('viewGames');
    }
    else{ // otherwise send the user to the login page
        res.redirect('/login');
    }
});

// login page
myApp.get('/login', function(req, res){
    res.render('login', {games:req.session.games, header:req.session.header});
});

// login form post
myApp.post('/login', function(req, res){
    var user = req.body.username;
    var pass = req.body.password;

    //console.log(user);
    //console.log(pass);

    Admin.findOne({username: user, password: pass}).exec(function(err, admin){
        // log any errors
        console.log('Error: ' + err);
        console.log('Admin: ' + admin);
        if(admin){
            //store username in session and set logged in true
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            // redirect to the dashboard
            res.redirect('/admin');
        }
        else{
            res.render('login', {error: 'Sorry, cannot login!', games:req.session.games, header:req.session.header});
        }
        
    });
});

// add page
myApp.get('/addpage', function(req, res){
    if(req.session.userLoggedIn){
        res.render('addGameForm', {header:req.session.header});
    }else{
        res.redirect('/login');
    }
});





myApp.post('/addpage', [



], function(req, res){
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        //console.log(errors); // check what is the structure of errors
        res.render('addGameForm', {
            errors:errors.array()
        });
    }
    else{
        var gname = req.body.gname;
        var genre = req.body.genre;
        //nane of image
        var gameImageName = req.files.gameImage.name;
        //actual image
        var gameImage = req.files.gameImage;
        //create a path for the image
        var gameImagePath = 'public/user_images/' + gameImageName;
        // move file from temp folder to user uploads
        gameImage.mv(gameImagePath, function(err){
            console.log(err);
        });


        var gameDescription = req.body.description;
        

        var pageData = {
            gname : gname,
            genre : genre,
            image : gameImageName,
            description : gameDescription 
        }
        // create an object for the model Order
        var myGame = new Game(pageData);
        // save the order
        myGame.save().then(function(){
            console.log('New game added');
        });
        // display receipt
        res.redirect('/');
    }


});

//delete page
myApp.get('/deleteGame/:id', function(req, res){
    if(req.session.userLoggedIn){
        //delete
        var id = req.params.id;
        console.log('game id =' + id);
        Game.findByIdAndDelete({_id: id}).exec(function(err, game){
            console.log('error:' + err);
            console.log('game:' + game);
            if(game){
                res.redirect('/viewGames');
            }else{
                res.redirect('/viewGames');
            }
        });
        //res.render('deleteGame');
    }else{
        res.redirect('/login');
    }
});


//edit page
myApp.get('/editGame/:id', function(req, res){
    if(req.session.userLoggedIn){
        //edit
        var id = req.params.id;
        console.log('game id =' + id);
        Game.findOne({_id: id}).exec(function(err, game){
            console.log('error:' + err);
            console.log('game:' + game);
            if(game){
                res.render('editGame', {game:game, header:req.session.header});
            }else{
                res.send('No id found!');
            }
        });
        //res.render('deleteGame');
    }else{
        res.redirect('/login');
    }
});

myApp.post('/editGame/:id', [



], function(req, res){
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        //console.log(errors); // check what is the structure of errors
        
        Game.findOne({_id: id}).exec(function(err, game){
            console.log('error:' + err);
            console.log('game:' + game);
            if(game){
                res.render('editGame', {game:game, errors:errors.array()});
            }else{
                res.send('No id found!');
            }
        });
            /*
        res.render('editGame',{
            errors:errors.array()
        });
        */
    }
    else{
        var gname = req.body.gname;
        var genre = req.body.genre;
        //nane of image
        var gameImageName = req.files.gameImage.name;
        //actual image
        var gameImage = req.files.gameImage;
        //create a path for the image
        var gameImagePath = 'public/user_images/' + gameImageName;
        // move file from temp folder to user uploads
        gameImage.mv(gameImagePath, function(err){
            console.log(err);
        });


        var gameDescription = req.body.description;

        
        var id = req.params.id;
        console.log(id);
        Game.findOne({_id: id}).exec(function(err, game){
            game.gname = gname;
            game.genre = genre;
            game.image = gameImageName;
            game.description = gameDescription; 
            game.save();
        });


        // display receipt
        res.redirect('/viewGames');
    }


});

//header edit page
myApp.get('/editHeader', function(req, res){
    if(req.session.userLoggedIn){
        //edit
        //var id = req.session.header.id;

        //console.log('header id =' + id);
        Header.findOne({}).exec(function(err, header){
            console.log('error:' + err);
            console.log('header:' + header);
            if(header){
                res.render('editHeader', {header:header, header1:req.session.header});
            }else{
                res.send('No id found!');
            }
        });
    }else{
        res.redirect('/login');
    }
});

myApp.post('/editHeader', [



], function(req, res){
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        //console.log(errors); // check what is the structure of errors
        
        Header.findOne({}).exec(function(err, header){
            console.log('error:' + err);
            console.log('header:' + header);
            if(header){
                res.render('editHeader', {header:header, errors:errors.array()});
            }else{
                res.send('No id found!');
            }
        });

    }
    else{
        var hname = req.body.hname;
        //nane of image
        var headerImageName = req.files.headerImage.name;
        //actual image
        var headerImage = req.files.headerImage;
        //create a path for the image
        var headerImagePath = 'public/images/' + headerImageName;
        // move file from temp folder to user uploads
        headerImage.mv(headerImagePath, function(err){
            console.log(err);
        });

        
        
        //var id = req.session.header._id;
        //console.log(id);
        Header.findOne({}).exec(function(err, header){
            header.hname = hname;
            header.headerImage = headerImageName;
            header.save();
        });


        // display receipt
        res.redirect('/');
    }


});

//logout page
myApp.get('/logout', function(req, res){
    req.session.username = '';
    req.session.userLoggedIn = false;
    res.redirect('/');
    //res.render('login', { games:req.session.games, error: 'Successfully logged out', header:req.session.header});
});



// start the server and listen at a port
myApp.listen(8080);

//tell everything was ok
console.log('Everything executed fine.. website at port 8080....');


