# planet-stream

OSM Planet Stream creates a readable `stream` that combines the metadata from [planet.osm.org](http://planet.osm.org) with the [Augmented Diff API](https://wiki.openstreetmap.org/wiki/Overpass_API/Augmented_Diffs).


## Usage

Requirements
- nodejs
- redis server

1. Start a [redis](http://redis.io/) server (for now works only with redis default port)

2. Install
  ```
  npm install -g planet-stream
  ```

3. Start
  ```
  planet-stream [-v] [--hashtags]
  ```

Options:
 - -v : verbose logging (for debugging)
 - --hashtags : only output changesets that contain a 'hashtag' in the comment

## Simulator
Included in the repo is a simulator for generating test data that has the same schema as `planet-stream` (useful for debugging downstream apps without waiting for OSM)
  ```
  bin/ops-simulator.js
  ```
