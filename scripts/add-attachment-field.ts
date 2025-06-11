// This script adds the attachmentId field to the tasks collection
// Run with: npx tsx scripts/add-attachment-field.ts

import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

async function addAttachmentField() {
  try {
    const attribute = await databases.createStringAttribute(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!,
      'attachmentId',
      255,
      false, // required
      '', // default value
      false // array
    );
    
    console.log('✅ Successfully added attachmentId field:', attribute);
  } catch (error) {
    console.error('❌ Error adding field:', error);
    
    // If the error is because the attribute already exists, that's fine
    if (error instanceof Error && error.message?.includes('Attribute already exists')) {
      console.log('ℹ️  Field already exists, skipping...');
    }
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Run the script
addAttachmentField();