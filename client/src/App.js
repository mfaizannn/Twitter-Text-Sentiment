import React, { useState } from "react";
import "./App.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

import { tailspin } from "ldrs";

tailspin.register();

function App() {
  const [twitterUrl, setTwitterUrl] = useState("");
  const [username, setUsername] = useState("");
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); 

  const calculateEmotionDistribution = (tweets) => {
    const emotionCounts = {};

    tweets.forEach((tweet) => {
      const emotion = tweet.emotion.label;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const totalTweets = tweets.length;

    const emotionConfig = {
      joy: { color: "#FFD700", emoji: "😊" },
      sadness: { color: "#1E90FF", emoji: "😢" },
      anger: { color: "#FF6347", emoji: "😠" },
      fear: { color: "#708090", emoji: "😨" },
      surprise: { color: "#9370DB", emoji: "😲" },
      love: { color: "#FF69B4", emoji: "❤️" },
    };

    return Object.entries(emotionCounts).map(([emotion, count]) => ({
      name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      value: (count / totalTweets) * 100,
      color: emotionConfig[emotion]?.color || "#808080",
      emoji: emotionConfig[emotion]?.emoji || "😐",
    }));
  };

  const xAxisFormatter = (tick) => {
    const tickDate = new Date(tick);
    const allSameDay = analysisResults.every(
      (tweet) =>
        new Date(tweet.created_at).toLocaleDateString() ===
        tickDate.toLocaleDateString()
    );

    if (allSameDay) {
      return tickDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return tickDate.toLocaleDateString();
  };

  const handleInputChange = (e) => {
    setTwitterUrl(e.target.value);
  };

  const handleAnalyzeClick = async () => {
    let twitterUsername;

    if (twitterUrl.startsWith("https://x.com/")) {
      twitterUsername = twitterUrl.split("/").pop();
    } else {
      twitterUsername = twitterUrl;
    }

    setUsername(twitterUsername);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: twitterUsername }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      setAnalysisResults(data.analyzed_tweets);

      console.log("Analysis Results:", data.analyzed_tweets);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      setError("Failed to fetch Twitter analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const positiveTweets = analysisResults
    ? analysisResults.filter((tweet) => tweet.sentiment.label === "positive")
    : [];
  const negativeTweets = analysisResults
    ? analysisResults.filter((tweet) => tweet.sentiment.label === "negative")
    : [];
  const neutralTweets = analysisResults
    ? analysisResults.filter((tweet) => tweet.sentiment.label === "neutral")
    : [];

  const overallSentimentScore = analysisResults
    ? analysisResults.reduce((acc, tweet) => acc + tweet.sentiment.score, 0) /
      analysisResults.length
    : 0;

  const sentimentDistribution = [
    { name: "Positive", value: positiveTweets.length, color: "#9EC97F" },
    { name: "Negative", value: negativeTweets.length, color: "#F3C96B" },
    { name: "Neutral", value: neutralTweets.length, color: "#73B9BD" },
  ];

  const emotionAnalysis = analysisResults
    ? calculateEmotionDistribution(analysisResults)
    : [];

  const sentimentOverTimeData = analysisResults
    ? analysisResults.map((tweet, index, array) => {
        const cumulativeScore =
          array
            .slice(0, index + 1)
            .reduce((acc, t) => acc + t.sentiment.score, 0) /
          (index + 1);

        return {
          time: new Date(tweet.created_at).toISOString(),
          cumulativeScore,
        };
      })
    : [];

  const getSentimentClass = (score) => {
    if (score >= 0.5) return "positive";
    if (score < 0.4) return "negative";
    return "neutral";
  };

  const getSentimentText = (score) => {
    if (score >= 0.5) return "positive";
    if (score < 0.4) return "negative";
    return "neutral";
  };

  return (
    <div className="App">
      <h1 className="twitterheading">Twitter Sentiment Analysis</h1>

      <div className="search-bar">
        <div className="search-icon">&#9776;</div>
        <input
          type="text"
          className="search-input"
          placeholder="Enter Twitter Profile URL or Username"
          value={twitterUrl}
          onChange={handleInputChange}
        />
        <button className="search-button" onClick={handleAnalyzeClick}>
          &#128269;
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <l-tailspin
            size="40"
            stroke="5"
            speed="0.9"
            color="white"
          ></l-tailspin>
        </div>
      )}

      {error && (
        <div className="error-message" style={{ color: "red", margin: "10px" }}>
          {error}
        </div>
      )}

      {!loading && analysisResults && (
        <div className="bigcontainer">
          <div className="sentiment-summary">
            @{username}'s Twitter profile is generally{" "}
            {getSentimentText(overallSentimentScore)}
          </div>

          <h2 className="twitterheading2">Analysis for @{username}</h2>

          <div
            className={`overall-sentiment ${getSentimentClass(
              overallSentimentScore
            )}`}
          >
            <h2 className="sentiment-title">Overall Sentiment Score</h2>
            <p className="sentiment-score">
              {overallSentimentScore.toFixed(2)}
            </p>
          </div>

          <div className="sentiment-chart">
            <h2 className="twitterheading2">Sentiment Distribution</h2>
            <PieChart width={300} height={300}>
              <Pie
                data={sentimentDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {sentimentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>

          <BarChart
            width={Math.max(600, emotionAnalysis.length * 100)}
            height={400}
            data={emotionAnalysis}
            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={({ x, y, payload }) => {
                const emotion = emotionAnalysis.find(
                  (e) => e.name === payload.value
                );
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={20}
                      textAnchor="middle"
                      fontSize="14"
                      fill="#FFFFFF"
                      style={{ fontWeight: 500 }}
                    >
                      {payload.value}
                    </text>
                    <text
                      x={0}
                      y={40}
                      textAnchor="middle"
                      fontSize="18"
                      fill="#FFFFFF"
                    >
                      {emotion?.emoji}
                    </text>
                  </g>
                );
              }}
            />
            <YAxis tick={{ fill: "#FFFFFF" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#192734",
                border: "none",
              }}
              labelStyle={{ color: "#FFFFFF" }}
            />
            <Bar dataKey="value" name="Emotion Percentage" fill="#8884d8">
              {emotionAnalysis.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>

          <div className="sentiment-line-chart">
            <h2 className="twitterheading2">Sentiment Score Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={sentimentOverTimeData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <ReferenceArea y1={0} y2={0.5} fill="rgba(255, 0, 0, 0.1)" />
                <ReferenceArea y1={0.5} y2={1} fill="rgba(0, 255, 0, 0.1)" />

                <XAxis
                  dataKey="time"
                  angle={-45}
                  textAnchor="end"
                  tickFormatter={xAxisFormatter}
                />

                <YAxis
                  domain={[0, 1]}
                  tickCount={6}
                  label={{
                    value: "Overall Sentiment",
                    angle: -90,
                    position: "insideLeft",
                    dy: 55,
                  }}
                />

                <Tooltip
                  formatter={(value) => `Score: ${value}`}
                  labelFormatter={(label) =>
                    `Date: ${new Date(label).toLocaleString()}`
                  }
                />

                <Line
                  type="monotone"
                  dataKey="cumulativeScore"
                  stroke="#8884d8"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="tweets-container">
            <div className="positive-tweets">
              <h2>{positiveTweets.length} Positive Tweets</h2>
              <ul>
                {positiveTweets.map((tweet) => (
                  <li key={tweet.id} style={{ color: "green" }}>
                    {tweet.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="negative-tweets">
              <h2>{negativeTweets.length} Negative Tweets</h2>
              <ul>
                {negativeTweets.map((tweet) => (
                  <li key={tweet.id} style={{ color: "goldenrod" }}>
                    {tweet.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="neutral-tweets">
              <h2>{neutralTweets.length} Neutral Tweets</h2>
              <ul>
                {neutralTweets.map((tweet) => (
                  <li key={tweet.id} style={{ color: "#1c3d3e" }}>
                    {tweet.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
