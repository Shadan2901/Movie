# 🎬 Smart Movie Recommendation System

A lightweight, machine learning-powered web application built with **Python** and **Streamlit** that recommends movies based on their content. The system analyzes natural language features—including genres, keywords, overview, cast, and crew—from a dataset of over **5,000 movies** to generate personalized recommendations.

Using **Natural Language Processing (NLP)** and **Cosine Similarity**, the application identifies movies with similar content and dynamically fetches high-quality movie posters using the **The Movie Database (TMDb) API**.

---

## 🚀 Features

### 🎯 Content-Based Filtering

Recommends the **top 5 most similar movies** based on textual metadata such as:

* Genres
* Keywords
* Movie overview
* Cast
* Crew

### ⚡ Fast Recommendation Engine

* Uses **CountVectorizer** from **scikit-learn** to convert movie metadata into numerical vectors.
* Computes **Cosine Similarity** for instant movie recommendations with minimal latency.

### 🖼️ Dynamic Poster Fetching

Retrieves high-resolution movie posters in real time through the **TMDb REST API**, providing an engaging visual experience.

### 💻 Clean & Responsive Interface

Built with **Streamlit**, offering a simple and intuitive user interface with a searchable movie dropdown.

---

# 🛠️ Technology Stack

| Component           | Technology                                        |
| ------------------- | ------------------------------------------------- |
| Frontend            | Streamlit                                         |
| Backend             | Python                                            |
| Data Processing     | Pandas, NumPy                                     |
| Machine Learning    | scikit-learn (CountVectorizer, Cosine Similarity) |
| Model Serialization | Pickle (`.pkl`)                                   |
| External API        | TMDb REST API                                     |

---

# 📋 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/Shadan2901/Movie.git
cd Movie
```

## 2. Create a Virtual Environment (Recommended)

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

## 3. Install Dependencies

```bash
pip install streamlit pandas numpy requests scikit-learn
```

---

# ▶️ Running the Application

Start the Streamlit development server by running:

```bash
streamlit run app.py
```

Once launched, the application automatically loads:

* `movie_list.pkl`
* `similarity.pkl`

into memory, enabling fast recommendation lookups without recomputing similarity scores.

---

# 📂 Project Structure

```text
Movie/
│
├── app.py              # Streamlit application and recommendation logic
├── movie_list.pkl      # Serialized DataFrame containing processed movie metadata
├── similarity.pkl      # Precomputed cosine similarity matrix
├── README.md           # Project documentation
└── requirements.txt    # (Optional) Project dependencies
```

---

# 🧠 How It Works

1. The user selects a movie from the dropdown menu.
2. The application locates the selected movie in the dataset.
3. The corresponding row in the cosine similarity matrix is retrieved.
4. The five highest-scoring similar movies are identified.
5. Movie posters are fetched dynamically using the TMDb API.
6. The recommendations and posters are displayed in the Streamlit interface.

---

# 🛡️ Error Handling

The application includes basic fault tolerance for external API requests.

If:

* the user's internet connection is unavailable, or
* the TMDb API is temporarily unreachable,

the recommendation engine will continue functioning normally by displaying movie titles without poster images, ensuring uninterrupted recommendations.

---

# 📦 Dependencies

* Python 3.x
* Streamlit
* Pandas
* NumPy
* Requests
* scikit-learn

Install everything with:

```bash
pip install streamlit pandas numpy requests scikit-learn
```

---

# 🔮 Future Improvements

* Collaborative filtering recommendations
* Hybrid recommendation model
* Genre and language filtering
* Search bar with autocomplete
* Movie trailers via TMDb
* User ratings and watchlist support
* Deployment on Streamlit Community Cloud

---

# 📄 License

This project is intended for educational and learning purposes.

Movie posters and metadata are provided by **The Movie Database (TMDb)** under their API terms of service.
