#!/usr/bin/env node
// You might want to add this to the previous line --experimental-specifier-resolution=node

import { Command } from "commander";

(async () => {
  const program = new Command();
  program
    .version("0.0.1")
    .command("config", "📦 manage the chatbot configuration")
    .command("show", "🚚 display the current chatbot configuration")
    .command("deploy", "🌟 deploys the chatbot to your account")
    .description("🛠️  Easily create a chatbot");

  program.parse(process.argv);
})();
