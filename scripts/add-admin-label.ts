import { createAdminClient } from "@/lib/appwrite";

async function addAdminLabel() {
  const { users } = await createAdminClient();
  
  // Get user email from command line argument
  const userEmail = process.argv[2];
  
  if (!userEmail) {
    console.error('Usage: npx tsx scripts/add-admin-label.ts <user-email>');
    process.exit(1);
  }
  
  try {
    // List users and find by email
    const usersList = await users.list();
    const user = usersList.users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`User with email ${userEmail} not found`);
      process.exit(1);
    }
    
    // Add admin label
    const updatedUser = await users.updateLabels(user.$id, [...(user.labels || []), 'admin']);
    
    console.log(`Successfully added admin label to user: ${updatedUser.email}`);
    console.log(`User labels: ${updatedUser.labels.join(', ')}`);
    
  } catch (error) {
    console.error('Error adding admin label:', error);
    process.exit(1);
  }
}

addAdminLabel();