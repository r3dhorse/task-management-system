import { Client, Databases } from "node-appwrite";

async function updateTaskHistoryActionEnum() {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);

  const databases = new Databases(client);
  
  const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASK_HISTORY_ID!;

  try {
    console.log("🔧 Updating task history action enum...");

    // Get current collection
    const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
    console.log("📋 Current collection:", collection.name);

    // Find the action attribute
    const actionAttribute = collection.attributes.find((attr: any) => attr.key === 'action');
    
    if (!actionAttribute) {
      console.error("❌ Action attribute not found!");
      return;
    }

    console.log("📊 Current enum values:", (actionAttribute as any).elements);

    // The correct enum values based on TaskHistoryAction enum
    const correctEnumValues = [
      "CREATED",
      "UPDATED", 
      "STATUS_CHANGED",
      "ASSIGNEE_CHANGED",
      "SERVICE_CHANGED",
      "DUE_DATE_CHANGED",
      "ATTACHMENT_ADDED",
      "ATTACHMENT_REMOVED",
      "ATTACHMENT_VIEWED",
      "DESCRIPTION_UPDATED",
      "NAME_CHANGED",
      "FOLLOWERS_CHANGED"
    ];

    // Note: Appwrite doesn't allow updating enum values directly
    // You'll need to:
    // 1. Delete the attribute
    // 2. Recreate it with correct values
    
    console.log("⚠️  To fix this issue, you need to:");
    console.log("1. Go to Appwrite console");
    console.log("2. Navigate to the Task History collection");
    console.log("3. Delete the 'action' attribute");
    console.log("4. Recreate it as an enum with these values:");
    console.log(JSON.stringify(correctEnumValues, null, 2));
    console.log("\n⚠️  Make sure to set it as required!");

    // Alternative: Log SQL command if using Appwrite with MariaDB
    console.log("\n📝 Or if you have database access, update the enum directly");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the update
updateTaskHistoryActionEnum();