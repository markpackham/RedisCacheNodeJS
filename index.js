const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");

const PORT = process.env.PORT || 5000;
// remember to download and run Redis server
// https://github.com/dmajkic/redis/downloads
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient(REDIS_PORT);

const app = express();

// The github account of intrest https://github.com/markpackham
// another account to test on http://localhost:5000/repos/bradtraversy

// Set response
function setResponse(username, repos) {
  return `<h2>${username}has ${repos} Github repos</h2>`;
}

// Make request to Github for data
// see things in action going to http://localhost:5000/repos/markpackham
// I have this amount of public repos at time of writing - "public_repos":66
// It'll say something along the lines of "markpackhamhas 66 Github repos"
async function getRepos(req, res, next) {
  try {
    console.log("Fetching data...");
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    const repos = data.public_repos;

    // Set data to Redis cache
    // the key eg "markpackham", the time and the number of repos
    client.setex(username, 3600, repos);
    res.send(setResponse(username, repos));
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

// Cache middleware
function cache(req, res, next) {
  const { username } = req.params;
  client.get(username, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      res.send(setResponse(username, data));
    } else {
      // make actual request
      next();
    }
  });
}

// remove the Redis "cache" in order to see a massive difference in performance
app.get("/repos/:username", cache, getRepos);

app.listen(5000, () => {
  console.log(`App listening on port ${PORT} npm`);
});

/* using the Redis cli with the Redis server running you can get the amount of repors eg:
redis 127.0.0.1:6379> get markpackham
"66"
*/
