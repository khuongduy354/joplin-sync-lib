import { mailClient } from "./sample_app/mailClient";
import { OCRService } from "./sample_app/ocrService";
import { newItemListernerDemo } from "./sample_app/newItemListener";
import { itemUpdaterDemo } from "./sample_app/itemUpdaterDemo";
import { loadClasses } from "./helpers/item";

// driver code
async function main() {
  loadClasses();
}

main();
