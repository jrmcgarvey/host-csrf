const request = require("supertest");
const { app, server } = require("./app1.js");
const agent = request.agent(app);
afterAll(() => {
  server.close();
});

let token = null;

test("set/report secure token", async () => {
  await agent.post("/clearDevMode");
  const res = await agent.post("/CSRFReport");
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body._csrf).toBeDefined();
  token = res.body.token;
  expect(res.body._csrf).toBe(token);
  console.log("at 46", res.headers);
  expect(res.headers["set-cookie"]).toBeDefined();
  const cookie = res.headers["set-cookie"][0];
  expect(cookie).toContain("__Host-othername");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=None");
  console.log(cookie);
  await agent.post("/setDevMode"); //because the agent discards secure cookies on non-HTTPS connections
});

test("GET on unprotected route", async () => {
  const res = await agent.get("/");
  expect(res.status).toBe(200);
});

test("HEAD on unprotected route", async () => {
  const res = await agent.head("/");
  expect(res.status).toBe(200);
});

test("POST on unprotected route", async () => {
  const res = await agent.head("/");
  expect(res.status).toBe(200);
});

test("GET on protected route", async () => {
  const res = await agent.get("/protected");
  expect(res.status).toBe(200);
});

test("HEAD on protected route", async () => {
  const res = await agent.head("/protected");
  expect(res.status).toBe(400);
});

test("POST on protected route", async () => {
  const res = await agent.post("/protected");
  expect(res.status).toBe(400);
});

test("set/report token", async () => {
  const res = await agent.post("/CSRFReport");
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body._csrf).toBeDefined();
  token = res.body.token;
  expect(res.body._csrf).toBe(token);
  console.log("at 46", res.headers);
  expect(res.headers["set-cookie"]).toBeDefined();
  const cookie = res.headers["set-cookie"][0];
  console.log(cookie);
});

test("report token", async () => {
  const res = await agent.post("/csrfReport");
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body._csrf).toBeDefined();
  expect(res.body.token).toBe(token);
  expect(res.body._csrf).toBe(token);
  expect(res.headers["set-cookie"]).not.toBeDefined();
});

test("refresh token", async () => {
  const res = await agent.post("/csrfOn");
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body._csrf).toBeDefined();
  expect(res.body.token).not.toBe(token);
  expect(res.body._csrf).not.toBe(token);
  token = res.body.token;
  expect(res.body._csrf).toBe(token);
  expect(res.headers["set-cookie"]).toBeDefined();
});

test("GET on protected route", async () => {
  const res = await agent.get("/protected");
  expect(res.status).toBe(200);
});

test("HEAD on protected route without token", async () => {
  const res = await agent.head("/protected");
  expect(res.status).toBe(400);
});

test("POST on protected route without token", async () => {
  const res = await agent.post("/protected");
  expect(res.status).toBe(400);
});

test("HEAD on protected route with bad token", async () => {
  const res = await agent.head("/protected").set("use-this", "bogus");
  expect(res.status).toBe(400);
});

test("POST on protected route bad token", async () => {
  const res = await agent.post("/protected").set("use-this", "bogus");
  expect(res.status).toBe(400);
});

test("PATCH on protected route bad token", async () => {
  const res = await agent.patch("/protected", { _csrf: "bogus" });
  expect(res.status).toBe(400);
});

test("HEAD on protected route with good token", async () => {
  const res = await agent.head("/protected").set("use-this", token);
  expect(res.status).toBe(200);
});

test("POST on protected route without token", async () => {
  const res = await agent.post("/protected").set("use-this", token);
  expect(res.status).toBe(200);
});

test("PATCH on protected route without token", async () => {
  const res = await agent.patch("/protected").send({ _csrf: token });
  expect(res.status).toBe(200);
});

test("POST of form data with token", async () => {
  const res = await agent
    .post("/protectedForm")
    .type("form")
    .send({ _csrf: token });
  expect(res.status).toBe(200);
});

test("Make sure token is cleared", async () => {
  await agent.post("/csrfOff");
  const res = await agent.head("/protected").set("use-this", token);
  expect(res.status).toBe(400);
});
