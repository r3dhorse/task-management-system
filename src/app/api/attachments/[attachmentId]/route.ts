import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { deleteFileByPath } from "@/lib/file-storage";
import { MemberRole } from "@/features/members/types";

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { attachmentId } = await params;

    // Validate attachmentId format
    if (!attachmentId || attachmentId.length > 50 || !/^[a-zA-Z0-9_-]+$/.test(attachmentId)) {
      return NextResponse.json(
        { error: "Invalid attachment ID format" },
        { status: 400 }
      );
    }

    // Get the attachment with related task and workspace info
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          include: {
            assignees: true,
            collaborators: true,
            workspace: {
              include: {
                members: {
                  where: { userId: user.id }
                }
              }
            }
          }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Check if user is a workspace member
    const member = attachment.task.workspace.members[0];
    if (!member) {
      return NextResponse.json(
        { error: "You must be a member of the workspace to delete attachments" },
        { status: 403 }
      );
    }

    // Check delete permissions
    // User must be: task assignee, collaborator, task creator, or workspace admin
    const isAssignee = attachment.task.assignees.some(a => a.id === member.id);
    const isCollaborator = attachment.task.collaborators.some(c => c.id === member.id);
    const isCreator = attachment.task.creatorId === user.id;
    const isWorkspaceAdmin = member.role === MemberRole.ADMIN;

    if (!isAssignee && !isCollaborator && !isCreator && !isWorkspaceAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to delete this attachment. Only task assignees, collaborators, creators, or workspace admins can delete attachments." },
        { status: 403 }
      );
    }

    // Delete file from filesystem
    const fileDeleted = await deleteFileByPath(attachment.filePath);
    if (!fileDeleted) {
      console.warn(`Failed to delete file from filesystem: ${attachment.filePath}`);
      // Continue with database deletion even if file deletion fails
    }

    // Delete attachment record from database
    await prisma.taskAttachment.delete({
      where: { id: attachmentId }
    });

    return NextResponse.json({
      data: {
        success: true,
        message: "Attachment deleted successfully"
      }
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
