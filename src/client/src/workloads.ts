export interface Workload {
  id: string;
  name: string;
  description: string;
  sql: string;
  datasetId: string;
  profileFamily: 'narrow' | 'wide' | 'aggregation';
  columnCount: number;
  rowCount: number | null;
}

export const CUSTOM_WORKLOAD_ID = 'custom';

const TAXI_DATASET_ID = 'yellow_taxi';

const NARROW_PROJECTION = `SELECT
  "VendorID",
  tpep_pickup_datetime,
  tpep_dropoff_datetime,
  passenger_count,
  trip_distance,
  "PULocationID",
  "DOLocationID",
  total_amount
FROM yellow_taxi`;

export const WORKLOADS: Workload[] = [
  {
    id: 'taxi_8c_0100k',
    name: 'Taxi 8 cols x 100k rows',
    description: '8 fixed-width-leaning taxi columns, 100k rows — narrow-schema scaling baseline',
    sql: `${NARROW_PROJECTION}
LIMIT 100000`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'narrow',
    columnCount: 8,
    rowCount: 100_000,
  },
  {
    id: 'taxi_8c_0200k',
    name: 'Taxi 8 cols x 200k rows',
    description: '8 fixed-width-leaning taxi columns, 200k rows — mid-scale narrow projection',
    sql: `${NARROW_PROJECTION}
LIMIT 200000`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'narrow',
    columnCount: 8,
    rowCount: 200_000,
  },
  {
    id: 'taxi_8c_0400k',
    name: 'Taxi 8 cols x 400k rows',
    description: '8 fixed-width-leaning taxi columns, 400k rows — throughput-heavy narrow projection',
    sql: `${NARROW_PROJECTION}
LIMIT 400000`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'narrow',
    columnCount: 8,
    rowCount: 400_000,
  },
  {
    id: 'taxi_8c_0800k',
    name: 'Taxi 8 cols x 800k rows',
    description: '8 fixed-width-leaning taxi columns, 800k rows — upper-bound narrow projection',
    sql: `${NARROW_PROJECTION}
LIMIT 800000`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'narrow',
    columnCount: 8,
    rowCount: 800_000,
  },
  {
    id: 'taxi_19c_0050k',
    name: 'Taxi all 19 cols x 50k rows',
    description: 'Full taxi schema, 50k rows — wide-schema entry point',
    sql: `SELECT *
FROM yellow_taxi
LIMIT 50000`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'wide',
    columnCount: 19,
    rowCount: 50_000,
  },
  {
    id: 'taxi_19c_0100k',
    name: 'Taxi all 19 cols x 100k rows',
    description: 'Full taxi schema, 100k rows — wide-schema mid-scale case',
    sql: `SELECT *
FROM yellow_taxi
LIMIT 100000`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'wide',
    columnCount: 19,
    rowCount: 100_000,
  },
  {
    id: 'taxi_19c_0200k',
    name: 'Taxi all 19 cols x 200k rows',
    description: 'Full taxi schema, 200k rows — large wide-schema throughput case',
    sql: `SELECT *
FROM yellow_taxi
LIMIT 200000`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'wide',
    columnCount: 19,
    rowCount: 200_000,
  },
  {
    id: 'taxi_19c_0400k',
    name: 'Taxi all 19 cols x 400k rows',
    description: 'Full taxi schema, 400k rows — upper-bound wide-schema case',
    sql: `SELECT *
FROM yellow_taxi
LIMIT 400000`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'wide',
    columnCount: 19,
    rowCount: 400_000,
  },
  {
    id: 'aggregation',
    name: 'Aggregation',
    description: 'GROUP BY producing compact output from a full table scan',
    sql: `SELECT
  "PULocationID",
  COUNT(*) AS trip_count,
  AVG(trip_distance) AS avg_distance,
  AVG(fare_amount) AS avg_fare,
  SUM(total_amount) AS total_revenue
FROM yellow_taxi
GROUP BY "PULocationID"
ORDER BY trip_count DESC`,
    datasetId: TAXI_DATASET_ID,
    profileFamily: 'aggregation',
    columnCount: 5,
    rowCount: null,
  },
];

export function getWorkloadById(id: string): Workload | undefined {
  return WORKLOADS.find((workload) => workload.id === id);
}
