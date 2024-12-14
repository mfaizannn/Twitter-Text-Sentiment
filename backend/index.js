const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Detailed logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Enhanced Twitter API token verification
const verifyTwitterToken = (req, res, next) => {
  if (!process.env.TWITTER_BEARER_TOKEN) {
    console.error("CRITICAL: Twitter Bearer Token is missing!");
    return res.status(500).json({
      error: "Twitter API configuration error",
      details: "Bearer token not set in environment variables",
    });
  }
  next();
};

const fetchWithRetry = async (url, options, retries = 3) => {
  try {
    console.log(`Fetching URL: ${url}`);
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    console.error("Fetch Error Details:", {
      url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response && error.response.status === 429 && retries > 0) {
      const retryAfter = error.response.headers["retry-after"] || 5;
      console.warn(`Rate limit hit. Retrying after ${retryAfter} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

const fetchTwitterData = async (username, maxResults = 20) => {
  console.log(`Fetching Twitter data for username: ${username}`);

  try {
    // Fetch user ID by username
    const userResponse = await fetchWithRetry(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
      }
    );

    console.log("User ID Response:", userResponse);

    if (!userResponse || !userResponse.data || !userResponse.data.id) {
      throw new Error("User not found or invalid response structure");
    }

    const userId = userResponse.data.id;

    // Add created_at to the tweet fields
    const tweetsResponse = await fetchWithRetry(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
      }
    );

    console.log("Tweets Response:", tweetsResponse);

    if (!tweetsResponse || !tweetsResponse.data || !tweetsResponse.data.length) {
      throw new Error("No tweets found for the specified user");
    }

    return { tweets: tweetsResponse.data };
  } catch (error) {
    console.error("Twitter Data Fetch Error:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const runPythonSentimentAnalysis = (twitterData) => {
  return new Promise((resolve, reject) => {
    console.log("Starting Python Sentiment Analysis");

    // Ensure directory exists
    const outputDir = __dirname;

    // Write the tweets to a temporary JSON file
    const tempFilePath = path.join(outputDir, "twitterAPIresults.json");

    try {
      fs.writeFileSync(tempFilePath, JSON.stringify(twitterData), "utf8");
      console.log(`Tweets written to ${tempFilePath}`);
    } catch (writeError) {
      console.error("Error writing tweets to file:", writeError);
      return reject(writeError);
    }

    // Spawn Python process with full path
    const pythonScriptPath = path.join(__dirname, "Model.py");
    console.log(`Executing Python script: ${pythonScriptPath}`);

    const pythonProcess = spawn("python3", [pythonScriptPath]);

    let output = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      const chunk = data.toString();
      console.log("Python STDOUT:", chunk);
      output += chunk;
    });

    pythonProcess.stderr.on("data", (data) => {
      const chunk = data.toString();
      console.error("Python STDERR:", chunk);
      error += chunk;
    });

    pythonProcess.on("close", (code) => {
      console.log(`Python script exited with code ${code}`);

      if (code !== 0) {
        return reject(
          new Error(`Python script failed with code ${code}: ${error}`)
        );
      }

      try {
        // Read the analyzed tweets from the output file
        const analyzedTweetsPath = path.join(outputDir, "analyzed_tweets.json");
        const analyzedTweets = JSON.parse(
          fs.readFileSync(analyzedTweetsPath, "utf8")
        );

        console.log("Sentiment analysis completed successfully");
        resolve(analyzedTweets);
      } catch (readError) {
        console.error("Error reading analyzed tweets:", readError);
        reject(readError);
      }
    });
  });
};

// Routes
app.post("/api/analyze", verifyTwitterToken, async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    console.log(`Starting analysis for username: ${username}`);

    const twitterData = await fetchTwitterData(username, 20);
    console.log("Twitter data fetched successfully");

    const analyzedTweets = await runPythonSentimentAnalysis(twitterData);
    console.log("Sentiment analysis completed");

    res.json(analyzedTweets);
  } catch (error) {
    console.error("Comprehensive Error in /api/analyze:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Determine appropriate status code based on error type
    const statusCode = error.message.includes("User not found")
      ? 404
      : error.message.includes("API configuration")
      ? 500
      : error.message.includes("Rate limit")
      ? 429
      : 500;

    res.status(statusCode).json({
      error: "Error processing Twitter analysis",
      details: error.message,
    });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: "Unexpected server error",
    details: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app; // For potential testing