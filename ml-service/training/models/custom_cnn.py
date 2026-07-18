"""Our own architecture — designed for this dataset, trained from scratch
(no pretrained weights). This is the model being compared against the five
transfer-learned reference architectures."""
from tensorflow.keras import layers, models

NAME = "CustomCNN"
FROM_SCRATCH = True
PREPROCESSING = "rescale"


def build_model(num_classes, input_shape=(224, 224, 3)):
    inputs = layers.Input(shape=input_shape)
    x = layers.Rescaling(1.0 / 255)(inputs)

    for filters in (32, 64, 128, 256):
        x = layers.Conv2D(filters, 3, padding="same", activation="relu")(x)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(filters, 3, padding="same", activation="relu")(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D()(x)
        x = layers.Dropout(0.25)(x)

    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs, name=NAME)
    return model, None
