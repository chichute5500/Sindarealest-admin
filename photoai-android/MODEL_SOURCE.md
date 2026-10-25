# MobileNetV3 Small offline embedding model

Model URL: https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite

Source: Google AI Edge / MediaPipe image embedding examples. The model is **not** included in this source archive. CI downloads the TFLite weights into `app/src/main/assets/` before APK compilation; the CI will fail if absent. Do not ship an APK without checking the upstream model distribution terms and notices.

Model SHA-256 is printed by the build workflow; pin a reviewed SHA-256 before production release to prevent upstream changes.

MediaPipe Tasks Vision version: 1.1.1. Offline inference uses CPU for conservative compatibility. Grouping thresholds are preliminary and require validation against owner images.

 