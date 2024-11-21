require('dotenv').config(); // Load environment variables from .env file

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const vader = require("vader-sentiment");

const app = express();

// Use environment variables for PORT and API key
const PORT = process.env.PORT || 3000;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Configure CORS to allow requests from your frontend
const corsOptions = {
  origin: "*", // Replace with your frontend URL
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
};

app.use(cors(corsOptions));
app.use(express.json());

const SOURCES = [
  "cnn",
  "reuters",
  "bbc-news",
  "the-wall-street-journal",
  "associated-press",
  "bloomberg",
  "fox-news",
  "the-times-of-india",
];

function simpleSummarize(text, numSentences = 2) {
  const sentences = text.split(". ");
  return sentences.slice(0, numSentences).join(". ") + (sentences.length > numSentences ? "." : "");
}

app.get("/news", async (req, res) => {
  try {
    const requests = SOURCES.map((source) =>
      axios.get(`https://newsapi.org/v2/top-headlines?sources=${source}&apiKey=${NEWS_API_KEY}`)
    );

    const responses = await Promise.all(requests);
    const articles = responses.flatMap((response) => response.data.articles || []);

    const analyzedArticles = articles.map((article) => {
      const description = article.description || "No description available";

      const sentimentResult = vader.SentimentIntensityAnalyzer.polarity_scores(description);
      const sentiment =
        sentimentResult.compound >= 0.05
          ? "Positive"
          : sentimentResult.compound <= -0.05
          ? "Negative"
          : "Neutral";

      let summary = "No summary available";
      if (description.length > 50) {
        try {
          summary = simpleSummarize(description, 2);
        } catch (err) {
          console.error("Error generating summary:", err.message);
        }
      } else {
        summary = "Description too short to summarize.";
      }

      return { ...article, sentiment, summary };
    });

    res.status(200).json({ articles: analyzedArticles });
  } catch (error) {
    console.error("Error fetching news:", error.response?.data || error.message);
    res.status(500).json({ error: `Unable to fetch news: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

