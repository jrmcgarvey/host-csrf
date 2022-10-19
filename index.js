const { randomUUID } = require("crypto");
const protected_operations = ["POST"];
const protected_content_types = [
  "application/x-www-form-urlencoded",
  "text/plain",
  "multipart/form-data",
];
const cookieParams = {
  httpOnly: true,
  sameSite: "strict",
  signed: true,
  maxAge: 300000,
};
let cookieName = "csrfToken";
let header_name = "csrf-token";
let development_mode = true;

const find_token = (req) => {
  if (req.body && req.body._csrf) {
    return req.body._csrf;
  }
  if (req.query && req.query._csrf) {
    return req.query._csrf;
  }
  return req.get(header_name);
};

const csrf = (params) => {
  if (params) {
    if (params.protected_operations) {
      params.protected_operations.forEach((op) => {
        if (!protected_operations.includes(op)) {
          protected_operations.push(op);
        }
      });
    }
    if (params.protected_content_types) {
      params.protected_content_types.forEach((dt) => {
        if (!protected_content_types.includes(dt)) {
          protected_content_types.push(dt);
        }
      });
    }
    if ("development_mode" in params) {
      development_mode = params.development_mode;
    }
    if (params.header_name) {
      header_name = params.header_name;
    }
  }
  if (development_mode) {
    console.log("CSRF protection is not secure!");
  } else {
    cookieName = "__Host-csrfToken";
    cookieParams.secure = true;
  }
  return (req, res, next) => {
    if (!req.signedCookies || !res.cookie) {
      throw new Error(
        "CSRF protection requires cookie middleware and a cookie secret."
      );
    }
    let _csrf = null;
    if (!req.signedCookies[cookieName]) {
      _csrf = randomUUID();
      res.cookie(cookieName, _csrf, cookieParams);
    } else {
      _csrf = req.signedCookies[cookieName];
    }
    res.locals._csrf = _csrf;
    let dt_protect = false;
    let datatype = req.get("content-type");
    if (!datatype) {
      dt_protect = true;
    } else {
      dt_protect = protected_content_types.includes(datatype.toLowerCase());
    }
    if (protected_operations.includes(req.method) && dt_protect) {
      const token = find_token(req);
      if (token != _csrf) {
        throw new Error("CSRF token validation failed.");
      }
    }
    next();
  };
};

const refresh = (req,res) => {
  _csrf = randomUUID();
  res.cookie(cookieName, _csrf, cookieParams);
  res.locals._csrf = _csrf;
};

csrf.refresh = refresh;

module.exports = csrf;
