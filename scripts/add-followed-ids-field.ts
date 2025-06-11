// This script adds the followedIds field to the tasks collection
// Run with: npx tsx scripts/add-followed-ids-field.ts

// Load environment variables first
const fs = require('fs');
const path = require('path');
try {
  const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  envLocal.split('\n').forEach((line: string) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  });
  console.log('✅ Environment variables loaded');
} catch (error) {
  console.log('⚠️  No .env.local file found, using existing environment variables');
}

import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

async function addFollowedIdsField() {
  try {
    // Debug environment variables
    console.log('🔍 Environment check:');
    console.log('ENDPOINT:', process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ? 'SET' : 'UNDEFINED');
    console.log('PROJECT:', process.env.NEXT_PUBLIC_APPWRITE_PROJECT ? 'SET' : 'UNDEFINED'); 
    console.log('DATABASE_ID:', process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ? 'SET' : 'UNDEFINED');
    console.log('TASKS_ID:', process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID ? 'SET' : 'UNDEFINED');
    console.log('KEY:', process.env.NEXT_APPWRITE_KEY ? 'SET' : 'UNDEFINED');
    
    if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || !process.env.NEXT_PUBLIC_APPWRITE_PROJECT || !process.env.NEXT_APPWRITE_KEY) {
      throw new Error('Missing required environment variables');
    }
    const attribute = await databases.createStringAttribute(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!,
      'followedIds',
      2048, // Larger size to accommodate JSON array of user IDs
      false, // required
      '', // default value
      false // array
    );
    
    console.log('✅ Successfully added followedIds field:', attribute);
  } catch (error) {
    console.error('❌ Error adding field:', error);
    
    // If the error is because the attribute already exists, that's fine
    if (error instanceof Error && error.message?.includes('Attribute already exists')) {
      console.log('ℹ️  Field already exists, skipping...');
    }
  }
}


// Run the script
addFollowedIdsField();