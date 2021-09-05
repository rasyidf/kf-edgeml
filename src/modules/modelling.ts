import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';

// eslint-disable-next-line camelcase
interface CarsData { Miles_per_Gallon: number; Horsepower: number; }
interface InputData {mpg: number; horsepower: number;}

interface ConvertedInputs {
  inputs: tf.Tensor<tf.Rank>;
  labels: tf.Tensor<tf.Rank>;

  inputMax: tf.Tensor<tf.Rank>;
  inputMin: tf.Tensor<tf.Rank>;
  labelMax: tf.Tensor<tf.Rank>;
  labelMin: tf.Tensor<tf.Rank>;
}

let model: tf.Sequential;

/**
 * Get the car data reduced to just the variables we are interested
 * and cleaned of missing data.
 */
async function getData(): Promise<Array<InputData>> {
  const carsDataResponse = await fetch('https://storage.googleapis.com/tfjs-tutorials/carsData.json');
  const carsData = await carsDataResponse.json() as CarsData[];
  const cleaned = carsData.map((car) => ({
    mpg: car.Miles_per_Gallon,
    horsepower: car.Horsepower,
  }))
    .filter((car) => (car.mpg != null && car.horsepower != null));

  return cleaned;
}

function createModel(): tf.Sequential {
  // Create a sequential model
  const blankModel = tf.sequential();

  // Add a single input layer
  blankModel.add(tf.layers.dense({
    inputShape: [1], units: 16, useBias: true, activation: 'relu',
  }));
  blankModel.add(tf.layers.dense({ units: 8, activation: 'relu' }));

  // Add an output layer
  blankModel.add(tf.layers.dense({ units: 1, useBias: true }));

  return blankModel;
}

/**
 * Convert the input data to tensors that we can use for machine
 * learning. We will also do the important best practices of _shuffling_
 * the data and _normalizing_ the data
 * MPG on the y-axis.
 */
function convertToTensor(data: InputData[]): ConvertedInputs {
  // Wrapping these calculations in a tidy will dispose any
  // intermediate tensors.

  return tf.tidy(() => {
    // Step 1. Shuffle the data
    tf.util.shuffle(data);

    // Step 2. Convert data to Tensor
    const inputs = data.map((d) => d.horsepower);
    const labels = data.map((d) => d.mpg);

    const inputTensor = tf.tensor2d(inputs, [inputs.length, 1]);
    const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

    // Step 3. Normalize the data to the range 0 - 1 using min-max scaling
    const inputMax = inputTensor.max();
    const inputMin = inputTensor.min();
    const labelMax = labelTensor.max();
    const labelMin = labelTensor.min();

    const normalizedInputs = inputTensor.sub(inputMin).div(inputMax.sub(inputMin));
    const normalizedLabels = labelTensor.sub(labelMin).div(labelMax.sub(labelMin));

    return {
      inputs: normalizedInputs,
      labels: normalizedLabels,
      // Return the min/max bounds so we can use them later.
      inputMax,
      inputMin,
      labelMax,
      labelMin,
    };
  });
}

async function trainModel(inputs: tf.Tensor<tf.Rank>, labels: tf.Tensor<tf.Rank>) {
  // Prepare the model for training.
  model.compile({
    optimizer: tf.train.adam(),
    loss: tf.losses.meanSquaredError,
    metrics: ['mse'],
  });

  const batchSize = 32;
  const epochs = 50;

  const container = document.getElementById('progress') as tfvis.Drawable;
  return model.fit(inputs, labels, {
    batchSize,
    epochs,
    shuffle: true,
    callbacks: tfvis.show.fitCallbacks(
      container,
      ['loss', 'mse'],
      { height: 200, callbacks: ['onEpochEnd'] },
    ),
  });
}

function testModel(inputData: InputData[], normalizationData: ConvertedInputs) {
  const {
    inputMax, inputMin, labelMin, labelMax,
  } = normalizationData;

  // Generate predictions for a uniform range of numbers between 0 and 1;
  // We un-normalize the data by doing the inverse of the min-max scaling
  // that we did earlier.
  const [xs, preds] = tf.tidy(() => {
    const testX = tf.linspace(0, 1, 100);
    const predictions = model.predict(testX.reshape([100, 1])) as tf.Tensor<tf.Rank>;

    const unNormXs = testX
      .mul(inputMax.sub(inputMin))
      .add(inputMin);

    const unNormPreds = predictions
      .mul(labelMax.sub(labelMin))
      .add(labelMin);

    // Un-normalize the data
    return [unNormXs.dataSync(), unNormPreds.dataSync()];
  });

  const predictedPoints = Array.from(xs).map((val, i) => ({ x: val, y: preds[i] }));

  const originalPoints = inputData.map((d) => ({
    x: d.horsepower, y: d.mpg,
  }));

  tfvis.render.scatterplot(
    document.getElementById('evaluation') as tfvis.Drawable,
    { values: [originalPoints, predictedPoints], series: ['original', 'predicted'] },
    {
      xLabel: 'Horsepower',
      yLabel: 'MPG',
      height: 300,
    },
  );
}

export async function run(): Promise<void> {
  // Load and plot the original input data that we are going to train on.
  const data = await getData();
  const values = data.map((d) => ({
    x: d.horsepower,
    y: d.mpg,
  }));

  tfvis.render.scatterplot(
    document.getElementById('data') as tfvis.Drawable,
    { values },
    {
      xLabel: 'Horsepower',
      yLabel: 'MPG',
      height: 300,
    },
  );

  // More code will be added below
  // Create the model
  model = createModel();
  tfvis.show.modelSummary(document.getElementById('summary') as tfvis.Drawable, model);

  // Convert the data to a form we can use for training.
  const tensorData = convertToTensor(data);
  const { inputs, labels } = tensorData;

  // Train the model
  await trainModel(inputs, labels);
  console.log('Done Training');

  // Make some predictions using the model and compare them to the
  // original data
  testModel(data, tensorData);
}

export async function save(): Promise<void> {
  await model.save('downloads://my-model-1');
}

export async function loadModel(manifest: File, weights: File): Promise<Array<number>> {
  const model2 = await tf.loadLayersModel(tf.io.browserFiles([manifest, weights]));
  const xs = tf.linspace(0, 1, 10);
  const preds = model2.predict(xs.reshape([10, 1])) as tf.Tensor<tf.Rank>;
  return await preds.as1D().array();
}
