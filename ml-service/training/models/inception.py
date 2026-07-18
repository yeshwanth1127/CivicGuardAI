"""InceptionV3 — ImageNet-pretrained, fine-tuned (transfer learning)."""
from tensorflow.keras import layers, models
from tensorflow.keras.applications import InceptionV3

NAME = "InceptionV3"
FROM_SCRATCH = False
PREPROCESSING = "inception"


def build_model(num_classes, input_shape=(224, 224, 3)):
    base_model = InceptionV3(weights="imagenet", include_top=False, input_shape=input_shape)
    base_model.trainable = False

    x = layers.GlobalAveragePooling2D()(base_model.output)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(base_model.input, outputs, name=NAME)
    return model, base_model
