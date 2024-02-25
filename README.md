# CSRF Protection with __Host Cookie

This package provides a means of CSRF protection using the double submit cookie
pattern.

## Motivation

Previous packages, I think, do not address the vulnerabilities described in

[Bypassing CSRF Protections](https://owasp.org/www-pdf-archive/David_Johansson-Double_Defeat_of_Double-Submit_Cookie.pdf)

A package may sign and/or encrypt the CSRF cookie and/or the CSRF token.  However, the
attacker then can write a program to request a form from the application.  The form
is returned with both cookie and token.  Thus armed, the attacker can set this cookie for
a specific path and subdomain associated with the application, using the
techniques described at the link above, and can perform a CSRF
attack, inserting the token into the request body.  The token used by the attacker
will correspond to the one in the cookie, and the signature and encryption will also
appear correct to the application, so these approaches don't solve the problem.

This package attempts to remedy the problem by using cookies with a __Host prefix.  Such
cookies can't be superseded by any that the attacker might set.
However, they must be set with the secure flag set to true,
which creates a problem for developers, who run the application without SSL.
This package provides a developer_mode flag, which if set to
true (the default), causes the cookie to be created without the secure flag and
without the __Host prefix.  The configuration is not secure this way, so the flag
should be set to false in production.

I think this is quite secure, but this package is to be used at your own risk, without
any warranties expressed or implied.

Since the release of this package, The csrf-csrf package has also been provided, which works much the same way. I will continue to maintain this package however.

## Use of this package

Installation: npm install host-csrf

Configuration: The csrf method is passed an optional parameter, an object with the
following properties, each of which is optional:

- protected_operations: An array of strings with the operation names that are to be monitored  
- protected_content_types: An array of strings with the content types that are monitored  
- developer_mode: a boolean, true by default  
- header_name: the name of an HTTP header that may contain the token, 
if it is not in the body or query parameters.  The default name is csrf-token. 
- cookieParams: Cookie parameters.  One can set some cookie parameters, such as the 
expires or maxAge properties (these are not set
by default) or sameSite (by default, set to "Strict").
However, the signed and httpOnly cookieParams properties are always set to
true, and if developer_mode is set to false, then secure is set to true, regardless if what is passed
in cookieParams.

The cookie name is csrfToken for developer mode, and __Host_csrfToken if developer mode is false.

POST operations on protected routes with the content types of application/x-www-form-urlencoded,
text/plain, and multipart/form-data or with no content-type header 
are always protected, i.e. they will fail if the correct CSRF token is not present.  CSRF attempts for other
operations or content types should fail because of CORS policy, so if you are
confident of your CORS configuration, you may not need any additional values.

If a request is monitored, it is rejected with an exception unless there is a
_csrf property in the req.body, or in the req.query, or a value in the header with the
configured name. The value must match the cookie.  Cookies are signed, as this is
OWASP best practice.  The cookie_parser package must be used, with
a secret set to enable cookie signing.

The csrf middleware must be in the app.use chain after cookie_parser and any body parsers
but before any of the routes you wish to protect.

Example:

```
const csrf = require('host-csrf')

app.use(cookieParser("notverysecret"));
app.use(express.urlencoded({ extended: false }));
let csrf_development_mode = true;
if (app.get("env") === "production") {
  csrf_development_mode = false;
  app.set("trust proxy", 1);
}
const csrf_options = {
  protected_operations: ["PATCH"],
  protected_content_types: ["application/json"],
  development_mode: csrf_development_mode,
};
const csrf_middleware = csrf(csrf_options); //initialise and return middlware
```
The csrf function is called for initialization, and returns the middleware.  One
can retrieve the current token with 
```
  let token = csrf.token(req, res);
```
If no token is set, this function sets the token and stores it in the cookie. The middleware
will also set the token if it is not set. Routes can be protected by adding the csrf middleware via
```
  app.use(csrf_middleware(req,res,next));
```
or, for individual routes, in the app.use for the route:
```
  app.get("/something, csrf_middleware, (req, res)=> {
    ...
  })
```
The typical way to send the token is in the body of the form as a hidden value:

```
   <input type="hidden" name="_csrf" value="<%= _csrf %>">
```
Or, if the token is to be accessed from client side JavaScript, to retrieve it via
a route like:
```
  app.get("/get_token", (req,res) => {
    const csrfToken = csrf.token();
    res.json({ csrfToken });
  })
```
It's a good practice to refresh the token as the user logs on.  You
can do this with:
```
  let token = csrf.refresh(req,res);
```
Any forms rendered before the token refresh must be re-rendered with the new token.

If CSRF token validation fails on a protected request, an error of class csrf.CSRFError is returned.

## Notes for Version 1.0.2   
- Some cookie parameters can now be specified.  
- The csrf.refresh function now returns the token as well as refreshing it.  The csrf.token function
has been added, as has the csrf.CSRFError class.
- Some rework has been done to the documentation for clarity.  

