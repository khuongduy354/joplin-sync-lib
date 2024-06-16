import { loadClasses, mailClient } from "./main_helper";

// driver code
async function main() {
  loadClasses();
  const withAttachment = true;
  mailClient(withAttachment);
}

main();
