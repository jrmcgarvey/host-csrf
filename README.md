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
cookies can't be superseded by any that the attacker might set.  However, they must be set with the secure flag set to true, which creates a problem for developers, who run the application without SSL.  This package provides a developer_mode flag, which if set to
true (the default), causes the cookie to be created without the secure flag and
without the __Host prefix.  The configuration is not secure this way, so the flag
should be set to false in production.

I think this is quite secure, but this package is to be used at your own risk, without
any warranties expressed or implied.  For defense in depth, you may also want to use
csrf-simple-origin.

## Use of this package

Installation: npm install csrf

Configuration: The csrf method is passed an optional parameter, an object with the
following properties, each of which is optional:

protected_operations: An array of strings with the operation names that are to be monitored  
protected_content_types: An array of strings with the content types that are monitored  
developer_mode: a boolean, true by default  
header_name: the name of an HTTP header that may contain the token, if it is not in the body or query parameters.  By default this is csrf-token.  

POST operations with the content types of application/x-www-form-urlencoded,
text/plain, and multipart/form-data or with no content-type header 
are always monitored.  CSRF attempts for other
operations or content types should fail because of CORS policy, so if you are
confident of your CORS configuration, you do not need to add to these, but you
may add operations or content types for defense in depth.

If a request is monitored, it is rejected with an exception unless there is a
_csrf property in the req.body, or in the req.query, or a value in the header with the
configured name. The value must match the cookie.  Cookies are signed, as this is
OWASP best practice.  The cookie_parser package or an equivalent must be used, with
a secret set to enable cookie signing.

The csrf middleware must be in the app.use chain after cookie_parser and any body parsers
but before any of the routes.

Example:

```
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
app.use(csrf(csrf_options));
```
The csrf middleware stores the token in res.locals._csrf.
The typical way to send the token is in the body of the form as a hidden value:

```
   <input type="hidden" name="_csrf" value="<%= _csrf %>">
```
It's a good practice to refresh the token when the user logs on.  You
can do this with:
```
csrf.refresh(req,res);
```
Any forms rendered before the token refresh must be re-rendered with the new token.

