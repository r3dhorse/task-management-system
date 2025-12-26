"use client";

import { useState, useEffect, useRef } from "react";
import { useGetChecklist } from "../api/use-get-checklist";
import { useCreateChecklist } from "../api/use-create-checklist";
import { useCreateSection } from "../api/use-create-section";
import { useUpdateSection } from "../api/use-update-section";
import { useDeleteSection } from "../api/use-delete-section";
import { useReorderSections } from "../api/use-reorder-sections";
import { useAddChecklistItem } from "../api/use-add-checklist-item";
import { useUpdateChecklistItem } from "../api/use-update-checklist-item";
import { useDeleteChecklistItem } from "../api/use-delete-checklist-item";
import { useReorderChecklistItems } from "../api/use-reorder-checklist-items";
import { ChecklistItem, ChecklistSection } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Edit,
  Check,
  X,
  ClipboardList,
  Camera,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Copy
} from "@/lib/lucide-icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChecklistManagerProps {
  serviceId: string;
  serviceName: string;
}

export const ChecklistManager = ({ serviceId, serviceName }: ChecklistManagerProps) => {
  const { data: checklist, isLoading } = useGetChecklist({ serviceId });
  const { mutate: createChecklist, isPending: isCreating } = useCreateChecklist();

  // Section mutations
  const { mutate: createSection, isPending: isCreatingSection } = useCreateSection();
  const { mutate: updateSection, isPending: isUpdatingSection } = useUpdateSection();
  const { mutate: deleteSection, isPending: isDeletingSection } = useDeleteSection();
  const { mutate: reorderSections } = useReorderSections();

  // Item mutations
  const { mutate: addItem, isPending: isAdding } = useAddChecklistItem();
  const { mutate: updateItem, isPending: isUpdating } = useUpdateChecklistItem();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteChecklistItem();
  const { mutate: reorderItems } = useReorderChecklistItems();

  // Section state
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const initialCollapseApplied = useRef(false);

  // Collapse all sections by default on initial load
  useEffect(() => {
    if (checklist && !initialCollapseApplied.current) {
      const sections = ((checklist as { sections?: ChecklistSection[] }).sections || []);
      if (sections.length > 0) {
        setCollapsedSections(new Set(sections.map(s => s.id)));
        initialCollapseApplied.current = true;
      }
    }
  }, [checklist]);

  // Item state (per section)
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemRequirePhoto, setNewItemRequirePhoto] = useState(false);
  const [newItemRequireRemarks, setNewItemRequireRemarks] = useState(false);

  // Item edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemSectionId, setEditingItemSectionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequirePhoto, setEditRequirePhoto] = useState(false);
  const [editRequireRemarks, setEditRequireRemarks] = useState(false);

  const handleCreateChecklist = () => {
    createChecklist({ json: { serviceId } });
  };

  // Section handlers
  const handleAddSection = () => {
    if (!newSectionName.trim() || !checklist) return;
    createSection({
      checklistId: checklist.id,
      serviceId,
      name: newSectionName.trim(),
    });
    setNewSectionName("");
  };

  const handleStartEditSection = (section: ChecklistSection) => {
    setEditingSectionId(section.id);
    setEditSectionName(section.name);
  };

  const handleSaveSection = () => {
    if (!editingSectionId || !editSectionName.trim() || !checklist) return;
    updateSection({
      checklistId: checklist.id,
      sectionId: editingSectionId,
      serviceId,
      name: editSectionName.trim(),
    });
    setEditingSectionId(null);
    setEditSectionName("");
  };

  const handleCancelEditSection = () => {
    setEditingSectionId(null);
    setEditSectionName("");
  };

  const handleConfirmDeleteSection = () => {
    if (!deletingSectionId || !checklist) return;
    deleteSection({
      checklistId: checklist.id,
      sectionId: deletingSectionId,
      serviceId,
    });
    setDeletingSectionId(null);
  };

  const [isDuplicatingSection, setIsDuplicatingSection] = useState(false);

  const handleDuplicateSection = async (section: ChecklistSection) => {
    if (!checklist || isDuplicatingSection) return;

    setIsDuplicatingSection(true);

    try {
      // Create a new section with "(Copy)" suffix
      const newSectionName = `${section.name} (Copy)`;

      // First create the section
      createSection({
        checklistId: checklist.id,
        serviceId,
        name: newSectionName,
      }, {
        onSuccess: (newSection) => {
          // After section is created, add all items from the original section
          const sectionData = newSection as { data?: { id?: string } };
          const newSectionId = sectionData?.data?.id;

          if (newSectionId && section.items && section.items.length > 0) {
            // Add items sequentially
            const addItemsSequentially = async (items: ChecklistItem[], index: number) => {
              if (index >= items.length) {
                setIsDuplicatingSection(false);
                return;
              }

              const item = items[index];
              addItem({
                checklistId: checklist.id,
                sectionId: newSectionId,
                serviceId,
                title: item.title,
                description: item.description || undefined,
                requirePhoto: item.requirePhoto ?? false,
                requireRemarks: item.requireRemarks ?? false,
              }, {
                onSuccess: () => {
                  addItemsSequentially(items, index + 1);
                },
                onError: () => {
                  setIsDuplicatingSection(false);
                }
              });
            };

            addItemsSequentially(section.items, 0);
          } else {
            setIsDuplicatingSection(false);
          }
        },
        onError: () => {
          setIsDuplicatingSection(false);
        }
      });
    } catch {
      setIsDuplicatingSection(false);
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Item handlers
  const handleAddItem = (sectionId: string) => {
    if (!newItemTitle.trim() || !checklist) return;
    addItem({
      checklistId: checklist.id,
      sectionId,
      serviceId,
      title: newItemTitle.trim(),
      description: newItemDescription.trim() || undefined,
      requirePhoto: newItemRequirePhoto,
      requireRemarks: newItemRequireRemarks,
    });
    setNewItemTitle("");
    setNewItemDescription("");
    setNewItemRequirePhoto(false);
    setNewItemRequireRemarks(false);
    setAddingToSectionId(null);
  };

  const handleStartEditItem = (sectionId: string, item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemSectionId(sectionId);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditRequirePhoto(item.requirePhoto ?? false);
    setEditRequireRemarks(item.requireRemarks ?? false);
  };

  const handleSaveItem = () => {
    if (!editingItemId || !editingItemSectionId || !editTitle.trim() || !checklist) return;
    updateItem({
      checklistId: checklist.id,
      sectionId: editingItemSectionId,
      itemId: editingItemId,
      serviceId,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      requirePhoto: editRequirePhoto,
      requireRemarks: editRequireRemarks,
    });
    setEditingItemId(null);
    setEditingItemSectionId(null);
    setEditTitle("");
    setEditDescription("");
    setEditRequirePhoto(false);
    setEditRequireRemarks(false);
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemSectionId(null);
    setEditTitle("");
    setEditDescription("");
    setEditRequirePhoto(false);
    setEditRequireRemarks(false);
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    if (!checklist) return;
    deleteItem({
      checklistId: checklist.id,
      sectionId,
      itemId,
      serviceId,
    });
  };

  // Drag and drop handler
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !checklist?.sections) return;

    const { source, destination, type } = result;

    // Handle section reordering
    if (type === "SECTIONS") {
      const sections = [...(checklist.sections as ChecklistSection[])];
      const [movedSection] = sections.splice(source.index, 1);
      sections.splice(destination.index, 0, movedSection);

      reorderSections({
        checklistId: checklist.id,
        serviceId,
        sectionIds: sections.map(s => s.id),
      });
      return;
    }

    // Handle item reordering within a section
    if (type === "ITEMS") {
      const sourceSectionId = source.droppableId.replace("items-", "");
      const destSectionId = destination.droppableId.replace("items-", "");

      // Only handle reordering within the same section for now
      if (sourceSectionId === destSectionId) {
        const section = (checklist.sections as ChecklistSection[]).find(s => s.id === sourceSectionId);
        if (!section?.items) return;

        const items = [...section.items];
        const [movedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, movedItem);

        reorderItems({
          checklistId: checklist.id,
          sectionId: sourceSectionId,
          serviceId,
          itemIds: items.map(i => i.id),
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Checklist for {serviceName}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create a checklist to define sections and items that will be automatically added to tasks
            created for this service.
          </p>
          <Button onClick={handleCreateChecklist} disabled={isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Checklist
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sections = (checklist.sections || []) as ChecklistSection[];
  const totalItems = sections.reduce((acc, section) => acc + (section.items?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Add New Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-blue-600" />
            Add Section / Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
              className="flex-1"
            />
            <Button
              onClick={handleAddSection}
              disabled={!newSectionName.trim() || isCreatingSection}
            >
              {isCreatingSection && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sections Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Checklist Structure
              <span className="text-sm font-normal text-gray-500">
                ({sections.length} section{sections.length !== 1 ? "s" : ""}, {totalItems} item{totalItems !== 1 ? "s" : ""})
              </span>
            </CardTitle>
            {sections.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const allCollapsed = sections.every(s => collapsedSections.has(s.id));
                  if (allCollapsed) {
                    setCollapsedSections(new Set());
                  } else {
                    setCollapsedSections(new Set(sections.map(s => s.id)));
                  }
                }}
                className="h-8 text-xs"
              >
                {sections.every(s => collapsedSections.has(s.id)) ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    Expand All
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 mr-1" />
                    Collapse All
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Drag sections to reorder. Click on a section to expand/collapse and manage items.
          </p>
        </CardHeader>
        <CardContent className={cn(
          sections.length >= 5 && "max-h-[600px] overflow-y-auto"
        )}>
          {sections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No sections yet. Add your first section above.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sections" type="SECTIONS">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-4"
                  >
                    {sections.map((section, sectionIndex) => {
                      const isCollapsed = collapsedSections.has(section.id);
                      const isEditingSection = editingSectionId === section.id;
                      const sectionItems = section.items || [];

                      return (
                        <Draggable
                          key={section.id}
                          draggableId={section.id}
                          index={sectionIndex}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "rounded-lg border transition-colors",
                                snapshot.isDragging
                                  ? "bg-blue-50 border-blue-300 shadow-lg"
                                  : "bg-white border-gray-200"
                              )}
                            >
                              {/* Section Header */}
                              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-t-lg border-b">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-5 w-5 text-gray-400" />
                                </div>

                                <button
                                  onClick={() => toggleSectionCollapse(section.id)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>

                                {isEditingSection ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <Input
                                      value={editSectionName}
                                      onChange={(e) => setEditSectionName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveSection();
                                        if (e.key === "Escape") handleCancelEditSection();
                                      }}
                                      className="h-8 flex-1"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={handleSaveSection}
                                      disabled={!editSectionName.trim() || isUpdatingSection}
                                      className="h-8"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEditSection}
                                      className="h-8"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="flex-1 font-medium text-gray-900">
                                      {section.name}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      ({sectionItems.length} item{sectionItems.length !== 1 ? "s" : ""})
                                    </span>
                                  </>
                                )}

                                {!isEditingSection && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDuplicateSection(section)}
                                      disabled={isDuplicatingSection}
                                      className="h-8 w-8 p-0"
                                      title="Duplicate section with all items"
                                    >
                                      {isDuplicatingSection ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                      ) : (
                                        <Copy className="h-4 w-4 text-gray-500" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStartEditSection(section)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeletingSectionId(section.id)}
                                      disabled={isDeletingSection}
                                      className="h-8 w-8 p-0 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Section Items */}
                              {!isCollapsed && (
                                <div className="p-3 space-y-3">
                                  <Droppable
                                    droppableId={`items-${section.id}`}
                                    type="ITEMS"
                                  >
                                    {(itemsProvided) => (
                                      <div
                                        ref={itemsProvided.innerRef}
                                        {...itemsProvided.droppableProps}
                                        className="space-y-2 min-h-[40px]"
                                      >
                                        {sectionItems.length === 0 ? (
                                          <p className="text-sm text-gray-400 text-center py-2">
                                            No items in this section
                                          </p>
                                        ) : (
                                          sectionItems.map((item: ChecklistItem, itemIndex: number) => {
                                            const isEditingItem = editingItemId === item.id;

                                            return (
                                              <Draggable
                                                key={item.id}
                                                draggableId={item.id}
                                                index={itemIndex}
                                              >
                                                {(itemProvided, itemSnapshot) => (
                                                  <div
                                                    ref={itemProvided.innerRef}
                                                    {...itemProvided.draggableProps}
                                                    className={cn(
                                                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                                      itemSnapshot.isDragging
                                                        ? "bg-green-50 border-green-300 shadow-md"
                                                        : "bg-white border-gray-100 hover:border-gray-200"
                                                    )}
                                                  >
                                                    <div
                                                      {...itemProvided.dragHandleProps}
                                                      className="mt-1 cursor-grab active:cursor-grabbing"
                                                    >
                                                      <GripVertical className="h-4 w-4 text-gray-300" />
                                                    </div>

                                                    {isEditingItem ? (
                                                      <div className="flex-1 space-y-2">
                                                        <Input
                                                          value={editTitle}
                                                          onChange={(e) => setEditTitle(e.target.value)}
                                                          className="h-8"
                                                          autoFocus
                                                        />
                                                        <Textarea
                                                          value={editDescription}
                                                          onChange={(e) => setEditDescription(e.target.value)}
                                                          rows={2}
                                                          placeholder="Description (optional)"
                                                        />
                                                        <div className="flex flex-wrap gap-4">
                                                          <div className="flex items-center gap-2">
                                                            <Switch
                                                              id={`edit-photo-${item.id}`}
                                                              checked={editRequirePhoto}
                                                              onCheckedChange={setEditRequirePhoto}
                                                            />
                                                            <Label htmlFor={`edit-photo-${item.id}`} className="flex items-center gap-1 text-xs cursor-pointer">
                                                              <Camera className="h-3.5 w-3.5 text-gray-500" />
                                                              Req. Photo
                                                            </Label>
                                                          </div>
                                                          <div className="flex items-center gap-2">
                                                            <Switch
                                                              id={`edit-remarks-${item.id}`}
                                                              checked={editRequireRemarks}
                                                              onCheckedChange={setEditRequireRemarks}
                                                            />
                                                            <Label htmlFor={`edit-remarks-${item.id}`} className="flex items-center gap-1 text-xs cursor-pointer">
                                                              <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                                                              Req. Remarks
                                                            </Label>
                                                          </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                          <Button
                                                            size="sm"
                                                            onClick={handleSaveItem}
                                                            disabled={!editTitle.trim() || isUpdating}
                                                          >
                                                            {isUpdating && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                                            <Check className="h-3 w-3 mr-1" />
                                                            Save
                                                          </Button>
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={handleCancelEditItem}
                                                          >
                                                            <X className="h-3 w-3 mr-1" />
                                                            Cancel
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <>
                                                        <div className="flex-1 min-w-0">
                                                          <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                                              {itemIndex + 1}
                                                            </span>
                                                            <p className="font-medium text-gray-900 text-sm truncate">
                                                              {item.title}
                                                            </p>
                                                            {(item.requirePhoto || item.requireRemarks) && (
                                                              <div className="flex items-center gap-1">
                                                                {item.requirePhoto && (
                                                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                                                                    <Camera className="h-3 w-3" />
                                                                  </span>
                                                                )}
                                                                {item.requireRemarks && (
                                                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                                                                    <MessageSquare className="h-3 w-3" />
                                                                  </span>
                                                                )}
                                                              </div>
                                                            )}
                                                          </div>
                                                          {item.description && (
                                                            <p className="text-xs text-gray-500 mt-1 ml-8">
                                                              {item.description}
                                                            </p>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleStartEditItem(section.id, item)}
                                                            className="h-7 w-7 p-0"
                                                          >
                                                            <Edit className="h-3.5 w-3.5 text-gray-500" />
                                                          </Button>
                                                          <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteItem(section.id, item.id)}
                                                            disabled={isDeleting}
                                                            className="h-7 w-7 p-0 hover:text-red-600"
                                                          >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                          </Button>
                                                        </div>
                                                      </>
                                                    )}
                                                  </div>
                                                )}
                                              </Draggable>
                                            );
                                          })
                                        )}
                                        {itemsProvided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>

                                  {/* Add Item Form */}
                                  {addingToSectionId === section.id ? (
                                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-dashed">
                                      <Input
                                        placeholder="Item title (required)"
                                        value={newItemTitle}
                                        onChange={(e) => setNewItemTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleAddItem(section.id)}
                                        autoFocus
                                      />
                                      <Textarea
                                        placeholder="Description (optional)"
                                        value={newItemDescription}
                                        onChange={(e) => setNewItemDescription(e.target.value)}
                                        rows={2}
                                      />
                                      <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2">
                                          <Switch
                                            id={`new-photo-${section.id}`}
                                            checked={newItemRequirePhoto}
                                            onCheckedChange={setNewItemRequirePhoto}
                                          />
                                          <Label htmlFor={`new-photo-${section.id}`} className="flex items-center gap-1 text-xs cursor-pointer">
                                            <Camera className="h-3.5 w-3.5 text-gray-500" />
                                            Required Photo
                                          </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Switch
                                            id={`new-remarks-${section.id}`}
                                            checked={newItemRequireRemarks}
                                            onCheckedChange={setNewItemRequireRemarks}
                                          />
                                          <Label htmlFor={`new-remarks-${section.id}`} className="flex items-center gap-1 text-xs cursor-pointer">
                                            <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                                            Required Remarks
                                          </Label>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleAddItem(section.id)}
                                          disabled={!newItemTitle.trim() || isAdding}
                                        >
                                          {isAdding && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                          <Plus className="h-3 w-3 mr-1" />
                                          Add Item
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setAddingToSectionId(null);
                                            setNewItemTitle("");
                                            setNewItemDescription("");
                                            setNewItemRequirePhoto(false);
                                            setNewItemRequireRemarks(false);
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setAddingToSectionId(section.id)}
                                      className="w-full border-dashed"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Item to {section.name}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog open={!!deletingSectionId} onOpenChange={() => setDeletingSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the section and all items within it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSection}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
