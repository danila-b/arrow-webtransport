export interface Workload {
  id: string;
  name: string;
  description: string;
  sql: string;
}

export const CUSTOM_WORKLOAD_ID = 'custom';

export const WORKLOADS: Workload[] = [
  {
    id: 'small',
    name: 'Small (500 rows)',
    description: '6 columns, 500 rows — minimal result set for latency-dominated measurements',
    sql: `SELECT
  "VendorID",
  tpep_pickup_datetime,
  trip_distance,
  fare_amount,
  tip_amount,
  total_amount
FROM yellow_taxi
LIMIT 500`,
  },
  {
    id: 'medium',
    name: 'Medium (50k rows)',
    description: '8 columns, ~50k rows — mid-size result filtered by trip distance',
    sql: `SELECT
  "VendorID",
  tpep_pickup_datetime,
  tpep_dropoff_datetime,
  passenger_count,
  trip_distance,
  fare_amount,
  tip_amount,
  total_amount
FROM yellow_taxi
WHERE trip_distance > 5.0
LIMIT 50000`,
  },
  {
    id: 'large',
    name: 'Large (500k rows)',
    description: '5 columns, 500k rows — large scan for throughput-dominated measurements',
    sql: `SELECT
  "VendorID",
  tpep_pickup_datetime,
  trip_distance,
  fare_amount,
  total_amount
FROM yellow_taxi
LIMIT 500000`,
  },
  {
    id: 'wide',
    name: 'Wide schema (50k rows)',
    description: 'All columns, 50k rows — stresses per-row byte cost across full schema width',
    sql: `SELECT *
FROM yellow_taxi
LIMIT 50000`,
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
  },
];
