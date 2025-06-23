require('dotenv').config();
const passport = require('passport');
require('./config/passport');
const morgan = require('morgan');
const express = require("express");
const session = require('express-session');
const db = require('./config/db');
const app = express();
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const path = require('path');
const flash = require('connect-flash');
const errorHandler = require('./middlewares/ErrorHandler'); 

db();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, 
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000,
        sameSite: 'lax' 
    }
}));

app.use(passport.initialize());
app.use(passport.session());


app.use(errorHandler);

app.use(flash());

app.use(morgan('dev'));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'views/user'),
    path.join(__dirname, 'views/admin')
]);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

module.exports = app;