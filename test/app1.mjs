import express from "express";
import cookieParser from "cookie-parser";
import csrf from "../index.js";
const app = express();
import fs from "fs";
app.use(express.json({ limit: "1kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser("not a good secret at all"));
const csrfMiddleware = csrf.csrf({
  protectedOperations: ["PATCH", "PUT", "DELETE"],
});
app.get("/", (req, res) => {
  res.send("Unprotected route");
});

app.post("/csrfOn", (req, res) => {
  const token = csrf.getToken(req, res);
  res.json({ token });
});

app.post("/csrfOff", (req, res) => {
  csrf.clearToken(req,res);
  res.send("token cleared");
});

app.post("/", (req, res) => {
  res.send("Unprotected route");
});

app.patch("/", (req, res) => {
  res.send("Unprotected route");
});

app.post("/protected", csrfMiddleware, (req, res) => {
  res.send("protected route");
});

app.get("/protected", csrfMiddleware, (req, res) => {
  res.send("should not be protected");
});
app.put("/protected", csrfMiddleware, (req, res) => {
  res.send("protected route");
});

app.get("/protectedForm", csrfMiddleware, (req, res) => {
  const token = csrf.refreshToken();
  fs.readFile("./form.html", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      res.send("couldn't read file");
    }
    const formWithCSRF = data.replace("putCSRFTokenHere", token);
    res.send(formWithCSRF);
  });
});

app.post("/protectedForm", csrfMiddleware, (req, res) => {
  res.send("post of form succeeded");
});

app.use((req, res) => {
  res.status(404).send("bad route");
});

app.use((err, req, res, next) => {
  if (err.name === "CSRFError") {
    console.log(err.message);
    return res.status(400).send(err.message);
  }
  console.log(
    "Internal server error",
    err.constructor.name,
    JSON.stringify(err, ["name", "message", "stack"]),
  );
  res.status(500).send("internal server error");
});

let server = null;
const port = 3000;
try {
  server = app.listen(port, () =>
    console.log(`Server is listening on port ${port}...`),
  );
} catch (error) {
  console.log(error);
}


