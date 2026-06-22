Smart Movie Recommendation System

A lightweight, machine learning-powered web application built using Python and Streamlit. The system analyzes natural language features (genres, keywords, overview, cast, and crew) from a dataset of 5,000 movies to recommend films based on user selection. It calculates content similarity using natural language processing (NLP) and dynamically fetches movie posters in real-time via The Movie Database (TMDb) API.

🚀 Features
Content-Based Filtering: Recommends the top 5 most similar movies based on textual metadata (tags, overview, and genres).

Vectorized Search Engine: Implements scikit-learn's NLP processing paired with Cosine Similarity for instantaneous, low-latency lookups.

Dynamic Poster Fetching: Pulls high-resolution movie artwork on-the-fly directly from TMDb's global Content Delivery Network (CDN).

Clean, Responsive UI: Provides an intuitive dropdown lookup interface using Streamlit components.

🛠️ System Architecture & Stack
Frontend & Hosting: Streamlit

Data Manipulation: Pandas & NumPy

Machine Learning Core: Scikit-learn (CountVectorizer / cosine_similarity)

Serialized Models: Pickle (.pkl)

External Media Gateway: TMDb REST API

📋 Prerequisites & Installation
Follow these steps to configure your local runtime environment and boot up the system server:

1. Clone the Repository
Bash
git clone https://github.com/Shadan2901/Movie.git
cd Movie
2. Set Up a Virtual Environment (Recommended)
Bash
# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
venv\Scripts\activate
3. Install Dependencies
Ensure you have all required Python libraries installed:

Bash
pip install streamlit pandas requests scikit-learn
🖥️ How to Run the Application
Once your dependencies are installed, you can start the application server by executing:

Bash
streamlit run app.py
💡 Note: On launch, the system automatically deserializes movie_list.pkl and similarity.pkl into system memory to enable instantaneous recommendation lookups.

📂 Project Structure
Plaintext
├── app.py              # Main Streamlit UI layout and API routing logic
├── movie_list.pkl     # Serialized Python DataFrame containing processed movie tags
├── similarity.pkl     # Pre-computed multi-dimensional Cosine Similarity matrix
└── README.md          # Project documentation
🛡️ Error Handling & Fault Tolerance
The application features built-in network exception wrappers. If your local machine experiences an internet disruption or the external TMDb API goes down, the system will degrade gracefully: it will still successfully display the text-based movie recommendations on your dashboard, omitting only the graphic image assets.
