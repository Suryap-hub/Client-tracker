function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  // Never leak stack traces, raw exception text, or credential values to the client.
  const message = status >= 500 && !err.code
    ? 'Something went wrong on the server. Please try again.'
    : err.message;

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${err.code || 'ERROR'}:`, err.message);
  }

  res.status(status).json({
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
    },
  });
}

module.exports = errorHandler;
