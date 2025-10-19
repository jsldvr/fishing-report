#!/usr/bin/env tsx
/**
 * Optional prebuild script for generating static forecast data
 * This can be used to precompute forecasts for curated locations
 * to reduce client-side API calls
 */

import fs from 'fs';
import path from 'path';

// Sample North American locations for prebuilding
const SAMPLE_LOCATIONS = [
  { name: 'New York, NY', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles, CA', lat: 34.0522, lon: -118.2437 },
  { name: 'Chicago, IL', lat: 41.8781, lon: -87.6298 },
  { name: 'Toronto, ON', lat: 43.6532, lon: -79.3832 },
  { name: 'Vancouver, BC', lat: 49.2827, lon: -123.1207 },
  { name: 'Mexico City, MX', lat: 19.4326, lon: -99.1332 },
];

async function buildStaticData() {
  console.log('Building static forecast data...');
  
  const today = new Date().toISOString().split('T')[0];
  const dataDir = path.join(process.cwd(), 'public', 'data', today);
  
  // Create output directory
  fs.mkdirSync(dataDir, { recursive: true });
  
  // Generate location index
  const locationIndex = {
    generated: new Date().toISOString(),
    locations: SAMPLE_LOCATIONS,
  };
  
  fs.writeFileSync(
    path.join(dataDir, 'locations.json'), 
    JSON.stringify(locationIndex, null, 2)
  );
  
  console.log(`Generated data for ${SAMPLE_LOCATIONS.length} locations in ${dataDir}`);
  console.log('Note: This is a placeholder. Implement actual forecast precomputation as needed.');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildStaticData().catch(console.error);
}

export { buildStaticData };
