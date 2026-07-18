"""AlexNet (Krizhevsky et al., 2012), implemented from scratch. No pretrained
weights exist for this architecture, so like CustomCNN it trains from random
initialization — included as the "classic, from-scratch" reference point
alongside the transfer-learned VGG/Inception/MobileNet models."""
from tensorflow.keras import layers, models

NAME = "AlexNet"
FROM_SCRATCH = True
PREPROCESSING = "rescale"


def build_model(num_classes, input_shape=(224, 224, 3)):
    inputs = layers.Input(shape=input_shape)
    x = layers.Rescaling(1.0 / 255)(inputs)

    x = layers.Conv2D(96, 11, strides=4, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D(3, strides=2)(x)

    x = layers.Conv2D(256, 5, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D(3, strides=2)(x)

    x = layers.Conv2D(384, 3, padding="same", activation="relu")(x)
    x = layers.Conv2D(384, 3, padding="same", activation="relu")(x)
    x = layers.Conv2D(256, 3, padding="same", activation="relu")(x)
    x = layers.MaxPooling2D(3, strides=2)(x)

    x = layers.Flatten()(x)
    x = layers.Dense(4096, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(4096, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs, name=NAME)
    return model, None
