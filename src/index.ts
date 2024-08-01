import { loadClasses } from "./helpers/item";
import { mailClient } from "./sample_app/mailClient";
import { newItemListernerDemo } from "./sample_app/newItemListener";
import { OCRService } from "./sample_app/ocrService";

// driver code
async function main() {
  loadClasses();

  const withAttachment = true;
  mailClient(withAttachment);
  //  await OCRService();
  // await newItemListernerDemo();
}

main();
