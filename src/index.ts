import { loadClasses } from "./helpers/main_helper";
import { itemUpdaterDemo } from "./sample_app/itemUpdaterDemo";
import { mailClient } from "./sample_app/mailClient";
import { OCRService } from "./sample_app/ocrService";

// driver code
async function main() {
  loadClasses();

  // const withAttachment = true;
  // mailClient();
  itemUpdaterDemo();
  // await OCRService();
}

main();
