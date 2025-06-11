// This script updates the role attribute in the members collection to include VISITOR
// Run with: npx tsx scripts/add-visitor-role.ts

import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

async function updateRoleAttribute() {
  try {
    // First, let's get the current attribute to see its configuration
    console.log('📋 Checking current role attribute...');
    
    const collection = await databases.getCollection(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_MEMBERS_ID!
    );
    
    console.log('Current collection attributes:', collection.attributes);
    
    // Find the role attribute
    const roleAttribute = collection.attributes.find((attr: any) => attr.key === 'role');
    if (roleAttribute) {
      console.log('Current role attribute:', roleAttribute);
    }

    // Update the role attribute to include VISITOR
    // Note: Appwrite requires deleting and recreating enum attributes to change values
    console.log('🔄 Updating role attribute to include VISITOR...');
    
    // First delete the existing role attribute
    console.log('⚠️  Deleting existing role attribute...');
    await databases.deleteAttribute(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_MEMBERS_ID!,
      'role'
    );
    
    // Wait a moment for the deletion to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create the new role attribute with VISITOR included
    console.log('➕ Creating new role attribute with VISITOR...');
    const newAttribute = await databases.createEnumAttribute(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_MEMBERS_ID!,
      'role',
      ['ADMIN', 'MEMBER', 'VISITOR'],
      true, // required
      'MEMBER', // default value
      false // array
    );
    
    console.log('✅ Successfully updated role attribute:', newAttribute);
  } catch (error) {
    console.error('❌ Error updating role attribute:', error);
    
    // Provide helpful error information
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Load environment variables manually
if (process.env.NODE_ENV !== 'production') {
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
}

// Run the script
updateRoleAttribute();