# Diabetes Random Forest Training Report

- Dataset: `C:\Users\rohan\Downloads\archive (1)\diabetes_prediction_dataset.csv`
- Samples used: **100000**
- Positive class rate (`diabetes=1`): **0.0850**

## Holdout Metrics

- ROC-AUC: **0.9741**
- Accuracy: **0.9021**
- F1: **0.6123**
- Precision: **0.4615**
- Recall: **0.9094**
- Brier: **0.0688**

## Notes

- This model is intended for in-app risk stratification and trend analytics.
- It is not a standalone medical diagnosis.
- Retrain periodically when dataset or feature distributions change.
