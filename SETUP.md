# Setup steps — CNN comparison project

Follow these in order.

## 1. Get the images

Make folders under `ml-service/raw_dataset/`, one per category:
`Pothole`, `Garbage`, `Streetlight`, `Sidewalk`, `Flooding`, `Road Sign`, `Other`.

Download images into each folder:

- **Pothole + Other**: download this zip and unzip it.
  `https://zenodo.org/api/records/13334878/files/Normal%20pothole%20dataset.zip/content`
  Put the "pothole" photos in `Pothole/`, the "normal road" photos in `Other/`.
- **Sidewalk**: download this (needs 7-Zip to open, it's a `.rar` file).
  `https://data.mendeley.com/public-files/datasets/5y9wdsg2zt/files/8a70d8a5-bce9-4291-bab9-b48cfb3e87c3/file_downloaded`
  Put the "Positive" (cracked) photos in `Sidewalk/`.
- **Garbage**: get the Kaggle dataset `asdasdasasdas/garbage-classification`
  (needs a free Kaggle account + API key from kaggle.com/settings).
- **Streetlight, Flooding, Road Sign**: no good ready-made dataset exists.
  Take your own photos, or search Google Images / Roboflow Universe and
  save photos by hand into these folders.

Aim for 300+ photos per folder if you can. More is better.

## 2. Clean and split the dataset

```sh
cd ml-service
pip install -r requirements.txt
python scripts/prepare_dataset.py --input raw_dataset --output dataset
```

This removes duplicates, resizes everything, and splits each category into
train/val/test folders automatically.

## 3. Train the models on Google Colab

1. Zip the `dataset` folder and upload it to Google Drive.
2. Open `ml-service/training/colab_notebook.ipynb` in Google Colab.
3. Turn on a GPU: Runtime → Change runtime type → T4 GPU.
4. Update the notebook's git-clone URL and dataset zip path to match yours.
5. Run all cells. It trains all 6 models and downloads `artifacts.zip` at the end.

This can take 1–3 hours depending on dataset size and Colab GPU speed.

## 4. Bring the results back

1. Unzip `artifacts.zip` into `ml-service/artifacts/` on your computer.
2. Check `ml-service/artifacts/comparison_results.json` exists and has all 6 models.

## 5. Run the ML service

```sh
cd ml-service
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/health` in a browser — it should say `{"status":"ok"}`.

## 6. Connect the backend and admin app

- `backend/.env` — already has `ML_SERVICE_URL=http://localhost:8000`. No change needed if running locally.
- `admin/.env` — add this line (create the file if it doesn't exist):
  ```
  VITE_ML_SERVICE_URL=http://localhost:8000
  ```

Start everything:

```sh
cd backend && npm run dev
cd admin && npm run dev
```

## 7. Test it

1. Report a new issue with a photo through the app.
2. Check the issue shows a category and confidence score after a few seconds.
3. In the admin panel, open **Model Comparison** in the sidebar — you should
   see a table and charts comparing all 6 models.

## 8. Write up the results

Open `ml-service/README.md` and fill in the results table and discussion
section at the bottom, using the numbers from `comparison_results.json`.
This is what your final-year report should reference.
