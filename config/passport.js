const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

const isProd = process.env.NODE_ENV === 'production';
const callbackURL = isProd ? process.env.GOOGLE_CALLBACK_PROD : process.env.GOOGLE_CALLBACK_DEV;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: callbackURL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(null, false, { message: 'No email in profile' });

    let user = await User.findOne({ email });

    if (user) {
      if (user.isBlocked) {
        return done(null, false, { message: 'User is blocked' });
      }
      return done(null, user);
    }

    const newUser = await User.create({
      name: profile.displayName,
      email,
      phone: '0000000000',
      password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      isGoogleUser: true,
      profilePicture: profile.photos?.[0]?.value || '',
      isVerified: true,
    });

    return done(null, newUser);
  } catch (err) {
    console.error('Passport Google error:', err);
    return done(err, null);
  }
}));
