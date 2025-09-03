const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const User = require('../models/userSchema');

module.exports = function(passport) {
  passport.use(
    new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'development'
        ? process.env.GOOGLE_CALLBACK_DEV
        : process.env.GOOGLE_CALLBACK_PROD,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {

        let user = await User.findOne({ googleId: profile.id });

        if (!user && profile.emails?.length) {
          user = await User.findOne({ email: profile.emails[0].value });
        }

        if (user) {
          if (user.isBlocked) {
            return done(null, false, { message: 'Your account has been blocked. Please contact support.' });
          }
          return done(null, user);
        } else {
          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName || 'Unnamed User',
            email: profile.emails?.[0]?.value || '',
            userImage: profile.photos?.[0]?.value ? [profile.photos[0].value] : [],
            phone: '',
            wallet: 0,
            walletTransactions: [],
            isBlocked: false,
            isAdmin: false,
            wishlist: [],
            cart: [],
            couponUsage: {},
          });

          const savedUser = await newUser.save();
          return done(null, savedUser);
        }
      } catch (err) {
        console.error('Google Auth Error:', err);
        return done(err, null);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findById(id)
      .then(user => done(null, user))
      .catch(err => done(err, null));
  });
};









































// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('../models/userSchema');
// const bcrypt = require('bcrypt');
// const crypto = require('crypto');

// passport.serializeUser((user, done) => {
//   done(null, user._id);
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }
// });

// const isProd = process.env.NODE_ENV === 'production';
// const callbackURL = isProd ? process.env.GOOGLE_CALLBACK_PROD : process.env.GOOGLE_CALLBACK_DEV;

// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: callbackURL
// }, async (accessToken, refreshToken, profile, done) => {
//   try {
//     const email = profile.emails?.[0]?.value;
//     if (!email) return done(null, false, { message: 'No email in profile' });

//     let user = await User.findOne({ email });

//     if (user) {
//       if (user.isBlocked) {
//         return done(null, false, { message: 'User is blocked' });
//       }
//       return done(null, user);
//     }

//     const newUser = await User.create({
//       name: profile.displayName,
//       email,
//       phone: "",
//       password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
//       isGoogleUser: true,
//       profilePicture: profile.photos?.[0]?.value || '',
//       isVerified: true,
//     });

//     return done(null, newUser);
//   } catch (err) {
//     console.error('Passport Google error:', err);
//     return done(err, null);
//   }
// }));
