// index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// verify Twitter API token
app.use((req, res, next) => {
  if (!process.env.TWITTER_BEARER_TOKEN) {
    return res.status(500).json({ error: 'Twitter API token missing' });
  }
  next();
});

// Twitter API client setup

const fetchWithRetry = async (url, options, retries = 5) => {
    try {
      const response = await axios.get(url, options);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 429 && retries > 0) {
        const retryAfter = error.response.headers['retry-after'] || 1; // default to 1 second if not specified
        console.warn(`Rate limit hit. Retrying after ${retryAfter} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw error; // re throw error if not a 429 or retries exhausted
    }
  };
  
  const fetchTwitterData = async (username, maxResults = 5) => {
    try {
      // Fetch user ID by username
      const userResponse = await fetchWithRetry(`https://api.twitter.com/2/users/by/username/${username}`, {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
        }
      });
  
      console.log('User response:', userResponse); // Log the response
  
      // Check if the response is valid and contains user data
    //   if (!userResponse || !userResponse.data || !userResponse.data.data) {
    //     throw new Error('User not found or response structure is incorrect');
    //   }


    if (!userResponse || !userResponse.data || !userResponse.data.id) {
        throw new Error('User not found or response structure is incorrect');
    }
    
  
      const userId = userResponse.data.id; // Extract user ID from the response
  
      // Fetch tweets by user ID with a limit
      const tweetsResponse = await fetchWithRetry(`https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxResults}`, {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
        }
      });
  
      console.log('Tweets response:', tweetsResponse); // Log the tweets response
  
      return tweetsResponse.data; // Return tweets data
    } catch (error) {
      console.error('Error fetching data from Twitter API:', error);
      throw error; 
    }
  };
  


  
  // Update your analyze endpoint to specify the maxResults
  app.post('/api/analyze', async (req, res) => {
    const { username } = req.body;
    try {
      const twitterData = await fetchTwitterData(username, 5); // Fetch the top 50 tweets, 5 for testing purposes (429 error)
      
      // implement sentiment analysis and data processing
      //  returning the fetched tweets for now
      res.json({ tweets: twitterData });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching Twitter data' });
    }
  });
  
  

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
