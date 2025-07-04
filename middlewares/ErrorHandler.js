module.exports = (err, req, res, next) => {
  console.error('Error:', err.stack);

  const status = err.status || 500;
  const message = err.message || 'Something went wrong';

  if (req.xhr || req.headers.accept.includes('application/json')) {
    return res.status(status).json({
      success: false,
      message
    });
  }

  res.status(status).render('error', { message });
};
