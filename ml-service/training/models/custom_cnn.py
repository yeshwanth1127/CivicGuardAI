"""Our own architecture — designed for this dataset, trained from scratch
(no pretrained weights). This is the model being compared against the five
transfer-learned reference architectures.

Design notes (for the report): four VGG-style conv blocks with a doubling
filter width (32->64->128->256), each block using two 3x3 convs, batch
normalisation for stable training, max-pooling to shrink spatial size, and
progressively heavier dropout. L2 weight decay on every conv/dense layer plus
that dropout are the built-in defences against overfitting on a small dataset
— the failure mode a from-scratch network is most prone to here."""
from tensorflow.keras import layers, models, regularizers

NAME = "CustomCNN"
FROM_SCRATCH = True
PREPROCESSING = "rescale"

# L2 weight decay: penalises large weights so the network is nudged toward
# simpler, more general solutions instead of memorising the training photos.
WEIGHT_DECAY = 1e-4


def build_model(num_classes, input_shape=(224, 224, 3)):
    reg = regularizers.l2(WEIGHT_DECAY)
    inputs = layers.Input(shape=input_shape)
    x = layers.Rescaling(1.0 / 255)(inputs)

    # Dropout ramps up with depth (0.2 -> 0.35): deeper layers hold the most
    # dataset-specific features, so they get regularised the hardest.
    dropouts = (0.2, 0.25, 0.3, 0.35)
    for filters, drop in zip((32, 64, 128, 256), dropouts):
        x = layers.Conv2D(filters, 3, padding="same", activation="relu", kernel_regularizer=reg)(x)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(filters, 3, padding="same", activation="relu", kernel_regularizer=reg)(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D()(x)
        x = layers.Dropout(drop)(x)

    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation="relu", kernel_regularizer=reg)(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs, name=NAME)
    return model, None
