# SentimentCraft - Minecraft-Themed Sentiment Analysis Web App

A visually engaging **Flask-based Sentiment Analysis** web application that predicts the sentiment of text and CSV reviews using a **pre-trained Logistic Regression model**. Built with a Minecraft-inspired interface, the application combines machine learning with an interactive dashboard, animated visualizations, and responsive design to deliver an immersive user experience.
<img width="959" height="510" alt="image" src="https://github.com/user-attachments/assets/ee51901a-8291-4b85-86b4-feb5ccb66582" />

---

## Features

### Machine Learning
- Uses a pre-trained **Logistic Regression** model
- TF-IDF Vectorizer for feature extraction
- No retraining required – loads existing `.sav` model and `.pkl` vectorizer
- Fast inference for both single text and batch CSV analysis

### CSV Sentiment Analysis
- Upload CSV files containing a **Review** column
- Batch sentiment prediction
- Automatically adds a **Prediction** column
- Download processed CSV
- Handles invalid files and missing columns gracefully
- Confidence score display
- Animated sentiment emoji
- Prediction badge

### Single Text Analysis
- Enter a review manually
- Instant sentiment prediction

###  Interactive Dashboard
- Total Reviews
- Positive & Negative Reviews
- Positive & Negative Percentage
- Overall Sentiment Summary
  
---
## Technologies Used

### Backend
- Flask
- Python
- Pandas
- Pickle
- Scikit-learn

### Machine Learning
- Logistic Regression
- TF-IDF Vectorizer

### Frontend
- HTML5
- CSS3
- JavaScript
- Chart.js
---

## Installation

### Clone the repository

```bash
git clone https://github.com/your-username/SentimentCraft.git
cd SentimentCraft
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run the application

```bash
python app.py
```

Open your browser and visit:

```
http://127.0.0.1:5000
```
---

##  Workflow

```
User Input (Text / CSV)
        │
        ▼
Load Saved Model & TF-IDF Vectorizer
        │
        ▼
Text Preprocessing
        │
        ▼
Sentiment Prediction
        │
        ▼
Generate Statistics
        │
        ▼
Create Interactive Charts
        │
        ▼
Display Results Dashboard
        │
        ▼
Download Predicted CSV
```

---

## Future Enhancements

- Neutral sentiment classification
- Multi-class emotion detection
- Word Cloud visualization
- Review filtering and search
- PDF report generation
- REST API support
- Dark/Light theme switch
- Real-time sentiment trends
- Confidence visualization gauges

---

## Author

**Nikhila Dhevi R**
