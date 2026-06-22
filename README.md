# Smart Movie Recommendation System

A lightweight, machine learning-powered web application built using **Python** and **Streamlit**. The system analyzes natural language features (genres, keywords, overview, cast, and crew) from a dataset of 5,000 movies to recommend films based on user selection. It calculates content similarity using natural language processing (NLP) and dynamically fetches movie posters in real-time via **The Movie Database (TMDb) API**.

---

## 🚀 Features

*   **Content-Based Filtering:** Recommends the top 5 most similar movies based on textual metadata (tags, overview, and genres).
*   **Vectorized Search Engine:** Implements `scikit-learn`'s NLP processing paired with Cosine Similarity for instantaneous, low-latency lookups.
*   **Dynamic Poster Fetching:** Pulls high-resolution movie artwork on-the-fly directly from TMDb's global Content Delivery Network (CDN).
*   **Clean, Responsive UI:** Provides an intuitive dropdown lookup interface using Streamlit components.

---

## 🛠️ System Architecture & Stack

*   **Frontend & Hosting:** Streamlit
*   **Data Manipulation:** Pandas & NumPy
*   **Machine Learning Core:** Scikit-learn (`CountVectorizer` / `cosine_similarity`)
*   **Serialized Models:** Pickle (`.pkl`)
*   **External Media Gateway:** TMDb REST API

---

## 📋 Prerequisites & Installation

Follow these steps to configure your local runtime environment and boot up the system server:

### 1. Clone the Repository
```bash
git clone [https://github.com/Shadan2901/Movie.git](https://github.com/Shadan2901/Movie.git)
cd Movie
