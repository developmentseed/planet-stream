# planet-stream

Readable `stream` that combines the metadata from [planet.osm.org](http://planet.osm.org) with the [Augmented Diff API](https://wiki.openstreetmap.org/wiki/Overpass_API/Augmented_Diffs).

## Requirements 
- nodejs
- redis server

To try the planet stream:

1. Start a [redis](http://redis.io/) server (for now works only with redis default port)

2. Install `node` dependencies
  ```
  npm install
  ```

3. Start the service 
  ```
  npm start
  ```

## Simulator
Included in OSM Planet Stream is a simulator for generating testing data
  ```
  node bin/ops-simulator.js
  ```
