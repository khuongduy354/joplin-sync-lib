import { loadClasses, mailClient } from "./helpers/main_helper";
import { OCRService } from "./sample_app/ocrService";

// driver code
async function main() {
  loadClasses();

  // const withAttachment = true;
  // mailClient(withAttachment);
  await OCRService();
}

main();
