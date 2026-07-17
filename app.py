import os
import uuid
import pickle
import pandas as pd
from flask import (
    Flask, render_template, request,
    redirect, url_for, session, send_file, jsonify
)

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.urandom(24)          # needed for server-side session storage
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ── Load model artifacts (once, at startup) ───────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
model      = pickle.load(open(os.path.join(BASE_DIR, "trained_model.sav"), "rb"))
vectorizer = pickle.load(open(os.path.join(BASE_DIR, "vectorizer.pkl"),    "rb"))


# ── Helper ─────────────────────────────────────────────────────────────────────
def run_inference(reviews: pd.Series) -> list:
    """Transform reviews with the saved vectorizer, then predict with the model."""
    vectors     = vectorizer.transform(reviews.astype(str))
    raw_preds   = model.predict(vectors)
    # normalise whatever the model returns to "Positive" / "Negative"
    label_map   = {}
    for val in set(raw_preds):
        s = str(val).strip().lower()
        if s in ("1", "positive", "pos", "good"):
            label_map[val] = "Positive"
        else:
            label_map[val] = "Negative"
    return [label_map[p] for p in raw_preds]


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def home():
    """Landing page — upload form."""
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    """
    Handles CSV upload.
    Expects a file field named 'file' and an optional column-name field 'column'.
    Saves the processed result CSV and redirects to the results page.
    """
    uploaded = request.files.get("file")
    if not uploaded or uploaded.filename == "":
        return redirect(url_for("home"))

    # persist original upload so we can read it
    raw_path = os.path.join(UPLOAD_FOLDER, f"raw_{uuid.uuid4().hex}.csv")
    uploaded.save(raw_path)

    try:
        df = pd.read_csv(raw_path, encoding="utf-8", on_bad_lines="skip")
    except Exception:
        df = pd.read_csv(raw_path, encoding="latin-1", on_bad_lines="skip")

    # find the review column (user-specified or auto-detect)
    col_hint = request.form.get("column", "").strip()
    review_col = None

    if col_hint and col_hint in df.columns:
        review_col = col_hint
    else:
        # auto-detect: pick first text-like column
        text_keywords = ["review", "text", "comment", "feedback", "description",
                         "sentence", "content", "opinion", "message"]
        for kw in text_keywords:
            matches = [c for c in df.columns if kw in c.lower()]
            if matches:
                review_col = matches[0]
                break
        if review_col is None:
            # fall back to first object column
            obj_cols = df.select_dtypes(include="object").columns.tolist()
            review_col = obj_cols[0] if obj_cols else df.columns[0]

    # run inference
    df["Prediction"] = run_inference(df[review_col].fillna(""))

    # compute summary statistics
    total    = len(df)
    positive = int((df["Prediction"] == "Positive").sum())
    negative = total - positive
    pos_pct  = round((positive / total * 100), 1) if total else 0
    neg_pct  = round((negative / total * 100), 1) if total else 0

    # save processed file
    result_id  = uuid.uuid4().hex
    result_path = os.path.join(UPLOAD_FOLDER, f"result_{result_id}.csv")
    df.to_csv(result_path, index=False)

    # keep only the columns we need for the table (review + prediction)
    table_df = df[[review_col, "Prediction"]].copy()
    table_df.columns = ["Review", "Prediction"]

    # store stats + rows in session (keep rows small: max 1 000 for session)
    session["stats"] = {
        "total":    total,
        "positive": positive,
        "negative": negative,
        "pos_pct":  pos_pct,
        "neg_pct":  neg_pct,
        "result_id": result_id,
    }
    session["rows"] = table_df.head(1000).to_dict(orient="records")

    # clean up raw upload
    os.remove(raw_path)

    return redirect(url_for("results"))


@app.route("/results")
def results():
    """Results dashboard page."""
    stats = session.get("stats")
    rows  = session.get("rows")
    if not stats:
        return redirect(url_for("home"))
    return render_template("result.html", stats=stats, rows=rows)


@app.route("/download")
def download():
    """Stream the processed CSV to the browser."""
    result_id = session.get("stats", {}).get("result_id")
    if not result_id:
        return redirect(url_for("home"))
    path = os.path.join(UPLOAD_FOLDER, f"result_{result_id}.csv")
    if not os.path.exists(path):
        return "File not found", 404
    return send_file(path, as_attachment=True, download_name="sentiment_results.csv")


@app.route("/predict-text", methods=["POST"])
def predict_text():
    """AJAX endpoint — predict sentiment for a single text snippet."""
    data   = request.get_json(silent=True) or {}
    text   = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    vector    = vectorizer.transform([text])
    raw_pred  = model.predict(vector)[0]
    s = str(raw_pred).strip().lower()
    label = "Positive" if s in ("1", "positive", "pos", "good") else "Negative"
    return jsonify({"prediction": label, "text": text})

if __name__ == "__main__":
    app.run(debug=True)