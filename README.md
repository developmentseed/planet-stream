# planet-stream

OSM Planet Stream creates a readable `stream` that combines the metadata from [planet.osm.org](http://planet.osm.org) with the [Augmented Diff API](https://wiki.openstreetmap.org/wiki/Overpass_API/Augmented_Diffs).


## Usage

### Standalone

Planet stream uses [redis](http://redis.io) as a backing cache to merge the data from OSM and Overpass. To run standalone, you can either use your own redis server or use the provided Dockerfile.

#### Docker

After cloning the repository:

```
docker-compose run -d app
```

TO output data that contains hashtags in the `comment` field

```
docker-compose run -d app bin/planet-stream.js --hashtags
```

STDOUT/STDERR will be available using `docker logs -f [container_name]`

#### NPM

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

### Library

You can include Planet Stream as a library in your own code. `npm install planet-stream`

```js
var planet = require('planet-stream')({
  'port': 6379,
  'host': '127.0.0.1'
});

planet.onValue(function (data) {
  console.log(data);
})
```


## Simulator
Included in the repo is a simulator for generating test data that has the same schema as `planet-stream` (useful for debugging downstream apps without waiting for OSM)
  ```
  bin/ops-simulator.js
  ```
