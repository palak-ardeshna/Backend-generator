function sendResponse(res, { status = 200, success = true, message = '', data = null }) {
  return res.status(status).json({
    success,
    message,
    data,
  });
}

function sendSuccess(res, { message = '', data = null, status = 200 }) {
  return sendResponse(res, { status, success: true, message, data });
}

function sendError(res, { message = '', data = null, status = 500 }) {
  return sendResponse(res, { status, success: false, message, data });
}

export { sendResponse, sendSuccess, sendError }; 