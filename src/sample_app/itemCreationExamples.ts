// Example demonstrating the new scalable item creation pattern

import {
  ItemFactory,
  NoteBuilder,
  ResourceBuilder,
  FolderBuilder,
  TagBuilder,
  createNote,
  createResource,
  createFolder,
  createTag,
} from "../helpers/item";

// Example: Using the new factory pattern with builders
export function exampleUsingFactory() {
  // Create a note using the builder pattern
  const note = ItemFactory.createNote()
    .setTitle("My New Note")
    .setParentId("some-folder-id")
    .setBody("This is the note content")
    .build();

  // Create a resource using the builder pattern
  const resource = ItemFactory.createResource()
    .setTitle("My Image")
    // .setLocalResourceContentPath("./path/to/image.jpg")
    .build();

  // Create a folder using the builder pattern
  const folder = ItemFactory.createFolder()
    .setTitle("My Folder")
    .setParentId("parent-folder-id")
    .build();

  // Create a tag using the builder pattern
  const tag = ItemFactory.createTag().setTitle("important").build();

  return { note, resource, folder, tag };
}

// Example: Using the builder classes directly for more complex scenarios
export function exampleUsingBuildersDirectly() {
  // More complex note creation with multiple properties
  const complexNote = new NoteBuilder()
    .setTitle("Meeting Notes")
    .setParentId("work-folder-id")
    .setBody("# Meeting with Client\n\n- Discussion about project timeline")
    .setCreatedTime(Date.now())
    .setUpdatedTime(Date.now())
    .build();

  // Resource with custom properties
  const customResource = new ResourceBuilder()
    .setTitle("Project Document")
    .setLocalResourceContentPath("./documents/project.pdf")
    .build();

  return { complexNote, customResource };
}

// Example: Using legacy functions (for backward compatibility)
export function exampleUsingLegacyFunctions() {
  // Old way still works
  const note = createNote({
    parent_id: "folder-id",
    title: "Legacy Note",
    body: "Created with legacy function",
  });

  const resource = createResource({
    localResourceContentPath: "./path/to/file.txt",
    title: "Legacy Resource",
  });

  const folder = createFolder({
    title: "Legacy Folder",
    parent_id: "parent-folder-id",
  });

  const tag = createTag({
    title: "legacy-tag",
  });

  return { note, resource, folder, tag };
}

// Example: Batch creation of different item types
export function exampleBatchCreation() {
  const items = [];

  // Create multiple notes
  for (let i = 0; i < 3; i++) {
    const note = ItemFactory.createNote()
      .setTitle(`Note ${i + 1}`)
      .setParentId("batch-folder-id")
      .setBody(`Content for note ${i + 1}`)
      .build();
    items.push(note);
  }

  // Create multiple tags
  const tagNames = ["work", "personal", "important"];
  tagNames.forEach((tagName) => {
    const tag = ItemFactory.createTag().setTitle(tagName).build();
    items.push(tag);
  });

  // Create a folder for organization
  const organizationFolder = ItemFactory.createFolder()
    .setTitle("Batch Created Items")
    .build();
  items.push(organizationFolder);

  return items;
}

export default {
  exampleUsingFactory,
  exampleUsingBuildersDirectly,
  exampleUsingLegacyFunctions,
  exampleBatchCreation,
};
