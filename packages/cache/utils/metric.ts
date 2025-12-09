import { MeterProvider } from '@opentelemetry/sdk-metrics-base';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { metrics } from '@opentelemetry/api';
import { Logger } from './logger';
import db from './db';

export async function startExporter(){

  if(!process.env.PROM_PORT){
      process.env.PROM_PORT = "9464"
  }
  
  const Database = new db();

  // Create Prometheus Exporter
  const prometheusExporter = new PrometheusExporter(
    { port: Number(process.env.PROM_PORT) },
    () => {
      Logger.info('Prometheus scrape endpoint: http://0.0.0.0:'+ process.env.PROM_PORT + '/metrics');
    }
  );

  // Set up MeterProvider manually
  const meterProvider = new MeterProvider();
  meterProvider.addMetricReader(prometheusExporter);

  // Set global meter provider so `metrics.getMeter()` works
  metrics.setGlobalMeterProvider(meterProvider);

  // Get a meter
  const meter = metrics.getMeter('iglu-meter');
  const prefix = "iglu_cache"

  // count Derivations
  const drvCounter = meter.createObservableUpDownCounter(prefix + "_derivation_count" ,{
    description: 'Number of derivations in the cache',
  });

  drvCounter.addCallback(async (res) => {
    const dbRes = await Database.getDerivationCount()
    dbRes.forEach((row) => {
      res.observe(Number(row.count), {cache: row.name, uri: row.uri})
    })
  })

  // cache Size
  const cacheSize = meter.createObservableUpDownCounter(prefix + "_size", {
    description: 'Size of the cache in byte'
  })

  cacheSize.addCallback(async (res) => {
    const dbRes = await Database.getCacheSize()
    dbRes.forEach((row) => {
      res.observe(Number(row.size), {cache: row.name, uri: row.uri})
    })
  })

  // cache requests
  const cacheRequests = meter.createObservableCounter(prefix + "_requests", {
    description: 'Request count per cache'
  })

  cacheRequests.addCallback(async (res) => {
    const dbRes = await Database.getCacheRequests()
    dbRes.forEach((row) => {
      res.observe(Number(row.count), {cache: row.name, uri: row.uri})
    })
  })
}
