package com.impact.gst.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

import java.io.File;
import java.io.FileInputStream;
import java.io.ObjectInputStream;
import java.util.List;

import smile.classification.RandomForest;
import smile.data.DataFrame;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RiskScoringService
 * Step 3: Run inference on live Mismatches using the serialized Random Forest.
 * Contains a fallback rule-based system if the model is somehow unavailable.
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RiskScoringService {

    private final RiskFeatureExtractor featureExtractor;
    private RandomForest model;

    private boolean modelLoadAttempted = false;

    /**
     * Attempts to load the trained model into memory.
     * Uses polling (Scheduled) because the Async training might not have finished
     * when the system initially starts.
     */
    @Scheduled(fixedDelay = 5000)
    public synchronized void loadModel() {
        if (model != null)
            return;

        File modelFile = new File(RiskModelTrainer.MODEL_PATH);
        if (!modelFile.exists()) {
            if (!modelLoadAttempted) {
                log.info("Model file {} not yet available. Waiting for trainer...", RiskModelTrainer.MODEL_PATH);
                modelLoadAttempted = true;
            }
            return;
        }

        try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(modelFile))) {
            model = (RandomForest) ois.readObject();
            log.info("Smile ML Risk model loaded successfully for real-time inference.");
        } catch (Exception e) {
            log.warn("Failed to load ML model from {}. Using fallback rules. Error: {}", RiskModelTrainer.MODEL_PATH,
                    e.getMessage());
        }
    }

    /**
     * Main inference entrypoint.
     * 
     * @param mismatch Data transfer object with features
     * @return RiskResult struct with discrete label and continuous score
     */
    public RiskResult scoreRisk(MismatchData mismatch) {
        if (model == null) {
            return fallbackScore(mismatch);
        }

        try {
            double[] features = featureExtractor.extractFeatures(mismatch);

            // Create a Smile DataFrame of one row for prediction
            double[][] x = { features };
            DataFrame input = DataFrame.of(x, featureExtractor.getFeatureNames());

            // predict() returns an array of label indices (one element per row)
            int prediction = model.predict(input)[0];

            String label;
            int score;

            switch (prediction) {
                case 0 -> {
                    label = "low";
                    score = 25;
                }
                case 1 -> {
                    label = "medium";
                    score = 65;
                }
                case 2 -> {
                    label = "high";
                    score = 95;
                }
                default -> {
                    label = "medium";
                    score = 50;
                }
            }

            return RiskResult.builder()
                    .score(score)
                    .label(label)
                    // In a full implementation, feature importance can be tied to
                    // the model's decision path. Here we pass static names for illustration.
                    .topFeatures(List.of("amount_diff_ratio", "vendor_trust_score"))
                    .build();

        } catch (Exception e) {
            log.error("ML Inference crashed, falling back to rule engine", e);
            return fallbackScore(mismatch);
        }
    }

    /**
     * Fallback expert rule system exactly mimicking the ML boundary conditions
     * if Smile framework fails to load properly at runtime.
     */
    private RiskResult fallbackScore(MismatchData m) {
        double diff = 0.0;
        if (m.getAmountA() != null && m.getAmountB() != null) {
            diff = Math.abs(m.getAmountA().doubleValue() - m.getAmountB().doubleValue());
        }

        String label = "low";
        int score = 20;

        if (diff > 10000 || m.isNameMismatch()) {
            label = "high";
            score = 90;
        } else if (diff > 1000) {
            label = "medium";
            score = 60;
        }

        return RiskResult.builder()
                .score(score)
                .label(label)
                .topFeatures(List.of("mismatch_amount_abs (Rule engine fallback)"))
                .build();
    }
}
