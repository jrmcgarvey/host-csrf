# CSRF Protection with __Host- Cookie

This package provides a means of CSRF protection using the double submit cookie pattern.

Version 2.0.0

## Motivation

The csurf package still works, but it is deprecated and unsupported.  The csrf-csrf package is clumsy to use from Commonjs.
I created this package to support students, but I think it has general use, and I will continue to support it. This 2.0 release includes many changes to make configuration and use easier.  They are breaking changes, but the package has mostly been used by students until now. 

By default, the package uses a cookie with a __Host- prefix, for additional protection.  This package is intended for use
in Express, in combination with the cookie-parser middleware.  Two patterns of use are supported.  In either case, the CSRF
cookie and token are set, typically at logon time, but before any other cookie is set that might be abused by a CSRF attack.  

1. In the case of REST APIs, the CSRF token can be returned to the caller, typically in the body of a REST response.  The token can then be stored in browser local storage, to be included with subsequent requests, typically in a header, but possibly in the body.
2. In the case of Express server side rendering, the token may be included as a hidden field in each form that is sent to the client, so that it is returned when the form is submitted.

In either case, a protected operation for a protected route will throw an error if the CSRF cookie is not set, or if the token is not conveyed in the header or body of the request, or if the conveyed token doesn't match the cookie contents.  If host-csrf throws an error, the name of the error is CSRFError.  When the csrf token is sent in the body of the request, it is with the attribute name _csrf.  In the case of an x-www-form-urlencoded response, the key name would be _csrf.  

A signed cookie is used. If cookie-parser is not configured with a secret, Express will throw an error when host-csrf attempts to set the cookie.  

## Use of this package

Installation: npm install host-csrf

Typical use:

```js
const cookieParser = require("cookie-parser")
const csrf = require("host-csrf");
app.use(cookieParser("use_a_secure_secret"))
const csrfMiddleware = csrf.csrf();
```

An options object may be passed on the `csrf.csrf()` call, with the following attributes, all optional:

cookieName: A string. By default, the cookie name is "__Host-csrfToken".  

protectedOperations: An array of strings. By default, this is ["POST","PUT", "PATCH", "DELETE", "CONNECT"], and these are always protected, but additional protected operations may be specified.

headerName: A string.  By default, this is "csrf-token".  When the token is passed in a request header, this is the header to be used.

At logon time:

```js
const csrfToken = csrf.refreshToken(req,res);  // This sets the cookie.  res.locals._csrf also holds the token.
```

A protected route:

```js
app.post("/protected", csrfMiddleware, (req,res)=>{
  ...
})
```
Several other functions:

```js
const csrfToken = csrf.getToken(req,res); // returns the existing token if set, and also stores it in res.locals._csrf.
// If the csrf cookie has not been set, this function calls refreshToken() and returns the newly created token.
// Note that refreshToken() always changes the token contents of the cookie.

csrf.clearToken(req,res); // causes the cookie to be unset, so that all access to protected routes would fail.
```

The cookie parameters are always:

- signed=true
- httpOnly=true
- secure=true
- sameSite="None"

It's best to do:

```js
app.set("trust proxy", 1)
```
for production deployment, because a proxy is terminating the HTTPS connection in this case.

## Development Mode

When set by the back end in a response to a REST API, a cookie is a cross-site cookie.  Therefore, it must be secure, with SameSite=None.  However, when one is developing, it is clumsy to set up HTTPS. Even for non-HTTPS connections, Express will issue a Set-Cookie header with the options above, but browsers such as Chrome will not accept such cookies over a non-HTTPS connection, except for one case, which is when the response is coming from localhost.  This browser behavior enables development. But, suppose one is testing with Postman.  Postman does not allow secure cookies over non-HTTPS connections, even for localhost.  This is annoying -- Postman is intended to simulate browser behavior, and in this case, it doesn't do so with fidelity.  It is also not possible to use a __Host- prefix in a cookie name when using Postman for a non-HTTPS connection.  These problems also apply to the supertest agent.  To address this, one can set the following environment variable before starting the Express application:

```bash
export XS_COOKIE_DEVELOPMENT_MODE=true
```

If

- this environment variable is set to true, and
- the connection is not HTTPS, and
- the request is coming to localhost or 127.0.0.1

then, the following cookie options are used by host-csrf:

- signed=true
- httpOnly=true
- sameSite="Strict"

In addition, the cookie name used in this case is `csrfToken`.

This way, testing with Postman and the supertest agent works.  In addition, if a front end application that is listening on a localhost port makes a REST call to a back end also listening on localhost, the cookie is not considered a cross site cookie by the browsers, so the cookie options above work.  One would not want or need the environment variable in production. 
