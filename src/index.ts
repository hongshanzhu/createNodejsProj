import * as express from "express";

let app = express();

app.get("/", function(req, res) {
  res.send("hello typescript-gulp");
});
app.listen(8000);
