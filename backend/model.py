from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline
import json
from datetime import datetime
import os
import torch
import sys

def analyze_tweets(tweets_data, sentiment_pipeline, emotion_pipeline):
    """
    Analyze sentiment and emotion of tweets using the provided pipelines.
    """
    # Define sentiment label mapping
    sentiment_mapping = {
        'LABEL_0': 'negative',
        'LABEL_1': 'neutral',
        'LABEL_2': 'positive'
    }

    results = []

    for tweet in tweets_data["tweets"]:
        try:
            # Get sentiment analysis
            sentiment_result = sentiment_pipeline(tweet["text"])[0]
            
            # Map the sentiment label to human-readable format
            sentiment_label = sentiment_mapping.get(sentiment_result["label"], sentiment_result["label"]).lower()
            
            # Get emotion analysis with all scores
            emotion_results = emotion_pipeline(tweet["text"])[0]
            # Find the emotion with highest score
            max_emotion = max(emotion_results, key=lambda x: x['score'])

            # Create enriched tweet object
            analyzed_tweet = {
                "id": tweet["id"],
                "text": tweet["text"],
                "created_at": tweet["created_at"],
                "sentiment": {
                    "label": sentiment_label,  # Use mapped label
                    "score": round(sentiment_result["score"], 4)
                },
                "emotion": {
                    "label": max_emotion["label"].lower(),
                    "score": round(max_emotion["score"], 4)
                },
                "analyzed_at": datetime.now().isoformat()
            }

            results.append(analyzed_tweet)
        except Exception as e:
            print(f"Error processing tweet {tweet['id']}: {str(e)}")
            continue

    return results

def main():
    try:
        # Check if input file exists
        input_file = 'twitterAPIresults.json'
        if not os.path.exists(input_file):
            print(json.dumps({"error": f"Error: {input_file} not found"}))
            return 1

        # Set device - prefer MPS (Apple Silicon) if available, else CPU
        if torch.backends.mps.is_available():
            device = "mps"
        elif torch.cuda.is_available():
            device = "cuda"
        else:
            device = "cpu"
        print(f"Device set to use {device}")

        # Initialize sentiment model and tokenizer
        sentiment_model_name = "cardiffnlp/twitter-roberta-base-sentiment"
        sentiment_tokenizer = AutoTokenizer.from_pretrained(sentiment_model_name)
        sentiment_model = AutoModelForSequenceClassification.from_pretrained(sentiment_model_name)
        
        # Initialize emotion model and tokenizer
        emotion_model_name = "j-hartmann/emotion-english-distilroberta-base"
        emotion_tokenizer = AutoTokenizer.from_pretrained(emotion_model_name)
        emotion_model = AutoModelForSequenceClassification.from_pretrained(emotion_model_name)

        # Move models to appropriate device
        sentiment_model = sentiment_model.to(device)
        emotion_model = emotion_model.to(device)

        # Create pipelines
        sentiment_pipe = pipeline(
            "sentiment-analysis",
            model=sentiment_model,
            tokenizer=sentiment_tokenizer,
            device=device if device != "mps" else -1  # Use -1 for CPU if MPS
        )

        emotion_pipe = pipeline(
            "text-classification",
            model=emotion_model,
            tokenizer=emotion_tokenizer,
            device=device if device != "mps" else -1,  # Use -1 for CPU if MPS
            return_all_scores=True
        )

        # Load tweets data
        with open(input_file, 'r', encoding='utf-8') as f:
            tweets_data = json.load(f)

        # Analyze tweets
        results = analyze_tweets(tweets_data, sentiment_pipe, emotion_pipe)

        if not results:
            print(json.dumps({"error": "No tweets were successfully analyzed"}))
            return 1

        # Save analyzed tweets
        with open('analyzed_tweets.json', 'w', encoding='utf-8') as f:
            json.dump({"analyzed_tweets": results}, f, indent=2)

        print(json.dumps({"success": True, "tweet_count": len(results)}))
        return 0

    except Exception as e:
        error_msg = {
            "error": str(e),
            "type": str(type(e).__name__),
            "details": {
                "python_version": sys.version,
                "torch_version": torch.__version__,
                "cuda_available": torch.cuda.is_available(),
                "mps_available": torch.backends.mps.is_available()
            }
        }
        print(json.dumps(error_msg))
        return 1

if __name__ == "__main__":
    main()