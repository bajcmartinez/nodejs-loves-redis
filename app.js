const express = require('express');
const axios = require('axios');
const redis = require('redis');
const app = express();
const port = 3000;

// Initiate and connect to the Redis client
const redisClient = redis.createClient();
(async () => {
  redisClient.on("error", (error) => console.error(`Ups : ${error}`));
  await redisClient.connect();
})();

async function fetchToDos(completed) {
  const cacheKey = `TODOS2_${completed}`;

  // First attempt to retrieve data from the cache
  try {
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      console.log('Data from cache.');
      return cachedResult;
    }
  } catch (error) {
    console.error('Something happened to Redis', error);
  }

  // If the cache is empty or we fail reading it, default back to the API
  const apiResponse = await axios(`https://jsonplaceholder.typicode.com/todos?completed=${completed}`);
  console.log('Data requested from the ToDo API.');

  // Finally, if you got any results, save the data back to the cache
  if (apiResponse.data.length > 0) {
    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(apiResponse.data),
        { EX: 10 }
      );
    } catch (error) {
      console.error('Something happened to Redis', error);
    }
  }

  return apiResponse.data;
}

app.get('/', async (req, res) => {
  res.send(await fetchToDos(req.query.completed));
});

app.listen(port, () => {
  console.log(`NodeJS loves Redis listening on port ${port}`);
});