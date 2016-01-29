# planet-stream

OSM Planet Stream creates a readable `stream` that combines the metadata from [planet.osm.org](http://planet.osm.org) with the [Augmented Diff API](https://wiki.openstreetmap.org/wiki/Overpass_API/Augmented_Diffs).


## Usage

Requirements
- nodejs
- redis server

1. To run planet-stream as a service, first create a .env file to set environment variables. There is a sample.env to use as a starting point.

2. Start a [redis](http://redis.io/) server (for now works only with redis default port)

3. Install `node` dependencies
  ```
  npm install
  ```

3. Start the service 
  ```
  node index.js
  ```

## Simulator
Included in OSM Planet Stream is a simulator for generating testing data
  ```
  bin/ops-simulator.js
  ```
