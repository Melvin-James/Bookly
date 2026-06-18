import dotenv from 'dotenv';
dotenv.config();
import passport from 'passport';
import passportConfig from './config/passport.js';
import morgan from 'morgan';
import express from 'express';
import session from 'express-session';
import db from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import path from 'path';
import flash from 'connect-flash';
import errorHandler from './middlewares/ErrorHandler.js';
import checkBlocked from './middlewares/checkBlocked.js';

const __dirname = import.meta.dirname;

const app = express();
app.set('trust proxy', true);

db();
passportConfig(passport);

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

app.get('/', (req, res) => {
    res.redirect('/user');
});

app.use('/user',checkBlocked, userRoutes);
app.use('/admin', adminRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

export default app;