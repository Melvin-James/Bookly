import User from "../models/userSchema.js";

async function checkBlocked(req, res, next) {
  try {
    if (req.session?.user?._id) {
      const freshUser = await User.findById(req.session.user._id).select("isBlocked");

      if (!freshUser || freshUser.isBlocked) {
        req.session.destroy(() => {
          return res.redirect("/user/login?blocked=true");
        });
        return;
      }
    }
    next();
  } catch (err) {
    console.error("checkBlocked middleware error:", err);
    next(err);
  }
}

export default checkBlocked;