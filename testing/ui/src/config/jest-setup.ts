// Jest setup file for global configuration
import { DriverFactory } from '../utils/driver-factory';

// Global teardown to ensure driver cleanup
afterAll(async () => {
  await DriverFactory.quitDriver();
});