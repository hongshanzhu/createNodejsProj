import * as express from 'express';

export let app = express();

app.get('/', function(req, res): void {
  res.send('hello typescript-gulp');
});
app.listen(8000);
