const { randomUUID } = require("crypto");
const protectedOperations = ["POST","PUT", "PATCH", "DELETE", "CONNECT"];
let cookieName = "__Host-csrfToken";
let headerName = "csrf-token";
const cookieParams = {
  signed: true,
  httpOnly: true,
  sameSite: "None",
  secure: true,
};
const alternateCookieName = "csrfToken";
const alternateCookieParams = {
  signed: true,
  httpOnly: true,
  sameSite: "Strict",
};

let init = false;

class CSRFError extends Error {
  constructor(msg) {
    super(msg);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const activeCookieConfig= (req) => {
  if (
    process.env.XS_COOKIE_DEVELOPMENT_MODE == "true" &&
    !req.secure &&
    (req.hostname == "localhost" || req.hostname == "127.0.0.1")
  ) 
    return {cookieToUse: alternateCookieName, paramsToUse: alternateCookieParams}
  else
    return { cookieToUse: cookieName, paramsToUse: cookieParams }
}

const findToken = (req) => {
  if (req.body && req.body._csrf) {
    return req.body._csrf;
  }
  return req.get(headerName);
};

const csrf = (params) => {
  if (params) {
    if (params.protectedOperations) {
      params.protectedOperations.forEach((op) => {
        op = op.toUpperCase();
        if (!protectedOperations.includes(op)) {
          protectedOperations.push(op);
        }
      });
    }
    if (params.headerName) headerName = params.headerName;
    if (params.cookieName) cookieName = params.cookieName;
  }

  init = true;
  return (req, res, next) => {
    if (protectedOperations.includes(req.method)) {
      if (init) {
        const csrfToken = findToken(req);
        const { cookieToUse } = activeCookieConfig(req)
        if (
          csrfToken &&
          req.signedCookies &&
          req.signedCookies[cookieToUse] &&
          csrfToken === req.signedCookies[cookieToUse]
        ) {
          res.locals._csrf = csrfToken;
          return next();
        }
      }
      throw new CSRFError("CSRF token validation failed.");
    }
    next();
  };
};

const getToken = (req, res) => {
  let _csrf = null;
  const {cookieToUse } = activeCookieConfig(req)
  if (req.signedCookies && req.signedCookies[cookieToUse])
    _csrf = req.signedCookies[cookieToUse];
  if (!_csrf) return refreshToken(req, res);
  else {
    res.locals._csrf = _csrf;
    return _csrf;
  }
};

const refreshToken = (req, res) => {
  if (!init) {
    throw new CSRFError("CSRF middleware has not been intialized.");
  }
  const _csrf = randomUUID();
  const { cookieToUse, paramsToUse } = activeCookieConfig(req)
  res.cookie(cookieToUse, _csrf, paramsToUse);
  res.locals._csrf = _csrf;
  return _csrf;
};

const clearToken = (req,res) => {
const { cookieToUse } = activeCookieConfig(req)
  res.clearCookie(cookieToUse);
  delete res.locals._csrf;
};

module.exports = { csrf, refreshToken, getToken, clearToken };
