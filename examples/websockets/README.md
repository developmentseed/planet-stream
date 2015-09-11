# Websockets Example

Emits the planet stream through a websocket server

1. Start a [redis](http://redis.io/) server (for now works only with redis default port)

2. Install `node` dependencies
```
npm install
```

3. Start the websocket server
```
node websocket-server.js
```

4. Visit `localhost:8000` using a web browser. Data might take about a minute to propagate from OSM to the browser.
